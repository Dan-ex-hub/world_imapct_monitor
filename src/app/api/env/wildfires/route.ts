import { NextResponse } from 'next/server'
import { getWildfires } from '@/lib/env/eonet'
import { getCachedEnvData, setCachedEnvData } from '@/lib/env/cache'
import type { EnvLayerData } from '@/store/types'

/** GET /api/env/wildfires — Active wildfires from NASA EONET */
export async function GET() {
  const cached = getCachedEnvData('wildfires')
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, max-age=900' },
    })
  }

  try {
    const wildfires = await getWildfires()
    const data: EnvLayerData = { type: 'wildfires', updatedAt: new Date().toISOString(), wildfires }
    setCachedEnvData('wildfires', data)

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=900' },
    })
  } catch {
    const stale = getCachedEnvData('wildfires')
    return NextResponse.json(stale ?? { type: 'wildfires', updatedAt: new Date().toISOString(), wildfires: [] })
  }
}
