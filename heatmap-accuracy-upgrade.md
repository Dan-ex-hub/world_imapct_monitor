# Heatmap Accuracy Upgrade — Implementation Guide

> **Purpose:** This document tells an AI agent exactly what to change, where, and why,
> to fix the "blobby / flat-zone" appearance of the wind, temperature, AQI, and sea-temp
> heatmap layers on both the 3-D Three.js globe and the 2-D Leaflet map.
>
> **Strategy (Option 3 = Option 1 + Option 2 combined):**
> - **Option 1** — Denser API grid (5° → 2.5° for wind/temp, 10° → 5° for AQI/sea-temp)
> - **Option 2** — Smarter IDW parameters (p=2→3, K=4→8) + wind anisotropy
> - **Option 3** — Apply both together (this document implements Option 3)

---

## Table of Contents

1. [Files to Change](#1-files-to-change)
2. [Change 1 — Denser Grid in API Fetchers](#2-change-1--denser-grid-in-api-fetchers)
3. [Change 2 — Improved IDW for 3-D Globe](#3-change-2--improved-idw-for-3-d-globe)
4. [Change 3 — Improved BFS Grid for 2-D Map](#4-change-3--improved-bfs-grid-for-2-d-map)
5. [Expected Impact](#5-expected-impact)
6. [API Call Budget After Changes](#6-api-call-budget-after-changes)
7. [Do Not Change](#7-do-not-change)

---

## 1. Files to Change

| File | What changes |
|------|-------------|
| `src/lib/env/openmeteo.ts` | Grid step: 5° → 2.5° for wind and temperature |
| `src/lib/env/openaq.ts` | Grid step: 10° → 5° for AQI |
| `src/lib/env/seatemp.ts` | Grid step: 10° → 5° for sea temperature |
| `src/components/globe/heatmap.utils.ts` | IDW: p=2→3, K=4→8, add wind anisotropy |
| `src/components/map/MapView2D.tsx` | BFS grid step: 2.5° → 1.5°, blur passes: 6→8 |

**Do NOT change:**
- `src/lib/env/zones.ts` — zone boundaries stay the same (4 longitude bands)
- `src/store/useGlobeStore.ts` — state shape is unchanged
- Any API route files — caching logic is unchanged
- Blur radius values in `heatmap.utils.ts` — keep as-is (14px wind, 18px temp, etc.)

---

## 2. Change 1 — Denser Grid in API Fetchers

### Why
Each API sample point is the only "truth" for its surrounding area. At 5°, one point
covers a ~550 km radius. Halving the step to 2.5° cuts that to ~275 km — 4× more
points, much smaller interpolation gaps.

### 2a. `src/lib/env/openmeteo.ts` — Wind and Temperature

Find the grid generation loop. It will look roughly like this:

```typescript
// BEFORE — current code (find this pattern)
const STEP = 5; // degrees
for (let lat = -90; lat <= 90; lat += STEP) {
  for (let lon = zoneMinLon; lon <= zoneMaxLon; lon += STEP) {
    points.push({ lat, lon });
  }
}
```

Change to:

```typescript
// AFTER — replace STEP value only, nothing else changes
const STEP = 2.5; // degrees  ← ONLY this line changes
for (let lat = -90; lat <= 90; lat += STEP) {
  for (let lon = zoneMinLon; lon <= zoneMaxLon; lon += STEP) {
    points.push({ lat, lon });
  }
}
```

> **Note:** The variable may be named differently (e.g. `resolution`, `gridStep`,
> `degreeStep`). Find the numeric literal `5` that controls the lat/lon loop increment
> and change it to `2.5`. Do not change the batch size (keep at 10 points per request).

**Points per zone after change:**
- Before: `ceil(180/5) × ceil(90/5)` ≈ 37 × 19 = 703 points/zone
- After:  `ceil(180/2.5) × ceil(90/2.5)` ≈ 73 × 37 = 2,701 points/zone

### 2b. `src/lib/env/openaq.ts` — AQI

Same pattern, change `10` → `5`:

```typescript
// BEFORE
const STEP = 10;

// AFTER
const STEP = 5; // degrees
```

### 2c. `src/lib/env/seatemp.ts` — Sea Temperature

Same pattern, change `10` → `5`:

```typescript
// BEFORE
const STEP = 10;

// AFTER
const STEP = 5; // degrees
```

---

## 3. Change 2 — Improved IDW for 3-D Globe

**File:** `src/components/globe/heatmap.utils.ts`

### 3a. Replace `buildIDWGrid` entirely

Find the existing `buildIDWGrid` function and replace its full implementation.
The function signature must stay the same so callers (`GlobeRenderer.tsx`) need no changes.

```typescript
// BEFORE — find and DELETE this entire function body
function buildIDWGrid(points: Array<{ x: number; y: number; value: number }>, K: number = 4): Float32Array {
  const gridW = 256;
  const gridH = 128;
  const grid = new Float32Array(gridW * gridH);

  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      const cx = col * (2048 / gridW);
      const cy = row * (1024 / gridH);

      // collect K nearest neighbours by squared pixel distance
      const dists = points.map(p => ({
        d2: (p.x - cx) ** 2 + (p.y - cy) ** 2,
        v: p.value,
      })).sort((a, b) => a.d2 - b.d2).slice(0, K);

      const num = dists.reduce((s, n) => s + n.v / n.d2, 0);
      const den = dists.reduce((s, n) => s + 1 / n.d2, 0);
      grid[row * gridW + col] = num / den;
    }
  }
  return grid;
}
```

Replace with:

```typescript
// AFTER — full replacement for buildIDWGrid
// Changes from before:
//   1. Power p raised from 2 → 3  (sharper falloff, less blobbing)
//   2. K raised from 4 → 8        (more neighbours → smoother field)
//   3. direction/speed params added for wind anisotropy (optional, ignored when null)
//   4. Anisotropic distance: stretches the distance ellipse along wind direction
//      so wind "streaks" downwind instead of forming circular blobs

interface IDWPoint {
  x: number;
  y: number;
  value: number;
  // Optional — only used for wind layer anisotropy:
  direction?: number; // degrees, meteorological (0=N, 90=E, 180=S, 270=W)
  speed?: number;     // m/s — higher speed = more elongation
}

function buildIDWGrid(
  points: IDWPoint[],
  K: number = 8,           // ← was 4
  p: number = 3,           // ← was 2 (implicit in d² formula)
  useAnisotropy: boolean = false,
): Float32Array {
  const gridW = 256;
  const gridH = 128;
  const grid = new Float32Array(gridW * gridH);
  const scaleX = 2048 / gridW;
  const scaleY = 1024 / gridH;

  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      const cx = col * scaleX;
      const cy = row * scaleY;

      const neighbours = points
        .map(pt => {
          const dx = pt.x - cx;
          const dy = pt.y - cy;

          let dist2: number;

          if (useAnisotropy && pt.direction !== undefined && pt.speed !== undefined && pt.speed > 1) {
            // Anisotropic distance: elongate along wind direction
            // Convert meteorological degrees to math radians (clockwise from N → CCW from E)
            const rad = ((270 - pt.direction) * Math.PI) / 180;
            const cosA = Math.cos(rad);
            const sinA = Math.sin(rad);

            // Rotate dx/dy into wind-aligned frame
            const dParallel = dx * cosA + dy * sinA;   // along wind direction
            const dPerp     = -dx * sinA + dy * cosA;  // across wind direction

            // Elongation factor: faster wind = more elongation (capped at 4×)
            const elongation = Math.min(1 + pt.speed / 10, 4);

            // Compress the parallel axis → points downwind feel "closer"
            dist2 = (dParallel / elongation) ** 2 + dPerp ** 2;
          } else {
            dist2 = dx * dx + dy * dy;
          }

          return { dist2, value: pt.value };
        })
        .sort((a, b) => a.dist2 - b.dist2)
        .slice(0, K);

      // IDW with configurable power p
      // p=2: standard (current), p=3: sharper peaks, less flat-zone bleeding
      let num = 0;
      let den = 0;
      for (const n of neighbours) {
        if (n.dist2 === 0) { num = n.value; den = 1; break; } // exact hit
        const w = 1 / n.dist2 ** (p / 2); // dist2^(p/2) = dist^p
        num += n.value * w;
        den += w;
      }
      grid[row * gridW + col] = den === 0 ? 0 : num / den;
    }
  }
  return grid;
}
```

### 3b. Update callers in `GlobeRenderer.tsx`

Find all calls to `buildIDWGrid` (usually 1 per layer switch). Update as follows:

```typescript
// BEFORE — all layers called like this:
const grid = buildIDWGrid(pixelPoints, 4);

// AFTER — wind layer (with anisotropy):
const grid = buildIDWGrid(windPixelPoints, 8, 3, true);
//                                         K  p  anisotropy=ON

// AFTER — all other layers (temp, AQI, sea temp):
const grid = buildIDWGrid(pixelPoints, 8, 3, false);
//                                      K  p  anisotropy=OFF
```

### 3c. Pass direction and speed into wind pixel points

When building `windPixelPoints` (the array you pass to `buildIDWGrid`), ensure each
point includes `direction` and `speed`:

```typescript
// BEFORE — windPixelPoints likely built like this:
const windPixelPoints = windData.map(pt => ({
  x: toPixelX(pt.lon),
  y: toPixelY(pt.lat),
  value: pt.speed,
}));

// AFTER — add direction and speed fields:
const windPixelPoints = windData.map(pt => ({
  x: toPixelX(pt.lon),
  y: toPixelY(pt.lat),
  value: pt.speed,
  direction: pt.direction, // ← add this
  speed: pt.speed,         // ← add this
}));
```

> `WindPoint` in `src/store/types.ts` already has `{ lat, lon, speed, direction }`,
> so no type changes are needed there.

---

## 4. Change 3 — Improved BFS Grid for 2-D Map

**File:** `src/components/map/MapView2D.tsx`

The 2-D map uses BFS flood-fill + Gaussian blur instead of IDW. Two things change:
1. Tighter grid step (2.5° → 1.5°) — more cells, smaller gaps
2. More blur passes (6 → 8) — compensates for the denser grid needing smoother fill

### 4a. Tighten the grid step in `buildValGrid`

```typescript
// BEFORE — find this constant inside buildValGrid()
const GRID_STEP = 2.5; // degrees

// AFTER
const GRID_STEP = 1.5; // degrees  ← change only this value
```

Grid size after change:
- Before: 145 × 73 = 10,585 cells
- After:  241 × 121 = 29,161 cells (still fast — BFS is O(n) not O(n²))

### 4b. Increase Gaussian blur passes

```typescript
// BEFORE — find the blur loop (runs 6 times)
for (let pass = 0; pass < 6; pass++) {
  gaussianBlur3x3(valGrid, gridW, gridH);
}

// AFTER
for (let pass = 0; pass < 8; pass++) { // ← 6 → 8
  gaussianBlur3x3(valGrid, gridW, gridH);
}
```

> The `gaussianBlur3x3` function itself does not change. Only the pass count increases.
> This prevents the denser grid from looking "speckled" before the BFS fill completes.

### 4c. No other changes to MapView2D.tsx

- Keep `layerColor()` unchanged
- Keep canvas resolution (W/2 × H/2 offscreen) unchanged
- Keep `imageSmoothingQuality = 'high'` unchanged
- Keep alpha = 148 unchanged
- Keep `requestAnimationFrame` loop unchanged

---

## 5. Expected Impact

| Layer | Before | After |
|-------|--------|-------|
| Wind (3-D) | ~550 km flat zones, circular blobs | ~275 km zones, directional streaks along wind bearing |
| Temperature (3-D) | Smooth but coarse, polar regions merge | Finer gradient, mountain/valley contrast visible |
| AQI (3-D) | 1100 km flat zones | ~550 km zones, city clusters more distinct |
| Sea Temp (3-D) | Ocean regions merge into uniform bands | Upwelling zones, currents more visible |
| Wind (2-D) | 2.5° BFS grid, some speckle at zoom | 1.5° grid, smoother at all zoom levels |
| All layers (2-D) | Same blur as before | 2 extra blur passes prevent denser-grid speckle |

---

## 6. API Call Budget After Changes

| Layer | Cold fill before | Cold fill after | Steady state/day after | Free tier limit |
|-------|-----------------|-----------------|------------------------|-----------------|
| Wind | ~284 req | ~1,084 req | ~16 req | 10,000/day ✅ |
| Temperature | ~284 req | ~1,084 req | ~16 req | 10,000/day ✅ |
| AQI | ~76 req | ~304 req | ~16 req | 10,000/day ✅ |
| Sea Temp | ~76 req | ~304 req | ~16 req | 10,000/day ✅ |
| **Total** | **~720 req** | **~2,776 req** | **~64 req/day** | **Well within free tier ✅** |

> Cold fill time increases from ~90 s to ~350 s (batches are 1 s apart to stay under
> 600 req/min). This only happens once per zone per 6 hours, entirely in the background
> via `after()` — users never wait for it.

---

## 7. Do Not Change

These files and values must remain exactly as-is:

```
src/lib/env/zones.ts              — zone boundaries, staggered rotation schedule
src/app/api/env/weather/route.ts  — caching logic, after() pattern
src/app/api/env/aqi/route.ts      — same
src/app/api/env/sea-temp/route.ts — same
src/store/useGlobeStore.ts        — state shape, EnvLayerData interface
src/store/types.ts                — WindPoint, AQIPoint, etc.
```

In `heatmap.utils.ts`, keep these values unchanged:

```typescript
// Keep blur radii exactly as-is — do NOT change these
const BLUR_RADIUS = {
  wind:        14, // px
  temperature: 18, // px
  aqi:         16, // px
  sea_temp:    18, // px
};

// Keep IDW grid resolution unchanged
const IDW_STEP = 8;   // → 256 × 128 grid
```

---

*Last updated: 2026-06-06. Applies to World Impact Monitor codebase.*
