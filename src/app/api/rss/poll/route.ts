import { NextResponse } from 'next/server'

/** POST /api/rss/poll — Poll RSS feeds for new news events */
export async function POST(request: Request) {
  // TODO: Phase 4
  return NextResponse.json({ polled: 0 })
}
