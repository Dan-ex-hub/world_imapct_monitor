import { NextResponse } from 'next/server'

/** GET/POST /api/watchlist — Manage user watchlist */
export async function GET() {
  // TODO: Phase 7
  return NextResponse.json([])
}

export async function POST(request: Request) {
  // TODO: Phase 7
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function DELETE(request: Request) {
  // TODO: Phase 7
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
