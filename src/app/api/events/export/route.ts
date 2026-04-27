import { NextResponse } from 'next/server'

/** GET /api/events/export — Export events as CSV */
export async function GET(request: Request) {
  // TODO: Phase 8
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
