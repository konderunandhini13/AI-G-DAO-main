import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function formatProposalRow(row: any) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    creator: row.creator,
    fundingAmount: Number(row.funding_amount),
    voteYes: Number(row.vote_yes),
    voteNo: Number(row.vote_no),
    status: row.status,
    endTime: Number(row.end_time),
    category: row.category,
    aiScore: row.ai_score !== null ? Number(row.ai_score) : undefined,
    aiReview: row.ai_review || null,
    milestones: row.milestones || null,
    creationTime: Number(row.creation_time),
  };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: 'Invalid proposal id' }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM proposals WHERE id = $1', [id]);
    client.release();

    if (!result.rows.length) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json(formatProposalRow(result.rows[0]));
  } catch (error) {
    console.error('Neon proposal-by-id error:', error);
    return NextResponse.json({ error: 'Failed to fetch proposal' }, { status: 500 });
  }
}
