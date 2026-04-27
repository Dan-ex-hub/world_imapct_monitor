import { NextResponse } from 'next/server'

/** GET /api/events/[id] — Fetch single event by ID */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // TODO: Phase 3 — Fetch from Supabase
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
