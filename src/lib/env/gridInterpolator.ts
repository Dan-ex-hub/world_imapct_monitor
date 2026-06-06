/**
 * Server-side grid interpolator — converts sparse API point data into a
 * dense regular grid using geographic IDW (Inverse Distance Weighting).
 *
 * PERFORMANCE-OPTIMIZED for Vercel serverless:
 *   - Pre-allocated typed arrays (no per-cell allocations)
 *   - Pre-computed cos(lat) for all data points
 *   - Early-exit for exact hits
 *   - Runs in ~200-500ms for ~2,800 points on a Vercel function
 *
 * Key design choices:
 *   - Geographic distance with cos(lat) correction for longitude
 *   - Antimeridian wrapping handled naturally in degree space
 *   - NaN for cells beyond MAX_INFLUENCE_DEG from nearest data point
 *   - K=8 nearest neighbors, power p=3 for sharp falloff
 */

// Grid dimensions: 2-degree resolution global (smaller grid = faster computation)
export const GRID_W = 180;  // longitude cells: -180 to +178, step=2
export const GRID_H = 91;   // latitude cells:  +90 to -90,  step=2

// Max influence radius in degrees
const MAX_INFLUENCE_DEG = 30;
const MAX_INFLUENCE_D2 = MAX_INFLUENCE_DEG * MAX_INFLUENCE_DEG;

export interface GridPoint {
  lat: number;
  lon: number;
  value: number;
}

export interface InterpolatedGrid {
  /** Row-major flat array: grid[row * width + col]. NaN = no data. */
  values: number[];
  width: number;
  height: number;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

/**
 * Pre-interpolate sparse points into a dense grid using geographic IDW.
 *
 * Grid layout (2-degree resolution):
 *   - Row 0 = lat +90 (north pole), last row = lat -90 (south pole)
 *   - Col 0 = lon -180, last col = lon +178
 *
 * @param points - Sparse data points with lat, lon, value
 * @param K      - Number of nearest neighbors (default 8)
 * @param p      - IDW power parameter (default 3)
 * @returns InterpolatedGrid with the dense value array
 */
export function interpolateToGrid(
  points: GridPoint[],
  K = 8,
  p = 3,
): InterpolatedGrid {
  const totalCells = GRID_W * GRID_H;
  const values = new Array<number>(totalCells);
  const KMAX = Math.min(K, points.length);
  const nPts = points.length;

  // If no data points, return all-NaN grid
  if (nPts === 0) {
    values.fill(NaN);
    return { values, width: GRID_W, height: GRID_H, latMin: -90, latMax: 90, lonMin: -180, lonMax: 178 };
  }

  // Pre-extract into flat typed arrays for cache-friendly access
  const pLat = new Float64Array(nPts);
  const pLon = new Float64Array(nPts);
  const pVal = new Float64Array(nPts);
  const pCosLat = new Float64Array(nPts);
  for (let i = 0; i < nPts; i++) {
    pLat[i] = points[i].lat;
    pLon[i] = points[i].lon;
    pVal[i] = points[i].value;
    pCosLat[i] = Math.cos(points[i].lat * Math.PI / 180);
  }

  // Pre-allocate K-nearest arrays ONCE (reused per cell)
  const bestD = new Float64Array(KMAX);
  const bestV = new Float64Array(KMAX);
  const DEG_TO_RAD = Math.PI / 180;
  const LON_STEP = 360 / GRID_W;  // 2 degrees per column
  const LAT_STEP = 180 / (GRID_H - 1);  // 2 degrees per row

  for (let row = 0; row < GRID_H; row++) {
    const cellLat = 90 - row * LAT_STEP;
    const cosLat = Math.cos(cellLat * DEG_TO_RAD);

    for (let col = 0; col < GRID_W; col++) {
      const cellLon = -180 + col * LON_STEP;

      // Reset K-nearest
      bestD.fill(Infinity);
      let exactVal = NaN;

      for (let i = 0; i < nPts; i++) {
        const dlat = cellLat - pLat[i];

        // Quick bounding-box reject: if |dlat| alone exceeds max, skip
        if (dlat > MAX_INFLUENCE_DEG || dlat < -MAX_INFLUENCE_DEG) continue;

        let dlon = cellLon - pLon[i];
        if (dlon > 180) dlon -= 360;
        else if (dlon < -180) dlon += 360;

        const avgCosLat = (cosLat + pCosLat[i]) * 0.5;
        const dlonCorrected = dlon * avgCosLat;

        const d2 = dlat * dlat + dlonCorrected * dlonCorrected;

        if (d2 < 0.01) {
          exactVal = pVal[i];
          break;
        }

        // Skip if beyond max influence (cheap early exit)
        if (d2 > MAX_INFLUENCE_D2) continue;

        if (d2 < bestD[KMAX - 1]) {
          bestD[KMAX - 1] = d2;
          bestV[KMAX - 1] = pVal[i];
          for (let j = KMAX - 1; j > 0 && bestD[j] < bestD[j - 1]; j--) {
            let tmp = bestD[j]; bestD[j] = bestD[j - 1]; bestD[j - 1] = tmp;
            tmp = bestV[j]; bestV[j] = bestV[j - 1]; bestV[j - 1] = tmp;
          }
        }
      }

      const idx = row * GRID_W + col;

      if (!isNaN(exactVal)) {
        values[idx] = exactVal;
        continue;
      }

      if (bestD[0] === Infinity) {
        values[idx] = NaN;
        continue;
      }

      // IDW weighted average
      let sumW = 0, sumWV = 0;
      for (let k = 0; k < KMAX; k++) {
        if (bestD[k] === Infinity) break;
        const w = 1 / bestD[k] ** (p / 2);
        sumW += w;
        sumWV += w * bestV[k];
      }
      values[idx] = sumW > 0 ? sumWV / sumW : NaN;
    }
  }

  return {
    values,
    width: GRID_W,
    height: GRID_H,
    latMin: -90,
    latMax: 90,
    lonMin: -180,
    lonMax: 178,
  };
}

/**
 * Replace NaN values with null for JSON serialization.
 * Also rounds to 2 decimal places to reduce payload size.
 */
export function gridToJSON(grid: InterpolatedGrid): {
  values: (number | null)[];
  width: number;
  height: number;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
} {
  return {
    width: grid.width,
    height: grid.height,
    latMin: grid.latMin,
    latMax: grid.latMax,
    lonMin: grid.lonMin,
    lonMax: grid.lonMax,
    values: grid.values.map(v => isNaN(v) ? null : Math.round(v * 100) / 100),
  };
}
