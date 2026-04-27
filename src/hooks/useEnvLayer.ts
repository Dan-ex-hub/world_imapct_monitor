'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import { useGlobeStore } from '@/store/useGlobeStore'
import type { EnvLayerType, EnvLayerData } from '@/store/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/** Map layer type to API path */
function layerTypeToPath(type: EnvLayerType): string {
  switch (type) {
    case 'wind': return 'weather?type=wind'
    case 'temperature_anomaly': return 'weather?type=temp'
    case 'aqi': return 'aqi'
    case 'earthquakes': return 'earthquakes'
    case 'wildfires': return 'wildfires'
    case 'storms': return 'storms'
    case 'sea_temp': return 'sea-temp'
    default: return ''
  }
}

/** Refresh intervals per layer type (ms) */
const REFRESH_INTERVALS: Record<EnvLayerType, number> = {
  none: 0,
  wind: 3600_000,             // 1 hour
  aqi: 1800_000,              // 30 minutes
  temperature_anomaly: 21600_000, // 6 hours
  earthquakes: 300_000,       // 5 minutes
  wildfires: 900_000,         // 15 minutes
  storms: 900_000,            // 15 minutes
  sea_temp: 86400_000,        // 24 hours
}

/** Fetch environmental layer data and sync to Zustand store */
export function useEnvLayer(layerType: EnvLayerType) {
  const setEnvLayerData = useGlobeStore((s) => s.setEnvLayerData)

  const path = layerTypeToPath(layerType)
  const endpoint = layerType === 'none' || !path ? null : `/api/env/${path}`

  const { data, isLoading, error } = useSWR<EnvLayerData>(
    endpoint,
    fetcher,
    {
      refreshInterval: REFRESH_INTERVALS[layerType],
      revalidateOnFocus: false,
    }
  )

  useEffect(() => {
    if (data) setEnvLayerData(data)
  }, [data, setEnvLayerData])

  return { isLoading, error }
}
