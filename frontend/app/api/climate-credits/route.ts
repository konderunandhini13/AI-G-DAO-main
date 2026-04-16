import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS climate_credits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id bigint NOT NULL UNIQUE,
      proposal_title text NOT NULL,
      credits numeric NOT NULL,
      funding_amount numeric NOT NULL,
      awarded_at timestamptz DEFAULT now()
    )
  `)
}

// GET /api/climate-credits — total credits + breakdown
export async function GET() {
  try {
    await ensureTable()
    const { rows } = await pool.query(
      'SELECT proposal_id, proposal_title, credits, funding_amount, awarded_at FROM climate_credits ORDER BY awarded_at DESC'
    )
    const total = rows.reduce((sum: number, r: any) => sum + Number(r.credits), 0)
    return NextResponse.json({ total, credits: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/climate-credits — award credits for a completed proposal
export async function POST(req: NextRequest) {
  try {
    await ensureTable()
    const { proposalId, proposalTitle, fundingAmount } = await req.json()
    const credits = Math.round(Number(fundingAmount) * 100)
    await pool.query(
      `INSERT INTO climate_credits (proposal_id, proposal_title, credits, funding_amount)
       VALUES ($1, $2, $3, $4) ON CONFLICT (proposal_id) DO NOTHING`,
      [proposalId, proposalTitle, credits, fundingAmount]
    )
    return NextResponse.json({ success: true, credits })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
