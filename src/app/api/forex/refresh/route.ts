import { NextResponse } from 'next/server'

/** POST /api/forex/refresh — Trigger forex price refresh */
export async function POST() {
  // TODO: Phase 5
  return NextResponse.json({ refreshed: false })
}
