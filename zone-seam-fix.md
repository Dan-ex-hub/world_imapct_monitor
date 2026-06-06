# Zone Boundary Seam Fix

> **Problem:** Hard vertical edges appear on the 3-D globe and 2-D map at lon = -90°, 0°,
> and +90° — the boundaries between the 4 fetch zones. The IDW interpolation has no
> data points that straddle the zone boundary, so it produces a sharp discontinuity
> instead of a smooth blend.
>
> **Root cause:** Each zone fetches independently. Points stop at the zone edge, so the
> IDW on each side only "sees" its own zone's points near the boundary. The two sides
> independently interpolate to different values right at lon = -90, 0, +90.
>
> **Fix strategy:** After fetching all zones, inject a 1-column-wide "ghost point" strip
> from each zone into its neighbour's point array before running IDW. These ghost points
> give the IDW visibility across the seam so it blends smoothly.
>
> This fix touches 2 files only. Everything else — zones, fetching, caching, blur,
> colour scales — stays unchanged.

---

## Files to Change

| File | What changes |
|------|-------------|
| `src/app/api/env/weather/route.ts` | Inject ghost points when merging zones (wind + temp) |
| `src/app/api/env/aqi/route.ts` | Same — AQI zone merge |
| `src/app/api/env/sea-temp/route.ts` | Same — SST zone merge |
| `src/components/globe/heatmap.utils.ts` | Clamp ghost points so they don't appear outside globe |

**Do NOT change:**
- `src/lib/env/zones.ts` — zone definitions unchanged
- `src/lib/env/openmeteo.ts` / `openaq.ts` / `seatemp.ts` — fetchers unchanged
- Caching logic — ghost points are injected at merge time, not stored in Supabase
- `MapView2D.tsx` — BFS flood-fill naturally blends across seams once ghost points
  are in the merged array; no separate fix needed there

---

## How Ghost Points Work

```
Zone 2 ends at lon = 0°          Zone 3 starts at lon = 0°
  ... -5°  -2.5°  [0°] ...          ... [0°]  2.5°  5° ...
              ↑ seam                      ↑ seam

Without ghost points:             With ghost points:
  IDW Z2 sees: ...-5, -2.5        IDW Z2 sees: ...-5, -2.5, +2.5(ghost), +5(ghost)
  IDW Z3 sees: +2.5, +5...        IDW Z3 sees: -5(ghost), -2.5(ghost), +2.5, +5...

  Result: hard edge at 0°         Result: smooth blend across 0°
```

Ghost points are real data values taken from the neighbouring zone's outermost
columns (2 columns deep = 5° at 2.5° grid step). They are injected only into the
merged array passed to the IDW — they are never stored in Supabase.

---

## Change 1 — Ghost Point Injection in API Route Files

Apply this pattern to all three route files:
`weather/route.ts`, `aqi/route.ts`, `sea-temp/route.ts`

The merge step currently looks something like:

```typescript
// BEFORE — in each route's GET handler, after reading all zone data from Supabase
// (exact variable names may differ — find the array concatenation / merge step)

const allPoints = [
  ...zone1Data.points,
  ...zone2Data.points,
  ...zone3Data.points,
  ...zone4Data.points,
];

return NextResponse.json({ points: allPoints, updatedAt: ... });
```

Replace with:

