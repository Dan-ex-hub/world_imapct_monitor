import { NextResponse } from 'next/server'

/** GET /api/forex/sparkline/[pair] — Get sparkline data for a pair */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params
  // TODO: Phase 5
  return NextResponse.json({ pair, data: [] })
}
