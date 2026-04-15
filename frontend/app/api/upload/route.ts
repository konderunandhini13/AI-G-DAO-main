import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const pinataJwt = process.env.PINATA_JWT
    if (!pinataJwt) return NextResponse.json({ error: 'Pinata not configured' }, { status: 500 })

    const body = new FormData()
    body.append('file', file, file.name)
    body.append('pinataMetadata', JSON.stringify({ name: file.name }))

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${pinataJwt}` },
      body,
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    const data = await res.json()
    const url = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
    return NextResponse.json({ url, hash: data.IpfsHash, name: file.name, type: file.type })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
