/**
 * Server-side grid interpolator — converts sparse API point data into a
 * dense regular grid using geographic IDW (Inverse Distance Weighting).
 *
 * This runs ONCE per data update on the server (~50-100ms), producing a
 * complete 360x181 grid (1-degree resolution) that clients can bilinearly
 * sample without any CPU-intensive interpolation.
 *
 * Key design choices:
 *   - Geographic distance with cos(lat) correction for longitude
 *   - Antimeridian wrapping handled naturally in degree space
 *   - NaN for cells beyond MAX_INFLUENCE_DEG from nearest data point
 *   - K=8 nearest neighbors, power p=3 for sharp falloff
 */

// Grid dimensions: 1-degree resolution global
export const GRID_W = 360;  // longitude cells: -180 to +179
export const GRID_H = 181;  // latitude cells:  +90 to -90

// Max influence radius in degrees — cells beyond this from nearest data -> NaN
const MAX_INFLUENCE_DEG = 30;
const MAX_INFLUENCE_D2 = MAX_INFLUENCE_DEG * MAX_INFLUENCE_DEG;

export interface GridPoint {
  lat: number;
  lon: number;
  value: number;
}

export interface InterpolatedGrid {
  /** Row-major flat array: grid[row * GRID_W + col]. NaN = no data. */
  values: number[];
  width: number;   // 360
  height: number;  // 181
  latMin: number;  // -90
  latMax: number;  // +90
  lonMin: number;  // -180
  lonMax: number;  // +179
}

/**
 * Pre-interpolate sparse points into a dense 360x181 (1-degree) grid
 * using geographic IDW with cos(lat) correction.
 *
 * Grid layout:
 *   - Row 0 = lat +90 (north pole), Row 180 = lat -90 (south pole)
 *   - Col 0 = lon -180, Col 359 = lon +179
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
  const values = new Array<number>(GRID_W * GRID_H);
  const KMAX = Math.min(K, points.length);

  // If no data points, return all-NaN grid
  if (points.length === 0) {
    values.fill(NaN);
    return { values, width: GRID_W, height: GRID_H, latMin: -90, latMax: 90, lonMin: -180, lonMax: 179 };
  }

  // Pre-compute cos(lat) for each data point (avoid recomputing per cell)
  const ptCosLat = new Float64Array(points.length);
  for (let i = 0; i < points.length; i++) {
    ptCosLat[i] = Math.cos(points[i].lat * Math.PI / 180);
  }

  for (let row = 0; row < GRID_H; row++) {
    // Row 0 = lat +90, Row 180 = lat -90
    const cellLat = 90 - row;
    const cosLat = Math.cos(cellLat * Math.PI / 180);

    for (let col = 0; col < GRID_W; col++) {
      // Col 0 = lon -180, Col 359 = lon +179
      const cellLon = col - 180;

      const bestD = new Float64Array(KMAX).fill(Infinity);
      const bestV = new Float64Array(KMAX);
      let exactVal = NaN;

      for (let i = 0; i < points.length; i++) {
        const dlat = cellLat - points[i].lat;

        // Shortest-path longitude difference (handles antimeridian)
        let dlon = cellLon - points[i].lon;
        if (dlon > 180) dlon -= 360;
        else if (dlon < -180) dlon += 360;

        // cos(lat) correction: average of cell and point latitudes
        const avgCosLat = (cosLat + ptCosLat[i]) * 0.5;
        const dlonCorrected = dlon * avgCosLat;

        const d2 = dlat * dlat + dlonCorrected * dlonCorrected;

        // Exact hit (~0.1 degree)
        if (d2 < 0.01) {
          exactVal = points[i].value;
          break;
        }

        // Insert into K-nearest if closer than worst
        if (d2 < bestD[KMAX - 1]) {
          bestD[KMAX - 1] = d2;
          bestV[KMAX - 1] = points[i].value;
          // Insertion sort ascending
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

      // Max influence check
      if (bestD[0] > MAX_INFLUENCE_D2) {
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
    lonMax: 179,
  };
}

/**
 * Replace NaN values with null for JSON serialization.
 * JSON.stringify converts NaN to null, but we do it explicitly
 * for clarity and to keep the type clean.
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
