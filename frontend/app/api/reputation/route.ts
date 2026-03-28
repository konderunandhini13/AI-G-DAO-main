import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/reputation?wallet=ADDRESS
export async function GET(req: NextRequest) {
  try {
    const wallet = new URL(req.url).searchParams.get('wallet');
    if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 });

    const { rows } = await pool.query(
      'SELECT * FROM reputation WHERE wallet_address = $1',
      [wallet]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        wallet_address: wallet,
        proposals_submitted: 0,
        milestones_completed: 0,
        milestones_failed: 0,
        reputation_score: 50,
        max_funding_algo: 100,
      });
    }

    return NextResponse.json(rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
