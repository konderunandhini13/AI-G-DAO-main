import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT address, joined_at, last_seen FROM dao_members');
    client.release();

    const members = result.rows.map((row: any) => ({
      address: row.address,
      joinedAt: Number(row.joined_at),
      lastSeen: Number(row.last_seen),
    }));

    return NextResponse.json({ count: members.length, members });
  } catch (error) {
    console.error('Neon members GET error:', error);
    return NextResponse.json({ count: 0, members: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const client = await pool.connect();
    await client.query(`
      INSERT INTO dao_members (address, joined_at, last_seen)
      VALUES ($1, $2, $3)
      ON CONFLICT (address) DO UPDATE
      SET last_seen = EXCLUDED.last_seen
    `, [address, Date.now(), Date.now()]);

    const countResult = await client.query('SELECT COUNT(*) FROM dao_members');
    client.release();

    const count = Number(countResult.rows[0]?.count || 0);

    return NextResponse.json({ success: true, isNew: true, count });
  } catch (error) {
    console.error('Neon members POST error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
