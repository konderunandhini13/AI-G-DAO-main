import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS proof_files (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id bigint,
      milestone_idx integer,
      proof_type text,
      file_name text NOT NULL,
      file_type text NOT NULL,
      file_data text NOT NULL,
      created_at timestamptz DEFAULT now()
    )
  `)
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable()
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Store file in DB, return its ID as the URL reference
    const { rows } = await pool.query(
      `INSERT INTO proof_files (file_name, file_type, file_data) VALUES ($1,$2,$3) RETURNING id`,
      [file.name, file.type, dataUrl]
    )
    const fileId = rows[0].id
    // Return a reference URL that points to the file by ID
    return NextResponse.json({ url: `/api/proof-files/${fileId}`, name: file.name, type: file.type })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
