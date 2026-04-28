'use client'

import { useRef, useCallback, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import GlobeWrapper from '@/components/globe/GlobeWrapper'
import { EventModal } from '@/components/ui/EventModal'
import { TooltipOverlay } from '@/components/ui/TooltipOverlay'
import { ForexPanel } from '@/components/ui/ForexPanel'
import { EnvDataPanel } from '@/components/ui/EnvDataPanel'
import { NewsTicker } from '@/components/ui/NewsTicker'
import { EnvLayerPanel } from '@/components/ui/EnvLayerPanel'
import { PlaybackControls } from '@/components/ui/PlaybackControls'
import { OnboardingFlow } from '@/components/ui/OnboardingFlow'
import { useRealtimeEvents } from '@/lib/realtime/useRealtimeEvents'
import { MOCK_EVENTS } from '@/lib/mock/events'
import { useGlobeStore } from '@/store/useGlobeStore'
import type { GlobeRef } from '@/components/globe/GlobeRenderer'
import type { GlobeEvent } from '@/store/types'

export default function Home() {
  const globeRef = useRef<GlobeRef>(null)
  const events = useGlobeStore((s) => s.events)
  const setEvents = useGlobeStore((s) => s.setEvents)
  const setSelectedEvent = useGlobeStore((s) => s.setSelectedEvent)
  const setHoveredEvent = useGlobeStore((s) => s.setHoveredEvent)
  const activeEnvLayer = useGlobeStore((s) => s.activeEnvLayer)

  // Subscribe to realtime events from Supabase
  useRealtimeEvents()

  // Fallback to mock events if no events loaded from Supabase (for development)
  useEffect(() => {
    if (events.length === 0) {
      console.log('[App] No events from Supabase, using mock data')
      setEvents(MOCK_EVENTS)
    }
  }, [events.length, setEvents])

  const handleEventClick = useCallback((event: GlobeEvent) => {
    console.log('[ImpactGlobe] Event clicked:', event.headline)
    // Open modal
    setSelectedEvent(event)
    // Fly to the event location
    globeRef.current?.flyTo(event.lat, event.lon)
  }, [setSelectedEvent])

  const handleEventHover = useCallback((event: GlobeEvent | null) => {
    if (event) {
      console.log('[ImpactGlobe] Hovering:', event.headline)
      // Update store with hovered event
      setHoveredEvent(event.id, { x: 0, y: 0 }) // Position will be updated by raycaster
    } else {
      setHoveredEvent(null)
    }
  }, [setHoveredEvent])

  return (
    <AppShell>
      {/* 3D Globe — full viewport */}
      <GlobeWrapper
        ref={globeRef}
        events={events}
        onEventClick={handleEventClick}
        onEventHover={handleEventHover}
      />

      {/* Gradient vignette overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(5,10,20,0.7) 100%)',
        }}
      />

      {/* Right sidebar - show EnvDataPanel if env layer active, otherwise ForexPanel */}
      {activeEnvLayer !== 'none' ? <EnvDataPanel /> : <ForexPanel />}

      {/* Environmental layer controls */}
      <EnvLayerPanel />

      {/* Playback controls */}
      <PlaybackControls />

      {/* News ticker */}
      <NewsTicker />

      {/* Tooltip overlay */}
      <TooltipOverlay />

      {/* Event modal */}
      <EventModal />

      {/* Onboarding flow (shows only on first visit) */}
      <OnboardingFlow />
    </AppShell>
  )
}
