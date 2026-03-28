import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_WALLET!
const ALGOD_URL = 'https://testnet-api.algonode.cloud'

// Cache balance for 30s to avoid hitting Algorand testnet on every request
let balanceCache: { value: number; ts: number } | null = null

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS milestone_releases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id bigint NOT NULL,
      milestone_idx integer NOT NULL,
      amount_algo numeric NOT NULL,
      tx_id text NOT NULL,
      released_at timestamptz DEFAULT now(),
      UNIQUE(proposal_id, milestone_idx)
    )
  `)
}

async function getLiveBalance(): Promise<number> {
  const now = Date.now()
  if (balanceCache && now - balanceCache.ts < 10_000) return balanceCache.value
  try {
    const res = await fetch(`${ALGOD_URL}/v2/accounts/${TREASURY}`, {
      headers: { 'X-Algo-API-Token': '' },
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    const value = (data.amount || 0) / 1_000_000
    balanceCache = { value, ts: now }
    return value
  } catch {
    return balanceCache?.value ?? 0
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const proposalId = searchParams.get('proposalId')

  try {
    await ensureTable()

    const balanceAlgo = await getLiveBalance()

    let released: number[] = []
    if (proposalId) {
      const { rows } = await pool.query(
        'SELECT milestone_idx FROM milestone_releases WHERE proposal_id = $1',
        [proposalId]
      )
      released = rows.map((r: any) => r.milestone_idx)
    }

    return NextResponse.json({ treasury: TREASURY, balanceAlgo, released })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable()
    const { proposalId, milestoneIdx, amountAlgo, txId } = await req.json()
    await pool.query(
      `INSERT INTO milestone_releases (proposal_id, milestone_idx, amount_algo, tx_id)
       VALUES ($1,$2,$3,$4) ON CONFLICT (proposal_id, milestone_idx) DO NOTHING`,
      [proposalId, milestoneIdx, amountAlgo, txId]
    )
    // Invalidate cache so next fetch reflects the release
    balanceCache = null
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
