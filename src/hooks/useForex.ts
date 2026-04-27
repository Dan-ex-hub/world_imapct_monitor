'use client'

import useSWR from 'swr'
import { useGlobeStore } from '@/store/useGlobeStore'
import type { ForexPair } from '@/store/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/** Fetch forex pairs and sync to Zustand store */
export function useForex() {
  const setForexPairs = useGlobeStore((s) => s.setForexPairs)

  const { data, error, isLoading, mutate } = useSWR<ForexPair[]>(
    '/api/forex/pairs',
    fetcher,
    {
      refreshInterval: 60_000, // 1 minute
      revalidateOnFocus: false,
      onSuccess: (pairs) => setForexPairs(pairs),
    }
  )

  return { pairs: data ?? [], error, isLoading, refresh: mutate }
}
