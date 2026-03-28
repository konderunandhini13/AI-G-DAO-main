import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
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
    const { rows } = await pool.query(
      'SELECT * FROM milestone_releases ORDER BY released_at DESC'
    )
    const totalReleased = rows.reduce((sum: number, r: any) => sum + parseFloat(r.amount_algo), 0)
    return NextResponse.json({ releases: rows, totalReleased })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
