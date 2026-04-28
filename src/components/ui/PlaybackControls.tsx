'use client'

import { useGlobeStore } from '@/store/useGlobeStore'
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatDistanceToNow, subHours } from 'date-fns'

export function PlaybackControls() {
  const isPlaybackMode = useGlobeStore((s) => s.isPlaybackMode)
  const playbackTimestamp = useGlobeStore((s) => s.playbackTimestamp)
  const setPlaybackMode = useGlobeStore((s) => s.setPlaybackMode)
  const setPlaybackTimestamp = useGlobeStore((s) => s.setPlaybackTimestamp)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date())
  const [now] = useState<Date>(() => new Date())
  const [startTime] = useState<Date>(() => subHours(new Date(), 48))

  useEffect(() => {
    if (!isPlaybackMode) {
      setIsPlaying(false)
      setCurrentTime(new Date())
      return
    }

    if (playbackTimestamp) {
      setCurrentTime(new Date(playbackTimestamp))
    }
  }, [isPlaybackMode, playbackTimestamp])

  useEffect(() => {
    if (!isPlaying || !isPlaybackMode) return

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = new Date(prev.getTime() + 60000) // Advance 1 minute per second
        if (next >= now) {
          setIsPlaying(false)
          return now
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying, isPlaybackMode, now])

  // Separate effect to sync playback timestamp with current time
  useEffect(() => {
    if (isPlaybackMode && isPlaying) {
      setPlaybackTimestamp(currentTime.toISOString())
    }
  }, [currentTime, isPlaybackMode, isPlaying, setPlaybackTimestamp])

  const handleTogglePlayback = () => {
    if (!isPlaybackMode) {
      setPlaybackMode(true)
      setPlaybackTimestamp(startTime.toISOString())
      setCurrentTime(startTime)
    } else {
      setPlaybackMode(false)
      setPlaybackTimestamp(null)
    }
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSkipBack = () => {
    const newTime = new Date(currentTime.getTime() - 3600000) // -1 hour
    if (newTime < startTime) return
    setCurrentTime(newTime)
    setPlaybackTimestamp(newTime.toISOString())
  }

  const handleSkipForward = () => {
    const newTime = new Date(currentTime.getTime() + 3600000) // +1 hour
    if (newTime > now) return
    setCurrentTime(newTime)
    setPlaybackTimestamp(newTime.toISOString())
  }

  const handleReset = () => {
    setCurrentTime(startTime)
    setPlaybackTimestamp(startTime.toISOString())
    setIsPlaying(false)
  }

  const progressPercent = isPlaybackMode
    ? ((currentTime.getTime() - startTime.getTime()) / (now.getTime() - startTime.getTime())) * 100
    : 100

  return (
    <div className="fixed bottom-12 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-border-subtle bg-bg-surface/90 p-3 backdrop-blur-sm">
      {!isPlaybackMode ? (
        <button
          onClick={handleTogglePlayback}
          className="flex items-center gap-2 rounded-lg bg-impact-medium px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-impact-medium/80"
        >
          <RotateCcw className="h-4 w-4" />
          Replay Last 48 Hours
        </button>
      ) : (
        <div className="flex items-center gap-4">
          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
              title="Reset to start"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={handleSkipBack}
              disabled={currentTime <= startTime}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-30"
              title="Skip back 1 hour"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={handlePlayPause}
              className="rounded-lg bg-impact-medium p-2 text-text-primary transition-colors hover:bg-impact-medium/80"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              onClick={handleSkipForward}
              disabled={currentTime >= now}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-30"
              title="Skip forward 1 hour"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Timeline */}
          <div className="flex-1" style={{ minWidth: '200px' }}>
            <div className="mb-1 text-xs text-text-muted">
              {formatDistanceToNow(currentTime, { addSuffix: true })}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full bg-impact-medium transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Exit button */}
          <button
            onClick={handleTogglePlayback}
            className="rounded-lg border border-border-default px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            Exit Playback
          </button>
        </div>
      )}
    </div>
  )
}
