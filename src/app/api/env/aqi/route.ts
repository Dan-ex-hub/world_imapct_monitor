import { NextResponse } from 'next/server'
import { getGlobalAQI } from '@/lib/env/openaq'
import { getCachedEnvData, setCachedEnvData } from '@/lib/env/cache'
import type { EnvLayerData } from '@/store/types'

/** GET /api/env/aqi — Global AQI data */
export async function GET() {
  const cached = getCachedEnvData('aqi')
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, max-age=1800' },
    })
  }

  try {
    const aqi = await getGlobalAQI()
    const data: EnvLayerData = { type: 'aqi', updatedAt: new Date().toISOString(), aqi }
    setCachedEnvData('aqi', data)

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=1800' },
    })
  } catch {
    const stale = getCachedEnvData('aqi')
    return NextResponse.json(stale ?? { type: 'aqi', updatedAt: new Date().toISOString(), aqi: [] })
  }
}
