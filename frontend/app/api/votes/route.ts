import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/votes?voter=address
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const voter = searchParams.get('voter');
    if (!voter) return NextResponse.json([]);

    const { rows } = await pool.query(
      `SELECT v.proposal_id, v.vote, v.tx_id, v.voted_at, p.title as proposal_title
       FROM votes v LEFT JOIN proposals p ON p.id = v.proposal_id
       WHERE v.voter_address = $1 ORDER BY v.voted_at DESC`,
      [voter]
    );
    return NextResponse.json(rows.map(r => ({
      proposalId: Number(r.proposal_id),
      proposalTitle: r.proposal_title || `Proposal #${r.proposal_id}`,
      vote: r.vote,
      timestamp: new Date(r.voted_at).getTime() / 1000,
      txId: r.tx_id || '',
      confirmedRound: 1,
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/votes — record a vote
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { proposalId, vote, voterAddress, txId } = body;

    await pool.query(
      `INSERT INTO votes (proposal_id, voter_address, vote, tx_id) VALUES ($1,$2,$3,$4)
       ON CONFLICT (proposal_id, voter_address) DO NOTHING`,
      [proposalId, voterAddress, vote, txId]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
