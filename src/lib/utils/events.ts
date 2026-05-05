import type { EarthquakeEvent, GlobeEvent } from "@/store/types";

export function convertQuakeToEvent(quake: EarthquakeEvent): GlobeEvent {
  const impactLevel: GlobeEvent["impactLevel"] =
    quake.magnitude >= 6.0
      ? "Critical"
      : quake.magnitude >= 5.0
        ? "High"
        : quake.magnitude >= 4.0
          ? "Medium"
          : "Low";

  return {
    id: quake.id,
    headline: `M${quake.magnitude.toFixed(1)} Earthquake — ${quake.location}`,
    country: quake.location,
    lat: quake.lat,
    lon: quake.lon,
    impactLevel,
    category: "Natural Disaster",
    summary: `Magnitude ${quake.magnitude.toFixed(1)} earthquake at ${quake.depth}km depth. ${quake.location}`,
    sentiment: "Negative",
    forexImpacts: [],
    confidenceScore: 100,
    isMarketMoving: quake.magnitude >= 6.0,
    publishedAt: quake.time,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    sourceUrl: quake.url,
    createdBy: "ai-auto",
  };
}
