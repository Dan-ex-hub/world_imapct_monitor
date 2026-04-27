import { NextResponse } from 'next/server'
import { getRecentEarthquakes } from '@/lib/env/usgs'
import { getCachedEnvData, setCachedEnvData } from '@/lib/env/cache'
import type { EnvLayerData } from '@/store/types'

/** GET /api/env/earthquakes — Recent earthquakes from USGS */
export async function GET() {
  const cached = getCachedEnvData('earthquakes')
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  }

  try {
    const earthquakes = await getRecentEarthquakes()
    const data: EnvLayerData = { type: 'earthquakes', updatedAt: new Date().toISOString(), earthquakes }
    setCachedEnvData('earthquakes', data)

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  } catch {
    const stale = getCachedEnvData('earthquakes')
    return NextResponse.json(stale ?? { type: 'earthquakes', updatedAt: new Date().toISOString(), earthquakes: [] })
  }
}
