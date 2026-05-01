"use client";

import { useRef, useCallback, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import GlobeWrapper from "@/components/globe/GlobeWrapper";
import { EventModal } from "@/components/ui/EventModal";
import { TooltipOverlay } from "@/components/ui/TooltipOverlay";
import { ForexPanel } from "@/components/ui/ForexPanel";
import { EnvDataPanel } from "@/components/ui/EnvDataPanel";
import { NewsTicker } from "@/components/ui/NewsTicker";
import { EnvLayerPanel } from "@/components/ui/EnvLayerPanel";
import { PlaybackControls } from "@/components/ui/PlaybackControls";
import { useRealtimeEvents } from "@/lib/realtime/useRealtimeEvents";
import { useEnvLayer } from "@/hooks/useEnvLayer";
import { useGlobeStore } from "@/store/useGlobeStore";
import type { GlobeRef } from "@/components/globe/GlobeRenderer";
import type { GlobeEvent } from "@/store/types";
import type { HoveredEnvPoint } from "@/store/useGlobeStore";

export default function Home() {
  const globeRef = useRef<GlobeRef>(null);
  const newsEvents = useGlobeStore((s) => s.events);
  const setEvents = useGlobeStore((s) => s.setEvents);
  const setSelectedEvent = useGlobeStore((s) => s.setSelectedEvent);
  const setHoveredEvent = useGlobeStore((s) => s.setHoveredEvent);
  const setHoveredEnvPoint = useGlobeStore((s) => s.setHoveredEnvPoint);
  const activeEnvLayer = useGlobeStore((s) => s.activeEnvLayer);
  const envLayerData = useGlobeStore((s) => s.envLayerData);
  const filters = useGlobeStore((s) => s.filters);

  // Subscribe to realtime events from Supabase
  useRealtimeEvents();

  // Fetch environmental layer data when layer changes
  useEnvLayer(activeEnvLayer);

  // ── Dev-mode cron heartbeat ──────────────────────────────────────────────
  // Vercel crons don't run locally. This fires every minute in development
  // to simulate the cron schedule (forex rotation, RSS poll, env data refresh).
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const fireHeartbeat = () => {
      fetch("/api/cron/heartbeat").catch(() => {});
    };

    // Fire immediately on mount, then every 60 seconds
    fireHeartbeat();
    const interval = setInterval(fireHeartbeat, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Trigger RSS poll when no events are loaded (cron won't run in dev)
  useEffect(() => {
    if (newsEvents.length === 0) {
      fetch("/api/rss/trigger").catch(() => {});
    }
  }, [newsEvents.length]);

  // ── Apply filters to news events ──────────────────────────────────────────
  // When categories or impact levels are selected, only events matching ALL
  // active filter criteria appear as ripple markers on the globe.
  const applyFilters = useCallback(
    (events: GlobeEvent[]): GlobeEvent[] => {
      let filtered = events;

      // Time range filter
      const hoursMap: Record<string, number> = {
        "1h": 1,
        "6h": 6,
        "24h": 24,
        "48h": 48,
      };
      const hours = hoursMap[filters.timeRange] ?? 48;
      const cutoff = Date.now() - hours * 3_600_000;
      filtered = filtered.filter(
        (e) => new Date(e.publishedAt).getTime() >= cutoff,
      );

      // Category filter — if any are selected, only show those categories
      if (filters.categories.length > 0) {
        filtered = filtered.filter((e) =>
          filters.categories.includes(e.category),
        );
      }

      // Impact level filter — if any are selected, only show those levels
      if (filters.impactLevels.length > 0) {
        filtered = filtered.filter((e) =>
          filters.impactLevels.includes(e.impactLevel),
        );
      }

      // Search query filter
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.headline.toLowerCase().includes(q) ||
            e.country.toLowerCase().includes(q) ||
            e.summary.toLowerCase().includes(q),
        );
      }

      return filtered;
    },
    [filters],
  );

  // Convert environmental data to event markers
  // Heatmap layers (wind, temp, aqi, sea_temp): hide news ripples — heatmap IS the visualization
  // Discrete layers (earthquakes, fires, storms): show those events as ripple markers
  // None: show all news events as ripples (filtered by active filters)
  const displayEvents = useCallback((): GlobeEvent[] => {
    // Heatmap layers — no ripple markers, the heatmap covers the globe
    if (
      ["wind", "temperature_anomaly", "aqi", "sea_temp"].includes(
        activeEnvLayer,
      )
    ) {
      return [];
    }

    if (activeEnvLayer === "none") {
      // Apply all active filters to news events
      return applyFilters(newsEvents);
    }

    // Convert environmental data to GlobeEvent format
    const envEvents: GlobeEvent[] = [];

    if (activeEnvLayer === "earthquakes" && envLayerData?.earthquakes) {
      envLayerData.earthquakes.forEach((quake) => {
        const impactLevel: GlobeEvent["impactLevel"] =
          quake.magnitude >= 6.0
            ? "Critical"
            : quake.magnitude >= 5.0
              ? "High"
              : quake.magnitude >= 4.0
                ? "Medium"
                : "Low";

        envEvents.push({
          id: quake.id,
          headline: `M${quake.magnitude} Earthquake`,
          country: quake.location,
          lat: quake.lat,
          lon: quake.lon,
          impactLevel,
          category: "Natural Disaster",
          summary: `Magnitude ${quake.magnitude} earthquake at depth of ${quake.depth}km. ${quake.location}`,
          sentiment: "Negative",
          forexImpacts: [],
          confidenceScore: 100,
          isMarketMoving: quake.magnitude >= 6.0,
          publishedAt: quake.time,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          sourceUrl: quake.url,
          createdBy: "ai-auto",
        });
      });
    }

    if (activeEnvLayer === "wildfires" && envLayerData?.wildfires) {
      envLayerData.wildfires.forEach((fire) => {
        envEvents.push({
          id: fire.id,
          headline: fire.title,
          country: fire.title.split(",").pop()?.trim() || "Unknown",
          lat: fire.lat,
          lon: fire.lon,
          impactLevel: "High",
          category: "Natural Disaster",
          summary: `Active wildfire: ${fire.title}. Started: ${new Date(fire.date).toLocaleDateString()}`,
          sentiment: "Negative",
          forexImpacts: [],
          confidenceScore: 100,
          isMarketMoving: false,
          publishedAt: fire.date,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          sourceUrl: `https://eonet.gsfc.nasa.gov/`,
          createdBy: "ai-auto",
        });
      });
    }

    if (activeEnvLayer === "storms" && envLayerData?.storms) {
      envLayerData.storms.forEach((storm) => {
        const isHurricane =
          storm.category?.toLowerCase().includes("hurricane") ?? false;
        envEvents.push({
          id: storm.id,
          headline: storm.title,
          country: storm.title.split(",").pop()?.trim() || "Unknown",
          lat: storm.lat,
          lon: storm.lon,
          impactLevel: isHurricane ? "Critical" : "High",
          category: "Natural Disaster",
          summary: `${storm.category || "Storm"}: ${storm.title}`,
          sentiment: "Negative",
          forexImpacts: [],
          confidenceScore: 100,
          isMarketMoving: isHurricane,
          publishedAt: storm.date,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          sourceUrl: `https://eonet.gsfc.nasa.gov/`,
          createdBy: "ai-auto",
        });
      });
    }

    return envEvents;
  }, [activeEnvLayer, envLayerData, newsEvents, applyFilters]);

  const events = displayEvents();

  const handleEventClick = useCallback(
    (event: GlobeEvent) => {
      console.log("[ImpactGlobe] Event clicked:", event.headline);
      // Open modal
      setSelectedEvent(event);
      // Fly to the event location
      globeRef.current?.flyTo(event.lat, event.lon);
    },
    [setSelectedEvent],
  );

  const handleEnvHover = useCallback(
    (point: HoveredEnvPoint | null, pos?: { x: number; y: number }) => {
      setHoveredEnvPoint(point, pos);
    },
    [setHoveredEnvPoint],
  );

  const handleEventHover = useCallback(
    (event: GlobeEvent | null) => {
      if (event) {
        console.log("[ImpactGlobe] Hovering:", event.headline);
        // Update store with hovered event
        setHoveredEvent(event.id, { x: 0, y: 0 }); // Position will be updated by raycaster
      } else {
        setHoveredEvent(null);
      }
    },
    [setHoveredEvent],
  );

  return (
    <AppShell>
      {/* 3D Globe — full viewport */}
      <GlobeWrapper
        ref={globeRef}
        events={events}
        onEventClick={handleEventClick}
        onEventHover={handleEventHover}
        onEnvHover={handleEnvHover}
        activeEnvLayer={activeEnvLayer}
        envLayerData={envLayerData}
      />

      {/* Gradient vignette overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(5,10,20,0.7) 100%)",
        }}
      />

      {/* Right sidebar - show EnvDataPanel if env layer active, otherwise ForexPanel */}
      {activeEnvLayer !== "none" ? <EnvDataPanel /> : <ForexPanel />}

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
    </AppShell>
  );
}
