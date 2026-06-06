# Batch Size Fix — Stop 429 Rate Limit Errors

> **One-line summary:** Change batch size from 10 → 100 in 3 files.
> This does NOT affect accuracy. It only changes how many coordinates
> are sent per API request. The same 2,701 points are fetched either way.

---

## Files to Change

| File | Change |
|------|--------|
| `src/lib/env/openmeteo.ts` | `BATCH_SIZE = 10` → `100` |
| `src/lib/env/openaq.ts` | `BATCH_SIZE = 10` → `100` |
| `src/lib/env/seatemp.ts` | `BATCH_SIZE = 10` → `100` |

**Nothing else changes. Do not touch any other file.**

---

## The Change (same pattern in all 3 files)

```typescript
// BEFORE — find this in each file (variable may be named batchSize, BATCH_SIZE, chunkSize, etc.)
const BATCH_SIZE = 10;

// AFTER — change the number only
const BATCH_SIZE = 100;
```

If the batch size is not a named constant but is used as a numeric literal inside
a `.slice()` or chunking loop, find the chunk logic and change the number there:

```typescript
// BEFORE — inline literal style
const batches = [];
for (let i = 0; i < points.length; i += 10) {
  batches.push(points.slice(i, i + 10));
}

// AFTER
const batches = [];
for (let i = 0; i < points.length; i += 100) {  // ← 10 → 100
  batches.push(points.slice(i, i + 100));          // ← 10 → 100
}
```

---

## Result After Change

| | Before | After |
|-|--------|-------|
| Requests per zone (wind/temp) | ~270 | ~28 |
| Requests per zone (AQI/SST) | ~76 | ~8 |
| Total cold fill requests | ~1,040 | ~108 |
| Cold fill time | ~5 min | ~30 sec |
| Hits rate limit? | Yes (429) | No |
| Accuracy | Same | Same |
| Daily steady state | ~64 req | ~64 req |

---

## After Applying

Clear the Supabase cache once so the fresh refetch uses the new batch size:

```sql
DELETE FROM env_data_cache
WHERE layer_type LIKE 'wind_zone_%'
   OR layer_type LIKE 'temp_zone_%'
   OR layer_type LIKE 'aqi_zone_%'
   OR layer_type LIKE 'sea_zone_%';
```

Then load any layer in the browser. Cold fill will complete in ~30 seconds
instead of 5 minutes, with no 429 errors.

---

*Last updated: 2026-06-06*
