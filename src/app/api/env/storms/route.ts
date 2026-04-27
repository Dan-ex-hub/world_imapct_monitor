import { NextResponse } from 'next/server'
import { getStorms } from '@/lib/env/eonet'
import { getCachedEnvData, setCachedEnvData } from '@/lib/env/cache'
import type { EnvLayerData } from '@/store/types'

/** GET /api/env/storms — Active severe storms from NASA EONET */
export async function GET() {
  const cached = getCachedEnvData('storms')
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, max-age=900' },
    })
  }

  try {
    const storms = await getStorms()
    const data: EnvLayerData = { type: 'storms', updatedAt: new Date().toISOString(), storms }
    setCachedEnvData('storms', data)

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=900' },
    })
  } catch {
    const stale = getCachedEnvData('storms')
    return NextResponse.json(stale ?? { type: 'storms', updatedAt: new Date().toISOString(), storms: [] })
  }
}
