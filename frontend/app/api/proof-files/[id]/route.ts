import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { rows } = await pool.query(
      'SELECT file_name, file_type, file_data FROM proof_files WHERE id=$1',
      [params.id]
    )
    if (!rows.length) return new NextResponse('File not found', { status: 404 })
    const { file_type, file_data } = rows[0]
    // file_data is a base64 data URL like "data:image/png;base64,..."
    const base64 = file_data.split(',')[1]
    const buffer = Buffer.from(base64, 'base64')
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file_type,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 })
  }
}
