'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useGlobeStore } from '@/store/useGlobeStore'

/** Historical event playback controller */
export function usePlayback() {
  const setPlaybackMode = useGlobeStore((s) => s.setPlaybackMode)
  const setPlaybackTimestamp = useGlobeStore((s) => s.setPlaybackTimestamp)
  const isPlaybackMode = useGlobeStore((s) => s.isPlaybackMode)
  const playbackTimestamp = useGlobeStore((s) => s.playbackTimestamp)

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1) // 1x, 2x, 4x
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startPlayback = useCallback((fromTimestamp: string) => {
    setPlaybackMode(true)
    setPlaybackTimestamp(fromTimestamp)
    setIsPlaying(true)
  }, [setPlaybackMode, setPlaybackTimestamp])

  const stopPlayback = useCallback(() => {
    setPlaybackMode(false)
    setPlaybackTimestamp(null)
    setIsPlaying(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [setPlaybackMode, setPlaybackTimestamp])

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  // Advance timestamp while playing
  useEffect(() => {
    if (isPlaying && isPlaybackMode) {
      intervalRef.current = setInterval(() => {
        const current = useGlobeStore.getState().playbackTimestamp
        if (!current) return
        const next = new Date(new Date(current).getTime() + speed * 60_000)
        if (next > new Date()) {
          stopPlayback()
          return
        }
        setPlaybackTimestamp(next.toISOString())
      }, 1000 / speed)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, isPlaybackMode, speed, setPlaybackTimestamp, stopPlayback])

  return {
    isPlaybackMode,
    isPlaying,
    speed,
    startPlayback,
    stopPlayback,
    togglePlayPause,
    setSpeed,
  }
}
