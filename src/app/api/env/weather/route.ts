import { NextResponse } from 'next/server'
import { getWindGrid, getTempAnomalies } from '@/lib/env/openmeteo'
import { getCachedEnvData, setCachedEnvData } from '@/lib/env/cache'
import type { EnvLayerData } from '@/store/types'

/** GET /api/env/weather — Wind grid or temperature anomaly data */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'wind'
  const layerType = type === 'temp' ? 'temperature_anomaly' as const : 'wind' as const

  // Check cache first
  const cached = getCachedEnvData(layerType)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  }

  try {
    let data: EnvLayerData

    if (type === 'temp') {
      const tempAnomalies = await getTempAnomalies()
      data = { type: 'temperature_anomaly', updatedAt: new Date().toISOString(), tempAnomalies }
    } else {
      const wind = await getWindGrid()
      data = { type: 'wind', updatedAt: new Date().toISOString(), wind }
    }

    setCachedEnvData(layerType, data)

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  } catch {
    // Return stale data if available, else empty
    const stale = getCachedEnvData(layerType)
    return NextResponse.json(stale ?? { type: layerType, updatedAt: new Date().toISOString() })
  }
}
