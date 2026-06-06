/**
 * Heatmap texture generation — IDW scalar field interpolation
 *
 * APPROACH (same as Windy, Copernicus, NOAA):
 *   1. Build a coarse value grid using Inverse Distance Weighting (IDW)
 *      interpolation from the sparse data points.
 *   2. Map each interpolated value through an absolute colour scale.
 *   3. Write RGBA pixels directly into an ImageData buffer — no canvas
 *      compositing, no alpha blending between blobs.  Each pixel gets exactly
 *      the colour matching its interpolated value.
 *   4. Apply a single Gaussian blur pass on the 3-wide tiled canvas to
 *      smooth the field without introducing seams at lon = ±180.
 *
 * This means:
 *   - 11 m/s wind → teal/green, NOT purple
 *   - 37°C        → red/orange
 *   - AQI 159     → red
 *   - No colour mixing from overlapping blobs (there are no blobs)
 *
 * COORDINATE SYSTEM (equirectangular, Three.js SphereGeometry UV):
 *   pixel x = (lon + 180) / 360 * W
 *   pixel y = (90  - lat) / 180 * H
 */

import type {
  WindPoint,
  TempAnomalyPoint,
  AQIPoint,
  SeaTempPoint,
  EnvLayerData,
} from "@/store/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 2048; // texture width  (equirectangular)
const H = 1024; // texture height

/**
 * IDW grid resolution — we compute the interpolated value on a downsampled
 * grid, then upsample with bilinear interpolation for smooth output.
 *
 * IDW_STEP = 8  →  256×128 = 32,768 cells
 * With ~2800 wind points: 32,768 × 2800 = ~92M ops — fast enough for a
 * one-time texture build on modern hardware (~200ms).
 * K = 4 nearest neighbours is sufficient for smooth IDW on a regular grid.
 */
const IDW_STEP = 8; // pixel downsampling factor
const IDW_GW = Math.ceil(W / IDW_STEP) + 1; // +1 so bilinear can always read [gx+1]
const IDW_GH = Math.ceil(H / IDW_STEP) + 1;

// ─── Colour helpers ───────────────────────────────────────────────────────────

