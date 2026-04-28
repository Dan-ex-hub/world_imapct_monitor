import { useEffect, useRef } from 'react'
import { useGlobeStore } from '@/store/useGlobeStore'
import type { GlobeEvent } from '@/store/types'

export function usePlayback() {
  const {
    isPlaybackMode,
    playbackTime,
    playbackSpeed,
    isPlaybackPlaying,
    events,
    setEvents,
    enterPlayback: enterPlaybackStore,
    exitPlayback: exitPlaybackStore,
    setPlaybackTime,
    setPlaybackSpeed: setPlaybackSpeedStore,
    togglePlayback,
  } = useGlobeStore()

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const playbackEventsRef = useRef<GlobeEvent[]>([])
  const liveEventsRef = useRef<GlobeEvent[]>([])

  // Fetch historical events when entering playback mode
  const enterPlayback = async () => {
    try {
      // Store current live events
      liveEventsRef.current = events

      // Fetch all events from last 48h including expired ones
      const response = await fetch('/api/events?include_expired=true&timeRange=48h&limit=500')
      if (!response.ok) throw new Error('Failed to fetch historical events')

      const data = await response.json()
      playbackEventsRef.current = data.events.sort(
        (a: GlobeEvent, b: GlobeEvent) =>
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      )

      // Set playback time to 48 hours ago
      const now = new Date()
      const startTime = new Date(now.getTime() - 48 * 60 * 60 * 1000)
      setPlaybackTime(startTime)

      // Enter playback mode in store
      enterPlaybackStore()

      // Start with no events visible (will be filtered by playback time)
      setEvents([])
    } catch (error) {
      console.error('Failed to enter playback mode:', error)
    }
  }

  // Exit playback mode and restore live events
  const exitPlayback = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Restore live events
    setEvents(liveEventsRef.current)
    playbackEventsRef.current = []

    exitPlaybackStore()
  }

  // Update visible events based on playback time
  useEffect(() => {
    if (!isPlaybackMode) return

    const visibleEvents = playbackEventsRef.current.filter((event) => {
      const eventTime = new Date(event.publishedAt).getTime()
      const currentTime = playbackTime.getTime()
      return eventTime <= currentTime
    })

    setEvents(visibleEvents)
  }, [playbackTime, isPlaybackMode, setEvents])

  // Handle playback animation
  useEffect(() => {
    if (!isPlaybackMode || !isPlaybackPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Advance time every 100ms
    intervalRef.current = setInterval(() => {
      setPlaybackTime((prevTime) => {
        const now = new Date()
        const newTime = new Date(prevTime.getTime() + 100 * playbackSpeed)

        // Stop at current time
        if (newTime >= now) {
          togglePlayback() // Pause playback
          return now
        }

        return newTime
      })
    }, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isPlaybackMode, isPlaybackPlaying, playbackSpeed, setPlaybackTime, togglePlayback])

  const setSpeed = (speed: 1 | 2 | 5 | 10) => {
    setPlaybackSpeedStore(speed)
  }

  const seekTo = (time: Date) => {
    setPlaybackTime(time)
  }

  return {
    isPlaybackMode,
    playbackTime,
    playbackSpeed,
    isPlaybackPlaying,
    enterPlayback,
    exitPlayback,
    togglePlayback,
    setSpeed,
    seekTo,
  }
}
