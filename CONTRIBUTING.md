# Contributing to ImpactGlobe

Thanks for considering a contribution! This doc covers how to get the project
running locally, how it's structured, and the recipe for adding a new
environmental data layer (the most common type of contribution).

## Getting started

**Prerequisites:** Node.js 20+, npm, a free [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/Dan-ex-hub/world_imapct_monitor.git
cd world_imapct_monitor
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

Fill in `.env.local`. At minimum you need the three `NEXT_PUBLIC_SUPABASE_*` /
`SUPABASE_SERVICE_ROLE_KEY` values — everything else is optional and degrades
gracefully (e.g. no `TWELVE_DATA_API_KEY` just means the Markets panel shows
an empty state instead of crashing). See the comments in `.env.example` for
where to get each key.

Then, in the Supabase SQL Editor, run:
1. `supabase-schema.sql` — creates `events`, `forex_cache`, `env_data_cache`, etc.
2. `update-env-cache-schema.sql` — updates the `layer_type` CHECK constraint
   the environmental caching relies on.

```bash
npm run dev       # http://localhost:3000
npm run lint      # eslint
npx tsc --noEmit  # typecheck
```

In development, the app self-triggers a cron heartbeat (`/api/cron/heartbeat`)
every 60s to simulate the Vercel cron schedule defined in `vercel.json`. You
don't need to configure anything for this locally.

## Project structure

```
src/
  app/                 Next.js App Router — pages + API routes (src/app/api/**)
  components/
    globe/             Three.js 3D globe (GlobeRenderer, heatmap texture pipeline, wind particles)
    map/               Leaflet 2D map (reuses the globe's heatmap texture for visual parity)
    layout/            Header, right rail, view toggle, app shell
    ui/                Panels, badges, modal, ticker, playback controls
  hooks/               Data-fetching + derived-state hooks (useEnvLayer, useDisplayEvents, ...)
  lib/
    constants.ts       Single source of truth: impact colors, env layer metadata, categories
    env/               Fetchers + IDW grid interpolation for wind/AQI/sea-temp/quakes/fires/storms
    forex/, gemini/, news/, rss/, supabase/, geo/, utils/
  store/               Zustand store + shared domain types (types.ts)
```

**`src/lib/constants.ts` is the single source of truth** for anything
cross-cutting (impact level colors, environmental layer metadata/icons,
category lists, the "valid coordinate" guard). If you're duplicating a color
map or a magic list somewhere else, it probably belongs here instead.

## Important design constraints (read before touching `lib/env/*`)

The environmental data pipeline (wind, temperature, AQI, sea temperature) has
a non-obvious constraint that has caused real bugs before: **Open-Meteo bills
every coordinate in a request as one API call**, with a 600/min hard limit.

Because of this:
- Fetchers in `lib/env/*` do a single **throttled global pass** (batches of
  ~100 coordinates, ~12s apart) rather than fetching per-zone in parallel.
  Fetching multiple zones concurrently *will* trip HTTP 429 and silently
  corrupt the cache with partial coverage (this happened — see the fix in
  `openmeteo.ts`/`openaq.ts`/`seatemp.ts`).
- These fetches **never run on the request path**. API routes serve whatever
  is cached in Supabase and kick off a background refresh (`after()`) when
  stale. Don't add a code path that calls `fetchGlobal*()` synchronously from
  a route handler.
- The `env_data_cache` table has a `layer_type` CHECK constraint
  (`update-env-cache-schema.sql`). If you add a new cache key, either match an
  allowed value or update the constraint — otherwise the write fails silently.

## Adding a new environmental layer

This is the most common contribution. Recipe, using an existing layer as a
template:

1. **Fetcher** — add `lib/env/yourSource.ts` following the throttled
   global-pass pattern in `openmeteo.ts` (or the zone-based pattern in
   `usgs.ts`/`eonet.ts` for point-event data like quakes/fires that don't hit
   per-coordinate rate limits).
2. **API route** — add `app/api/env/your-layer/route.ts`. For continuous
   fields, mirror `weather/route.ts` (cache-first, background refresh). For
   discrete events, mirror `earthquakes/route.ts`.
3. **Type** — add the point/data shape to `store/types.ts`, and extend
   `EnvLayerData`/`EnvLayerType`.
4. **Metadata** — register the layer in `ENV_LAYER_META` in
   `lib/constants.ts` (icon, accent color, source label, `kind:
   'heatmap' | 'markers'`), and add it to `ENV_LAYER_ORDER`.
5. **Color scale** (heatmap layers only) — add stops + min/max to
   `components/globe/heatmap.utils.ts` and a case in `createHeatmapTexture()`.
6. **Fetch hook** — map the layer to its API path in
   `hooks/useEnvLayer.ts`.

The 3D globe, 2D map, tooltip, and right-rail panel all key off
`activeEnvLayer` + `ENV_LAYER_META`, so a correctly registered layer should
"just work" across every view without touching rendering code.

## Pull requests

- Keep PRs focused — one feature/fix per PR.
- Run `npx tsc --noEmit` and `npm run lint` before opening the PR (CI runs
  these too, but faster feedback locally is nicer for everyone).
- Describe what changed and why in the PR description; link the issue if
  there is one.
- UI changes: a before/after screenshot or short clip helps a lot for a
  visualization-heavy project like this one.

## Reporting bugs / requesting features

Please use the issue templates (Bug Report / Feature Request) — they ask for
the context that's usually needed to reproduce or scope the work anyway.

## Code of Conduct

Be respectful and constructive. Standard open-source etiquette applies.
