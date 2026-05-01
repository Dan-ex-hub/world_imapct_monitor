"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGlobeStore } from "@/store/useGlobeStore";
import type { GlobeEvent } from "@/store/types";

export function useRealtimeEvents() {
  const setEvents = useGlobeStore((s) => s.setEvents);
  const addEvent = useGlobeStore((s) => s.addEvent);

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial events
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("expires_at", new Date().toISOString())
        .order("published_at", { ascending: false });

      if (error) {
        console.error("[Realtime] fetch error:", error);
        return;
      }
      if (data) {
        setEvents(data.map(mapRow));
      }
    };

    fetchInitial();

    // Subscribe to INSERT / UPDATE
    const channel = supabase
      .channel("events-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (p) => addEvent(mapRow(p.new as any)),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events" },
        (p) => addEvent(mapRow(p.new as any)),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setEvents, addEvent]);
}

function mapRow(row: any): GlobeEvent {
  return {
    id: row.id,
    headline: row.headline,
    country: row.country,
    lat: Number(row.lat),
    lon: Number(row.lon),
    impactLevel: row.impact_level,
    category: row.category,
    summary: row.summary,
    sentiment: row.sentiment,
    forexImpacts: row.forex_impacts || [],
    confidenceScore: Number(row.confidence_score),
    isMarketMoving: row.is_market_moving,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    sourceUrl: row.source_url || undefined,
    createdBy: row.created_by,
  };
}
