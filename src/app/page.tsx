'use client'

import { useRef, useCallback, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import GlobeWrapper from '@/components/globe/GlobeWrapper'
import { EventModal } from '@/components/ui/EventModal'
import { TooltipOverlay } from '@/components/ui/TooltipOverlay'
import { MOCK_EVENTS } from '@/lib/mock/events'
import { useGlobeStore } from '@/store/useGlobeStore'
import type { GlobeRef } from '@/components/globe/GlobeRenderer'
import type { GlobeEvent } from '@/store/types'

export default function Home() {
  const globeRef = useRef<GlobeRef>(null)
  const setEvents = useGlobeStore((s) => s.setEvents)
  const setSelectedEvent = useGlobeStore((s) => s.setSelectedEvent)
  const setHoveredEvent = useGlobeStore((s) => s.setHoveredEvent)

  // Load mock events into store on mount
  useEffect(() => {
    setEvents(MOCK_EVENTS)
  }, [setEvents])

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
        events={MOCK_EVENTS}
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

      {/* Tooltip overlay */}
      <TooltipOverlay />

      {/* Event modal */}
      <EventModal />
    </AppShell>
  )
}
