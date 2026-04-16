import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS proof_files (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id bigint NOT NULL,
      milestone_idx integer NOT NULL,
      proof_type text NOT NULL CHECK (proof_type IN ('completion', 'usage')),
      file_name text NOT NULL,
      file_type text NOT NULL,
      file_data text NOT NULL,
      created_at timestamptz DEFAULT now()
    )
  `)
}

// GET /api/proof-files?proposalId=X&milestoneIdx=Y&proofType=Z
export async function GET(req: NextRequest) {
  try {
    await ensureTable()
    const { searchParams } = new URL(req.url)
    const proposalId = searchParams.get('proposalId')
    const milestoneIdx = searchParams.get('milestoneIdx')
    const proofType = searchParams.get('proofType')
    if (!proposalId || milestoneIdx === null || !proofType)
      return NextResponse.json({ files: [] })
    const { rows } = await pool.query(
      'SELECT id, file_name, file_type, file_data FROM proof_files WHERE proposal_id=$1 AND milestone_idx=$2 AND proof_type=$3 ORDER BY created_at',
      [proposalId, milestoneIdx, proofType]
    )
    return NextResponse.json({ files: rows.map((r: any) => ({ id: r.id, name: r.file_name, type: r.file_type, url: r.file_data })) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/proof-files
export async function POST(req: NextRequest) {
  try {
    await ensureTable()
    const { proposalId, milestoneIdx, proofType, fileName, fileType, fileData } = await req.json()
    const { rows } = await pool.query(
      `INSERT INTO proof_files (proposal_id, milestone_idx, proof_type, file_name, file_type, file_data)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [proposalId, milestoneIdx, proofType, fileName, fileType, fileData]
    )
    return NextResponse.json({ success: true, id: rows[0].id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/proof-files
export async function DELETE(req: NextRequest) {
  try {
    await ensureTable()
    const { proposalId, milestoneIdx, proofType } = await req.json()
    await pool.query(
      'DELETE FROM proof_files WHERE proposal_id=$1 AND milestone_idx=$2 AND proof_type=$3',
      [proposalId, milestoneIdx, proofType]
    )
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
