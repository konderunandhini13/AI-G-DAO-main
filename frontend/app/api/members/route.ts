import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dao_members (
      address text PRIMARY KEY,
      joined_at bigint NOT NULL,
      last_seen bigint NOT NULL
    )
  `);
}

export async function GET() {
  try {
    await ensureTable();
    const result = await pool.query('SELECT address, joined_at, last_seen FROM dao_members');
    const members = result.rows.map((r: any) => ({ address: r.address, joinedAt: Number(r.joined_at), lastSeen: Number(r.last_seen) }));
    return NextResponse.json({ count: members.length, members });
  } catch (error) {
    console.error('Neon members GET error:', error);
    return NextResponse.json({ count: 0, members: [] });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureTable();
    const { address } = await request.json();
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    await pool.query('DELETE FROM dao_members WHERE address = $1', [address]);

    const countResult = await pool.query('SELECT COUNT(*) FROM dao_members');
    const count = Number(countResult.rows[0]?.count || 0);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Neon members DELETE error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
  try {
    await ensureTable();
    const { address } = await request.json();
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const existing = await pool.query('SELECT address FROM dao_members WHERE address = $1', [address]);
    const isNew = existing.rows.length === 0;

    await pool.query(`
      INSERT INTO dao_members (address, joined_at, last_seen)
      VALUES ($1, $2, $3)
      ON CONFLICT (address) DO UPDATE SET last_seen = $3
    `, [address, Date.now(), Date.now()]);

    const countResult = await pool.query('SELECT COUNT(*) FROM dao_members');
    const count = Number(countResult.rows[0]?.count || 0);

    return NextResponse.json({ success: true, isNew, count });
  } catch (error) {
    console.error('Neon members POST error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