function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function gradientColor(
  t: number,
  stops: [number, number, number][],
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const seg = clamped * (stops.length - 1);
  const idx = Math.min(Math.floor(seg), stops.length - 2);
  return lerp3(stops[idx], stops[idx + 1], seg - idx);
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────

/** lat/lon → full-res pixel (clamped so ghost points outside ±180/±90 stay on canvas) */
function toPixel(lat: number, lon: number): [number, number] {
  const clampedLon = Math.max(-180, Math.min(180, lon));
  const clampedLat = Math.max(-90, Math.min(90, lat));
  return [((clampedLon + 180) / 360) * W, ((90 - clampedLat) / 180) * H];
}

// ─── IDW interpolation ────────────────────────────────────────────────────────

/**
 * Extended point type that carries optional wind direction & speed
 * for anisotropic distance weighting on the wind layer.
 */
interface IDWPoint {
  px: number;
  py: number;
  value: number;
  /** Meteorological degrees (0=N, 90=E, 180=S, 270=W) — wind layer only */
  direction?: number;
  /** m/s — higher speed = more elongation along wind axis */
  speed?: number;
}

/**
 * Build a W/IDW_STEP × H/IDW_STEP Float32Array of interpolated values using
 * Inverse Distance Weighting.
 *
 * Key fixes:
 *   - Longitudinal wrapping: dx uses shortest-path distance across the
 *     texture seam at x=0 / x=W (the antimeridian, lon=±180°) so points
 *     near the boundary correctly influence each other.
 *   - Max influence radius: grid cells farther than ~30° from the nearest
 *     data point are set to NaN (rendered transparent) to prevent nonsensical
 *     extrapolation when only partial zone data is loaded.
 *   - Power p=3: sharper falloff, less blobbing vs. p=2.
 *   - K=8: more neighbours for smoother field.
 *   - Wind anisotropy: when useAnisotropy=true the distance metric is
 *     stretched along the wind bearing.
 */

// Max influence radius in full-res pixels (~30° longitude ≈ 170 px on a 2048-wide texture)
const MAX_INFLUENCE_PX = Math.round(W * 30 / 360); // ~170 px
const MAX_INFLUENCE_D2 = MAX_INFLUENCE_PX * MAX_INFLUENCE_PX;

function buildIDWGrid(
  points: IDWPoint[],
  K = 8,
  p = 3,
  useAnisotropy = false,
): Float32Array {
  const grid = new Float32Array(IDW_GW * IDW_GH);
  const KMAX = Math.min(K, points.length);

  // If there are no data points at all, return an all-NaN grid
  if (points.length === 0) {
    grid.fill(NaN);
    return grid;
  }

  for (let gy = 0; gy < IDW_GH; gy++) {
    for (let gx = 0; gx < IDW_GW; gx++) {
      const cx = gx * IDW_STEP;
      const cy = gy * IDW_STEP;

      const bestD = new Float32Array(KMAX).fill(Infinity);
      const bestV = new Float32Array(KMAX);
      let exactVal = NaN;

      for (let i = 0; i < points.length; i++) {
        // ── Wraparound-aware dx ──────────────────────────────
        // Use the shorter of the direct or wrap-around distance
        // so the antimeridian (lon=±180°) doesn't create a seam.
        let dx = cx - points[i].px;
        if (dx > W / 2) dx -= W;
        else if (dx < -W / 2) dx += W;

        const dy = cy - points[i].py;

        let d2: number;

        if (
          useAnisotropy &&
          points[i].direction !== undefined &&
          points[i].speed !== undefined &&
          (points[i].speed as number) > 1
        ) {
          // Anisotropic distance: elongate influence ellipse along wind bearing
          const rad = ((270 - (points[i].direction as number)) * Math.PI) / 180;
          const cosA = Math.cos(rad);
          const sinA = Math.sin(rad);

          const dParallel = dx * cosA + dy * sinA;
          const dPerp     = -dx * sinA + dy * cosA;

          const elongation = Math.min(1 + (points[i].speed as number) / 10, 4);

          d2 = (dParallel / elongation) ** 2 + dPerp ** 2;
        } else {
          d2 = dx * dx + dy * dy;
        }

        if (d2 < 1) {
          exactVal = points[i].value;
          break;
        }

        if (d2 < bestD[KMAX - 1]) {
          bestD[KMAX - 1] = d2;
          bestV[KMAX - 1] = points[i].value;
          for (let j = KMAX - 1; j > 0 && bestD[j] < bestD[j - 1]; j--) {
            let tmp = bestD[j];
            bestD[j] = bestD[j - 1];
            bestD[j - 1] = tmp;
            tmp = bestV[j];
            bestV[j] = bestV[j - 1];
            bestV[j - 1] = tmp;
          }
        }
      }

      if (!isNaN(exactVal)) {
        grid[gy * IDW_GW + gx] = exactVal;
        continue;
      }

      // ── Max influence check ────────────────────────────────
      // If the nearest data point is beyond ~30°, mark as no-data
      if (bestD[0] > MAX_INFLUENCE_D2) {
        grid[gy * IDW_GW + gx] = NaN;
        continue;
      }

      // IDW with power p (p=3: sharper peaks, less flat-zone bleeding)
      let sumW = 0,
        sumWV = 0;
      for (let k = 0; k < KMAX; k++) {
        if (bestD[k] === Infinity) break;
        const w = 1 / bestD[k] ** (p / 2);
        sumW += w;
        sumWV += w * bestV[k];
      }
      grid[gy * IDW_GW + gx] = sumW > 0 ? sumWV / sumW : NaN;
    }
  }

  return grid;
}

// ─── Raster rendering ─────────────────────────────────────────────────────────

/**
 * Convert an IDW value grid into full-resolution RGBA using bilinear
 * interpolation between grid cells — avoids the blocky nearest-neighbour
 * artefacts that would otherwise show at IDW_STEP=8.
 */
function renderGrid(
  grid: Float32Array,
  colorFn: (v: number) => [number, number, number],
): ImageData {
  const imgData = new ImageData(W, H);
  const buf = imgData.data;

  for (let py = 0; py < H; py++) {
    const fy = py / IDW_STEP;
    const gy0 = Math.min(Math.floor(fy), IDW_GH - 2);
    const gy1 = gy0 + 1;
    const ty = fy - gy0;

    for (let px = 0; px < W; px++) {
      const fx = px / IDW_STEP;
      const gx0 = Math.min(Math.floor(fx), IDW_GW - 2);
      const gx1 = gx0 + 1;
      const tx = fx - gx0;

      // Bilinear blend of the four surrounding IDW cells
      const v00 = grid[gy0 * IDW_GW + gx0];
      const v10 = grid[gy0 * IDW_GW + gx1];
      const v01 = grid[gy1 * IDW_GW + gx0];
      const v11 = grid[gy1 * IDW_GW + gx1];

      // If ANY corner is NaN (no data), make this pixel transparent.
      // This prevents color bleeding from data regions into no-data areas.
      if (isNaN(v00) || isNaN(v10) || isNaN(v01) || isNaN(v11)) {
        // Leave pixel at [0,0,0,0] — fully transparent
        continue;
      }

      const val =
        v00 * (1 - tx) * (1 - ty) +
        v10 * tx * (1 - ty) +
        v01 * (1 - tx) * ty +
        v11 * tx * ty;

      const [r, g, b] = colorFn(val);
      const i = (py * W + px) * 4;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 215;
    }
  }

  return imgData;
}

// ─── Seam-safe blur ───────────────────────────────────────────────────────────

/**
 * Tile the canvas 3-wide before blurring so the Gaussian kernel has real
 * neighbour data at the lon=±180 seam.  Only the centre tile is returned.
 */
function blurSeamless(
  src: HTMLCanvasElement,
  blurPx: number,
): HTMLCanvasElement {
  // Build 3-wide tiled canvas
  const tiled = document.createElement("canvas");
  tiled.width = W * 3;
  tiled.height = H;
  const tc = tiled.getContext("2d")!;
  tc.drawImage(src, 0, 0); // left tile
  tc.drawImage(src, W, 0); // centre tile
  tc.drawImage(src, W * 2, 0); // right tile

  // Blur
  const blurred = document.createElement("canvas");
  blurred.width = W * 3;
  blurred.height = H;
  const bc = blurred.getContext("2d")!;
  bc.filter = `blur(${blurPx}px)`;
  bc.drawImage(tiled, 0, 0);
  bc.filter = "none";

  // Crop centre tile
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  out.getContext("2d")!.drawImage(blurred, W, 0, W, H, 0, 0, W, H);
  return out;
}

// ─── Heatmap pipelines ────────────────────────────────────────────────────────

/**
 * Standard heatmap pipeline (temp, AQI, sea-temp).
 * K=8, p=3, anisotropy=OFF.
 */
function makeHeatmap(
  rawPoints: { lat: number; lon: number; value: number }[],
  colorFn: (v: number) => [number, number, number],
  blurPx: number,
): HTMLCanvasElement {
  if (!rawPoints.length) return document.createElement("canvas");

  const points = rawPoints.map((p) => {
    const [px, py] = toPixel(p.lat, p.lon);
    return { px, py, value: p.value };
  });

  const grid = buildIDWGrid(points, 8, 3, false);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(renderGrid(grid, colorFn), 0, 0);

  return blurSeamless(canvas, blurPx);
}

/**
 * Wind-specific heatmap pipeline with anisotropic IDW.
 * K=8, p=3, anisotropy=ON — influence stretches downwind.
 */
function makeWindHeatmap(
  rawPoints: { lat: number; lon: number; value: number; direction: number; speed: number }[],
  colorFn: (v: number) => [number, number, number],
  blurPx: number,
): HTMLCanvasElement {
  if (!rawPoints.length) return document.createElement("canvas");

  const points: IDWPoint[] = rawPoints.map((p) => {
    const [px, py] = toPixel(p.lat, p.lon);
    return { px, py, value: p.value, direction: p.direction, speed: p.speed };
  });

  const grid = buildIDWGrid(points, 8, 3, true);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(renderGrid(grid, colorFn), 0, 0);

  return blurSeamless(canvas, blurPx);
}

// ─── Colour scales (all absolute, not dataset-relative) ───────────────────────
//
// Each scale uses physically meaningful fixed breakpoints so the colour at
// every pixel matches what you'd see on Windy / NOAA / Copernicus.

// Wind: 0 → 38 m/s   (Beaufort-based)
export const WIND_STOPS: [number, number, number][] = [
  [20, 60, 220], //  0 m/s – deep blue (calm)
  [0, 160, 255], //  5 m/s – sky blue
  [0, 210, 180], // 10 m/s – teal
  [80, 220, 50], // 15 m/s – yellow-green
  [255, 230, 0], // 20 m/s – yellow
  [255, 140, 0], // 25 m/s – orange
  [240, 40, 20], // 30 m/s – red
  [140, 0, 180], // 38 m/s – purple (hurricane)
];
export const WIND_MAX = 38;

// Temperature: -40 → 45°C  (ERA5/Windy palette)
export const TEMP_STOPS: [number, number, number][] = [
  [100, 0, 200], // -40°C – deep violet
  [0, 40, 230], // -20°C – blue
  [30, 120, 255], // -10°C – cornflower
  [140, 200, 255], //  -2°C – ice blue
  [230, 240, 255], //   5°C – near-white
  [255, 250, 180], //  15°C – pale yellow
  [255, 180, 40], //  25°C – amber
  [255, 60, 0], //  35°C – red-orange
  [180, 0, 0], //  45°C – deep red
];
export const TEMP_MIN = -40;
export const TEMP_RANGE = 85; // 45 - (-40)

// AQI: 0 → 500  (US EPA absolute breakpoints)
export const AQI_STOPS: [number, number, number][] = [
  [0, 228, 0], //   0 – Good
  [255, 255, 0], // 100 – Moderate
  [255, 126, 0], // 200 – Unhealthy for Sensitive
  [255, 0, 0], // 300 – Unhealthy
  [143, 63, 151], // 400 – Very Unhealthy
  [126, 0, 35], // 500 – Hazardous
];
export const AQI_MAX = 500;

// Sea temperature: -2 → 32°C  (NOAA/Copernicus)
export const SEA_STOPS: [number, number, number][] = [
  [200, 230, 255], // -2°C – icy pale blue
  [0, 60, 200], //  2°C – deep blue
  [0, 140, 230], //  8°C – medium blue
  [0, 210, 210], // 14°C – cyan
  [0, 200, 120], // 18°C – teal-green
  [80, 210, 0], // 22°C – green-yellow
  [255, 220, 0], // 26°C – yellow
  [255, 120, 0], // 29°C – orange
  [220, 10, 10], // 32°C – red
];
export const SEA_MIN = -2;
export const SEA_RANGE = 34; // 32 - (-2)

// ─── Public exports ───────────────────────────────────────────────────────────

export function createWindHeatmap(data: WindPoint[]): HTMLCanvasElement {
  return makeWindHeatmap(
    data.map((p) => ({ lat: p.lat, lon: p.lon, value: p.speed, direction: p.direction, speed: p.speed })),
    (v) => gradientColor(Math.max(0, v) / WIND_MAX, WIND_STOPS),
    14,
  );
}

export function createTempAnomalyHeatmap(
  data: TempAnomalyPoint[],
): HTMLCanvasElement {
  return makeHeatmap(
    data.map((p) => ({ lat: p.lat, lon: p.lon, value: p.anomalyC })),
    (v) => gradientColor(Math.max(0, v - TEMP_MIN) / TEMP_RANGE, TEMP_STOPS),
    18,
  );
}

export function createAQIHeatmap(data: AQIPoint[]): HTMLCanvasElement {
  return makeHeatmap(
    data.map((p) => ({ lat: p.lat, lon: p.lon, value: p.aqi })),
    (v) => gradientColor(Math.max(0, v) / AQI_MAX, AQI_STOPS),
    16,
  );
}

export function createSeaTempHeatmap(data: SeaTempPoint[]): HTMLCanvasElement {
  return makeHeatmap(
    data.map((p) => ({ lat: p.lat, lon: p.lon, value: p.tempC })),
    (v) => gradientColor(Math.max(0, v - SEA_MIN) / SEA_RANGE, SEA_STOPS),
    18,
  );
}

// ─── Nearest-point lookup (hover tooltip) ────────────────────────────────────

function dist2(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dlat = lat1 - lat2;
  const dlon = lon1 - lon2;
  return dlat * dlat + dlon * dlon;
}

export function findNearestWindPoint(
  data: WindPoint[],
  lat: number,
  lon: number,
): WindPoint | null {
  if (!data.length) return null;
  let best = data[0],
    bestD = dist2(lat, lon, best.lat, best.lon);
  for (let i = 1; i < data.length; i++) {
    const d = dist2(lat, lon, data[i].lat, data[i].lon);
    if (d < bestD) {
      bestD = d;
      best = data[i];
    }
  }
  return best;
}

export function findNearestTempPoint(
  data: TempAnomalyPoint[],
  lat: number,
  lon: number,
): TempAnomalyPoint | null {
  if (!data.length) return null;
  let best = data[0],
    bestD = dist2(lat, lon, best.lat, best.lon);
  for (let i = 1; i < data.length; i++) {
    const d = dist2(lat, lon, data[i].lat, data[i].lon);
    if (d < bestD) {
      bestD = d;
      best = data[i];
    }
  }
  return best;
}

export function findNearestAQIPoint(
  data: AQIPoint[],
  lat: number,
  lon: number,
): AQIPoint | null {
  if (!data.length) return null;
  let best = data[0],
    bestD = dist2(lat, lon, best.lat, best.lon);
  for (let i = 1; i < data.length; i++) {
    const d = dist2(lat, lon, data[i].lat, data[i].lon);
    if (d < bestD) {
      bestD = d;
      best = data[i];
    }
  }
  return best;
}

export function findNearestSeaTempPoint(
  data: SeaTempPoint[],
  lat: number,
  lon: number,
): SeaTempPoint | null {
  if (!data.length) return null;
  let best = data[0],
    bestD = dist2(lat, lon, best.lat, best.lon);
  for (let i = 1; i < data.length; i++) {
    const d = dist2(lat, lon, data[i].lat, data[i].lon);
    if (d < bestD) {
      bestD = d;
      best = data[i];
    }
  }
  return best;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function createHeatmapTexture(
  layerType: string,
  layerData: EnvLayerData | null,
): HTMLCanvasElement | null {
  if (!layerData) return null;
  switch (layerType) {
    case "wind":
      return layerData.wind?.length ? createWindHeatmap(layerData.wind) : null;
    case "temperature_anomaly":
      return layerData.tempAnomalies?.length
        ? createTempAnomalyHeatmap(layerData.tempAnomalies)
        : null;
    case "aqi":
      return layerData.aqi?.length ? createAQIHeatmap(layerData.aqi) : null;
    case "sea_temp":
      return layerData.seaTemp?.length
        ? createSeaTempHeatmap(layerData.seaTemp)
        : null;
    default:
      return null;
  }
}
