import { NextResponse } from 'next/server'

/** GET /api/env/sea-temp — Sea surface temperature data (NOAA ERDDAP) */
export async function GET() {
  // TODO: Phase 6 — Implement NOAA ERDDAP integration
  return NextResponse.json({
    type: 'sea_temp',
    updatedAt: new Date().toISOString(),
  })
}
