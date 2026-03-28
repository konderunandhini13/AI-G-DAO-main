import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS milestone_votes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id bigint NOT NULL,
      milestone_idx integer NOT NULL,
      voter_address text NOT NULL,
      vote text NOT NULL CHECK (vote IN ('for', 'against')),
      voted_at timestamptz DEFAULT now(),
      UNIQUE(proposal_id, milestone_idx, voter_address)
    )
  `)
}

// GET /api/milestone-votes?proposalId=X&voterAddress=Y
export async function GET(req: NextRequest) {
  try {
    await ensureTable()
    const { searchParams } = new URL(req.url)
    const proposalId = searchParams.get('proposalId')
    const voterAddress = searchParams.get('voterAddress')
    if (!proposalId) return NextResponse.json({ votes: [] })
    let query = 'SELECT milestone_idx, voter_address, vote FROM milestone_votes WHERE proposal_id = $1'
    const params: any[] = [proposalId]
    if (voterAddress) { query += ' AND voter_address = $2'; params.push(voterAddress) }
    const { rows } = await pool.query(query, params)
    return NextResponse.json({ votes: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/milestone-votes — clear votes for a milestone when proof is resubmitted
export async function DELETE(req: NextRequest) {
  try {
    await ensureTable()
    const { proposalId, milestoneIdx } = await req.json()
    await pool.query(
      'DELETE FROM milestone_votes WHERE proposal_id = $1 AND milestone_idx = $2',
      [proposalId, milestoneIdx]
    )
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
  try {
    await ensureTable()
    const { proposalId, milestoneIdx, voterAddress, vote } = await req.json()
    await pool.query(
      `INSERT INTO milestone_votes (proposal_id, milestone_idx, voter_address, vote)
       VALUES ($1,$2,$3,$4) ON CONFLICT (proposal_id, milestone_idx, voter_address) DO NOTHING`,
      [proposalId, milestoneIdx, voterAddress, vote]
    )
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