```typescript
// AFTER — inject ghost points across each zone boundary before merging

// ─── Ghost point helper ───────────────────────────────────────────────────────
// Returns all points from `sourceZone` whose longitude is within `depthDeg` of
// the boundary longitude `boundaryLon`, shifted by `shiftLon` so they appear
// just inside the neighbouring zone. This gives IDW data to interpolate across
// the seam.
function injectGhostPoints<T extends { lon: number }>(
  sourceZonePoints: T[],
  boundaryLon: number,   // the shared longitude edge (e.g. 0 for Zone2/Zone3)
  depthDeg: number,      // how many degrees deep to copy (use 5.0 — 2 grid steps)
  shiftLon: number,      // how far to shift into the neighbour (+5 or -5)
): T[] {
  return sourceZonePoints
    .filter(pt => Math.abs(pt.lon - boundaryLon) <= depthDeg)
    .map(pt => ({ ...pt, lon: pt.lon + shiftLon }));
}

// Zone boundary longitudes (must match zones.ts exactly):
// Zone 1: -180 → -90   |   Zone 2: -90 → 0   |   Zone 3: 0 → 90   |   Zone 4: 90 → 180

const GHOST_DEPTH = 5.0;  // degrees — covers 2 grid steps at 2.5° resolution

const allPoints = [
  // Zone 1 points + ghost from Zone 2's western edge
  ...zone1Data.points,
  ...injectGhostPoints(zone2Data.points, -90, GHOST_DEPTH, -5),

  // Zone 2 points + ghost from Zone 1's eastern edge + Zone 3's western edge
  ...zone2Data.points,
  ...injectGhostPoints(zone1Data.points, -90, GHOST_DEPTH, +5),
  ...injectGhostPoints(zone3Data.points,   0, GHOST_DEPTH, -5),

  // Zone 3 points + ghost from Zone 2's eastern edge + Zone 4's western edge
  ...zone3Data.points,
  ...injectGhostPoints(zone2Data.points,   0, GHOST_DEPTH, +5),
  ...injectGhostPoints(zone4Data.points,  90, GHOST_DEPTH, -5),

  // Zone 4 points + ghost from Zone 3's eastern edge
  ...zone4Data.points,
  ...injectGhostPoints(zone3Data.points, 90, GHOST_DEPTH, +5),
];

return NextResponse.json({ points: allPoints, updatedAt: ... });
```

> **Important:** The variable names `zone1Data`, `zone2Data` etc. are illustrative.
> In your actual code the zones are likely stored in an array or map keyed by zone id
> (e.g. `zoneResults['wind_zone_zone-1']`). Adapt accordingly — the logic is the same:
> for each shared boundary, copy the outermost 2 grid columns from each side into the
> other side's point array.

### Variant — if zones are stored in an array

```typescript
// If your merge looks like this:
const zones = ['zone-1', 'zone-2', 'zone-3', 'zone-4'];
const allPoints = zones.flatMap(z => cachedData[z]?.points ?? []);

// Replace with:
const zoneBoundaries = [-90, 0, 90]; // lon values where zones meet
const GHOST_DEPTH = 5.0;

// Start with all real points
const allPoints = zones.flatMap(z => cachedData[z]?.points ?? []);

// For each boundary, inject ghosts both directions
for (const boundaryLon of zoneBoundaries) {
  const leftPoints  = allPoints.filter(pt => pt.lon <= boundaryLon);
  const rightPoints = allPoints.filter(pt => pt.lon >= boundaryLon);

  // Left zone ghosts → shifted into right zone
  const leftGhosts = leftPoints
    .filter(pt => Math.abs(pt.lon - boundaryLon) <= GHOST_DEPTH)
    .map(pt => ({ ...pt, lon: pt.lon + (2 * (boundaryLon - pt.lon) + GHOST_DEPTH) }));
    // simpler: just shift all of them +5° past the boundary
    // .map(pt => ({ ...pt, lon: pt.lon + GHOST_DEPTH * 2 }));

  // Right zone ghosts → shifted into left zone
  const rightGhosts = rightPoints
    .filter(pt => Math.abs(pt.lon - boundaryLon) <= GHOST_DEPTH)
    .map(pt => ({ ...pt, lon: pt.lon - GHOST_DEPTH * 2 }));

  allPoints.push(...leftGhosts, ...rightGhosts);
}
```

> Use whichever variant matches your actual merge code structure.

---

## Change 2 — Clamp Ghost Longitudes in `heatmap.utils.ts`

Ghost points can end up with lon values slightly outside [-180, 180] at the
Zone 1 / Zone 4 wrap boundary. The `toPixel` conversion must clamp them.

