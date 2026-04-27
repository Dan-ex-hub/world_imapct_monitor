import { NextResponse } from 'next/server'

/** GET /api/events — Fetch all active events */
export async function GET(request: Request) {
  // TODO: Phase 3 — Connect to Supabase
  return NextResponse.json([])
}

/** POST /api/events — Create a new event */
export async function POST(request: Request) {
  // TODO: Phase 3 — Insert event into Supabase
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
