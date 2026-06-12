import axios from "axios";
import type { WindPoint, TempAnomalyPoint } from "@/store/types";
import {
  type GlobeZone,
  generateZoneGrid,
  GRID_RESOLUTION,
  GRID_BATCH_SIZE,
} from "./zones";

const BASE = "https://api.open-meteo.com/v1";

/**
 * Fetch wind data for a specific zone only
 * 2.5° grid → 2,701 points per zone, batched at ≤1,000 points per request
 * (exactly 3 batches: 1,000 + 1,000 + 701) to respect Open-Meteo's
 * per-request limit while finishing well within serverless timeouts.
 */
export async function getWindGridForZone(
  zone: GlobeZone,
): Promise<WindPoint[]> {
  const points: WindPoint[] = [];
  const batchSize = GRID_BATCH_SIZE;

  // 2.5° resolution — shared across ALL layers for a uniform, smooth globe
  const coords = generateZoneGrid(zone, GRID_RESOLUTION);

  console.log(
    `[OpenMeteo] Fetching wind for zone: ${zone.name} (${coords.length} points, ${Math.ceil(coords.length / batchSize)} batches)`,
  );

  // Batch requests to avoid rate limiting
  for (let i = 0; i < coords.length; i += batchSize) {
    const batch = coords.slice(i, i + batchSize);
    const latitudes = batch.map((c) => c.lat).join(",");
    const longitudes = batch.map((c) => c.lon).join(",");

    try {
      const { data } = await axios.get(`${BASE}/forecast`, {
        params: {
          latitude: latitudes,
          longitude: longitudes,
          current: "wind_speed_10m,wind_direction_10m",
          wind_speed_unit: "ms", // Force m/s — default is km/h which causes 3.6× inflation
          forecast_days: 1,
        },
        timeout: 15000,
      });

      // Handle single or multiple results
      const results = Array.isArray(data) ? data : [data];
      results.forEach((result: Record<string, unknown>, idx: number) => {
        const current = result.current as Record<string, number> | undefined;
        if (current?.wind_speed_10m !== undefined) {
          const speed = current.wind_speed_10m;
          // Sanity check: real wind speeds are 0-70 m/s even in extreme hurricanes
          // Values above 70 indicate a unit mismatch or API error — skip them
          if (speed < 0 || speed > 70) return;
          points.push({
            lat: batch[idx].lat,
            lon: batch[idx].lon,
            speed: Math.round(speed * 10) / 10,
            direction: current.wind_direction_10m ?? 0,
          });
        }
      });
    } catch (err) {
      console.warn(
        `[OpenMeteo] Failed to fetch wind batch for ${zone.name}:`,
        err,
      );
    }

    // Delay between batches to respect rate limits (only 3 batches → ~2s total delay)
    if (i + batchSize < coords.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(
    `[OpenMeteo] Fetched ${points.length} wind points for ${zone.name}`,
  );
  return points;
}

/**
 * Fetch temperature anomalies for a specific zone
 */
export async function getTempAnomaliesForZone(
  zone: GlobeZone,
): Promise<TempAnomalyPoint[]> {
  const points: TempAnomalyPoint[] = [];
  const batchSize = GRID_BATCH_SIZE;

  // 2.5° resolution — matches wind, sea temp and AQI grid density.
  // 2,701 points per zone batched at ≤1,000 → exactly 3 requests with two
  // 1s delays (~4-6s per zone), covering the full globe including the poles
  // without timing out.
  const coords = generateZoneGrid(zone, GRID_RESOLUTION);

  console.log(
    `[OpenMeteo] Fetching temperature for zone: ${zone.name} (${coords.length} points, ${Math.ceil(coords.length / batchSize)} batches)`,
  );

  for (let i = 0; i < coords.length; i += batchSize) {
    const batch = coords.slice(i, i + batchSize);
    const latitudes = batch.map((c) => c.lat).join(",");
    const longitudes = batch.map((c) => c.lon).join(",");

    try {
      const { data } = await axios.get(`${BASE}/forecast`, {
        params: {
          latitude: latitudes,
          longitude: longitudes,
          current: "temperature_2m",
          forecast_days: 1,
        },
        timeout: 15000,
      });

      const results = Array.isArray(data) ? data : [data];
      results.forEach((result: Record<string, unknown>, idx: number) => {
        const current = result.current as Record<string, number> | undefined;
        if (current?.temperature_2m !== undefined) {
          // Store actual temperature (°C). The heatmap renders it on an absolute
          // -40°C → 45°C scale so it matches real-world visualisations like Windy.
          points.push({
            lat: batch[idx].lat,
            lon: batch[idx].lon,
            anomalyC: Math.round(current.temperature_2m * 10) / 10,
          });
        }
      });
    } catch (err) {
      console.warn(
        `[OpenMeteo] Failed to fetch temp batch for ${zone.name}:`,
        err,
      );
    }

    if (i + batchSize < coords.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(
    `[OpenMeteo] Fetched ${points.length} temp points for ${zone.name}`,
  );
  return points;
}