Find the `toPixelX` (or equivalent) function that converts lon → canvas x:

```typescript
// BEFORE
function toPixelX(lon: number): number {
  return ((lon + 180) / 360) * 2048;
}

// AFTER — add clamp
function toPixelX(lon: number): number {
  const clamped = Math.max(-180, Math.min(180, lon)); // ← add this line
  return ((clamped + 180) / 360) * 2048;
}
```

Same for `toPixelY` if it does not already clamp latitude:

```typescript
// AFTER — add clamp
function toPixelY(lat: number): number {
  const clamped = Math.max(-90, Math.min(90, lat)); // ← add this line
  return ((90 - clamped) / 180) * 1024;
}
```

---

## Change 3 — Fix the lon=±180 Wrap Seam (Zone 1 / Zone 4)

The `blurSeamless` function already tiles 3-wide to handle the lon=±180 wrap.
But ghost points won't help here because Zone 1 and Zone 4 share no real boundary
in the fetch — they are not adjacent in the zone list.

Add cross-wrap ghost injection for the ±180° boundary:

```typescript
// Add to the merge step in ALL THREE route files, alongside the other ghost injections:

// Zone 4 eastern edge → ghost into Zone 1's western side (wrap)
const wrapGhostsEast = zone4Data.points
  .filter(pt => pt.lon >= 180 - GHOST_DEPTH)
  .map(pt => ({ ...pt, lon: pt.lon - 360 })); // shift to appear at ~lon -175

// Zone 1 western edge → ghost into Zone 4's eastern side (wrap)
const wrapGhostsWest = zone1Data.points
  .filter(pt => pt.lon <= -180 + GHOST_DEPTH)
  .map(pt => ({ ...pt, lon: pt.lon + 360 })); // shift to appear at ~lon +175

allPoints.push(...wrapGhostsEast, ...wrapGhostsWest);
```

---

## Change 4 — `blurSeamless` is already correct, keep it

The existing `blurSeamless(canvas, blurPx)` function tiles 3-wide and crops the
centre tile. This already handles the visual seam at ±180°. Do NOT modify it.
The ghost point injection above handles the data seam; `blurSeamless` handles the
pixel seam. Both are needed.

---

## Why NOT fix it at the fetch/cache level

You might think: "just fetch a 5° overlap in each zone". This would work but has
two problems:
1. Overlapping fetches mean duplicate API calls for the shared lat/lon points,
   wasting your request budget.
2. Supabase would store duplicate points per zone, bloating the cache JSONB.

Ghost injection at merge time costs nothing extra (it's just array manipulation in
the route handler, ~1ms) and uses already-cached data.

---

## Expected Result

| Before | After |
|--------|-------|
| Hard vertical edge at lon = -90°, 0°, +90° | Smooth blend across all zone boundaries |
| Pole-to-pole wedge artifact | Gone |
| Artifact more visible at high p (p=3 IDW) | Fixed — ghost points give IDW cross-boundary data |

> **Why did the seam get worse after the IDW upgrade?**
> Higher p (p=3 vs p=2) makes IDW fall off faster with distance. Near a zone boundary,
> the nearest points are all on one side, so p=3 "ignores" the far-side data even more
> aggressively than p=2 did. Ghost points fix this by ensuring both sides always have
> nearby data right at the boundary.

---

## Verification Steps

After applying changes, test by:

1. Clear Supabase `env_data_cache` rows for all zones (force a cold refetch)
2. Load the wind layer — rotate globe to look directly at lon = 0° (Africa/Europe boundary)
3. The vertical seam should be gone — wind values should gradient smoothly
4. Rotate to lon = -90° and lon = +90° — same check
5. Rotate to lon = ±180° (Pacific) — seam should also be gone (handled by wrap ghosts)
6. Check 2-D Leaflet map — seams should also be gone there (BFS uses the same merged array)

---

*Last updated: 2026-06-06. Companion to `heatmap-accuracy-upgrade.md`.*
