import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { rows } = await pool.query(
      'SELECT file_name, file_type, file_data FROM proof_files WHERE id=$1',
      [params.id]
    )
    if (!rows.length) return NextResponse.json({ error: 'File not found' }, { status: 404 })
    const { file_type, file_data } = rows[0]
    // Return the base64 data URL directly
    return NextResponse.json({ url: file_data, type: file_type })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
