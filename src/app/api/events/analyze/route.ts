import { NextResponse } from 'next/server'

/** POST /api/events/analyze — AI analysis of a news event */
export async function POST(request: Request) {
  // TODO: Phase 4 — AI pipeline
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
