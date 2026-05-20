'use client'

import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useGlobeStore } from '@/store/useGlobeStore'
import type { EnvLayerType, EnvLayerData } from '@/store/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/** Map layer type to API path */
function layerTypeToPath(type: EnvLayerType): string {
  switch (type) {
    case 'wind': return 'weather'
    case 'temperature_anomaly': return 'weather'
    case 'aqi': return 'aqi'
    case 'earthquakes': return 'earthquakes'
    case 'wildfires': return 'wildfires'
    case 'storms': return 'storms'
    case 'sea_temp': return 'sea-temp'
    default: return ''
  }
}

/**
 * Normal refresh intervals per layer type (ms).
 * These control how often we poll the API to pick up background-refreshed data.
 */
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

/**
 * After a cache-miss (partial data returned), poll faster to pick up
 * the data being written by the background refresh job.
 * Once all zones are loaded we drop back to REFRESH_INTERVALS.
 */
const PARTIAL_POLL_INTERVAL_MS = 8_000 // 8 seconds — fast enough to feel live

/**
 * Fetch environmental layer data and sync to Zustand store.
 *
 * Cache-first strategy:
 * - The API routes immediately return whatever is already cached in Supabase
 *   (fast, ~100 ms), then trigger a background refresh via `after()`.
 * - When the API returns partial data (isPartial: true), we poll every 8 s
 *   to pick up newly written zones so the heatmap fills in progressively.
 * - Once all zones are loaded, polling backs off to the normal interval.
 */
export function useEnvLayer(layerType: EnvLayerType) {
  const setEnvLayerData = useGlobeStore((s) => s.setEnvLayerData)

  // Track whether the last response was partial so we can boost polling
  const isPartialRef = useRef(false)

  const path = layerTypeToPath(layerType)
  const endpoint = layerType === 'none' || !path ? null : `/api/env/${path}`

  const { data, isLoading, error, mutate } = useSWR<any>(
    endpoint,
    fetcher,
    {
      // Use normal refresh interval; we'll manually trigger faster re-fetches
      // when data is partial (see effect below).
      refreshInterval: REFRESH_INTERVALS[layerType],

      // ↓ KEY: show previous layer data while new layer data is loading.
      // This prevents the heatmap from flickering blank when switching layers.
      keepPreviousData: true,

      // Don't refetch just because the user switched tabs
      revalidateOnFocus: false,

      // Deduplicate requests within a 2-second window
      dedupingInterval: 2_000,
    }
  )

  // Push data into the globe store whenever we get a successful response
  useEffect(() => {
    if (!data) return

    // Weather endpoint returns both wind and temp
    if ('wind' in data && 'temperature_anomaly' in data) {
      if (layerType === 'wind') {
        setEnvLayerData((data as any).wind)
      } else if (layerType === 'temperature_anomaly') {
        setEnvLayerData((data as any).temperature_anomaly)
      }
      // Track partial state from meta
      isPartialRef.current = (data as any).meta?.isPartial ?? false
    } else {
      setEnvLayerData(data as EnvLayerData)
      isPartialRef.current = (data as any).meta?.isPartial ?? false
    }
  }, [data, layerType, setEnvLayerData])

  // ── Fast polling when data is partial ──────────────────────────────────
  // When the API returns partial data, the background job is still writing
  // fresh zones to Supabase. We poll every 8 s to pick them up progressively
  // until coverage reaches 100%.
  useEffect(() => {
    if (layerType === 'none' || !endpoint) return

    // Only activate fast polling for heatmap layers (the slow ones)
    const isHeatmapLayer = ['wind', 'temperature_anomaly', 'aqi', 'sea_temp'].includes(layerType)
    if (!isHeatmapLayer) return

    let timer: ReturnType<typeof setInterval> | null = null

    const checkAndPoll = () => {
      if (!isPartialRef.current) {
        // Data is complete — stop fast polling
        if (timer) clearInterval(timer)
        return
      }
      mutate() // re-fetch to pick up newly written zones
    }

    // Start the fast polling loop
    timer = setInterval(checkAndPoll, PARTIAL_POLL_INTERVAL_MS)

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [layerType, endpoint, mutate])

  // Reset partial state whenever the layer changes
  useEffect(() => {
    isPartialRef.current = false
  }, [layerType])

  return { isLoading, error }
}
