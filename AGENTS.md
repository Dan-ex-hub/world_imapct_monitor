# AGENTS.md — ImpactGlobe Autonomous Build Instructions

## IDENTITY & MISSION

You are the sole engineer building **ImpactGlobe** — a real-time 3D interactive globe web application that displays:
- Impactful global news events as animated red ripple waves on affected countries, with AI-generated forex pair impact analysis per event
- Live environmental data layers: weather anomalies, wind patterns, air quality index, sea surface temperatures, wildfire hotspots, and more — all sourced from **free public APIs**

This is a **100% free product** — no payments, no paywalls, no Stripe. All features are available to all users. Optional accounts allow watchlists and push notifications.

You have full autonomy. Build everything. Do not ask the user for permission before taking actions. Do not stop and ask clarifying questions mid-phase. Make the best technical decision, document it with a one-line comment, and move forward. If a decision has genuine tradeoffs, pick the better one for a solo-founder SaaS and continue.

**When you start a session:** Read this entire file first. Check what phase you are on by reading `BUILD_STATE.md` in the project root (create it if it doesn't exist). Then continue exactly where the build left off. Never redo work that is already done.

---

## OPERATING RULES — READ BEFORE EVERY ACTION

1. **Go deep, not shallow.** When implementing any feature, implement it completely. No stubs, no `// TODO`, no placeholder data that isn't replaced.
2. **Verify before moving on.** After each task, run `npm run build`. Fix errors before proceeding.
3. **Write the actual file.** Create complete files with all imports, all logic, all edge cases handled.
4. **Update BUILD_STATE.md** after every completed task.
5. **Never break existing functionality.** Run build after each change. Fix immediately if broken.
6. **Install packages silently.** Use `npm install --save`.
7. **Environment variables.** All secrets go in `.env.local`. Create `.env.example` with same keys but empty values.
8. **Git commits.** After each phase: `git add -A && git commit -m "feat: [phase name] complete"`.

---

## PROJECT OVERVIEW

### What ImpactGlobe is
A real-time web app where:
- A 3D globe renders in the center with animated ripple waves on news event locations
- Environmental data layers can be toggled: wind, AQI, temperature anomaly, sea surface temp, wildfires, storms
- Clicking a wave opens a modal with news breakdown + forex pair impact analysis
- A right sidebar shows the top 5 most-moved forex pairs right now
- A bottom ticker scrolls live headlines
- An environmental data panel shows global stats for the active layer
- Users can filter, search, create watchlists (free, account required), and replay the last 48 hours

### Design language
- Dark theme only. Space-like. Professional fintech/data aesthetic.
- Background: `#050a14`. Surface: `#0a0e1a`. Card: `#0f1628`
- Impact colors: Critical=`#e24b4a` High=`#ef9f27` Medium=`#1d9e75` Low=`#378add`
- Environmental colors: Wind=`#00d4ff` AQI=`#ff6b35` Temp=`#ff4757` Sea=`#2ed573` Fire=`#ffa502`
- Text: Primary=`#f1f0e8` Secondary=`#b4b2a9` Muted=`#6b6a63`
- Font: Space Grotesk (display) + DM Sans (body) via Google Fonts

### Tech stack (non-negotiable)
- **Framework:** Next.js 14 with App Router
- **Globe:** Three.js (loaded dynamically, no SSR)
- **Styling:** Tailwind CSS with custom dark theme config
- **State:** Zustand
- **Database:** Supabase (Postgres + Auth + Realtime) — free tier
- **AI:** Anthropic Codex API (`Codex-sonnet-4-20250514`)
- **Forex data:** Twelve Data API (free tier)
- **Environmental data:** All free APIs (detailed below)
- **Hosting target:** Vercel (free tier)

---

## FREE ENVIRONMENTAL DATA APIs

All of these are free with no credit card required. Use them in the order listed.

### 1. Open-Meteo (Weather + Climate)
- **URL:** `https://api.open-meteo.com/v1/`
- **No API key required**
- **Endpoints used:**
  - `/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation&current_weather=true`
  - `/climate-api?latitude={lat}&longitude={lon}&start_date={}&end_date={}&daily=temperature_2m_max_anomaly`
- **Globe layer:** Temperature anomaly heatmap, wind direction/speed overlay, precipitation

### 2. OpenAQ (Air Quality Index)
- **URL:** `https://api.openaq.org/v2/`
- **No API key required for basic access**
- **Endpoints used:**
  - `/latest?limit=1000&country={iso}&parameter=pm25`
  - `/locations?limit=100&coordinates={lat},{lon}&radius=50000`
- **Globe layer:** PM2.5 / AQI hotspots as colored markers

### 3. NASA EONET (Natural Events / Wildfires / Storms)
- **URL:** `https://eonet.gsfc.nasa.gov/api/v3/`
- **No API key required**
- **Endpoints used:**
  - `/events?status=open&limit=50` — active natural events
  - `/events?category=wildfires` — fire events
  - `/events?category=severeStorms` — storm events
- **Globe layer:** Fire/storm markers with animated icons

### 4. NOAA Weather Alerts
- **URL:** `https://api.weather.gov/alerts/active`
- **No API key required**
- **Globe layer:** US-region severe weather warnings

### 5. World Bank Climate Data
- **URL:** `https://climateknowledgeportal.worldbank.org/api/data/`
- **Free, no key**
- **Use for:** Country-level climate stats panel

### 6. Copernicus Marine Service (Sea Surface Temperature)
- **URL:** `https://nrt.cmems-du.eu/thredds/` (WMS tiles, free)
- **Or use:** `https://coastwatch.pfeg.noaa.gov/erddap/griddap/` (NOAA ERDDAP, free)
- **Globe layer:** Sea surface temperature overlay (PNG tiles projected onto sphere)

### 7. USGS Earthquake Feed
- **URL:** `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/`
- **No API key required**
- **Endpoints:**
  - `significant_week.geojson` — significant earthquakes last 7 days
  - `2.5_day.geojson` — all M2.5+ earthquakes last 24h
- **Globe layer:** Earthquake markers with magnitude-scaled circles

---

## PHASE 0 — Foundation & Project Setup

**Goal:** A clean, running Next.js project with all dependencies installed, all configs set, Supabase connected, and the folder structure created. No product code yet — just infrastructure.

### Task 0.1 — Initialize Next.js project

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

### Task 0.2 — Install all dependencies

```bash
npm install three @types/three zustand @supabase/supabase-js @supabase/ssr \
  @anthropic-ai/sdk swr axios \
  web-push geojson-utils date-fns clsx tailwind-merge \
  lucide-react recharts rss-parser d3-scale d3-interpolate
```

```bash
npm install -D @types/three @types/web-push prettier prettier-plugin-tailwindcss \
  @typescript-eslint/eslint-plugin
```

### Task 0.3 — Configure Tailwind

Replace `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#050a14',
          surface: '#0a0e1a',
          card: '#0f1628',
          elevated: '#141c2e',
        },
        impact: {
          critical: '#e24b4a',
          high: '#ef9f27',
          medium: '#1d9e75',
          low: '#378add',
        },
        env: {
          wind: '#00d4ff',
          aqi: '#ff6b35',
          temp: '#ff4757',
          sea: '#2ed573',
          fire: '#ffa502',
          quake: '#a29bfe',
          storm: '#74b9ff',
        },
        text: {
          primary: '#f1f0e8',
          secondary: '#b4b2a9',
          muted: '#6b6a63',
        },
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          default: 'rgba(255,255,255,0.12)',
          strong: 'rgba(255,255,255,0.2)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'ticker': 'ticker 40s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

### Task 0.4 — Create the full folder structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── loading.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── admin/
│   │   └── page.tsx
│   └── api/
│       ├── events/
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   ├── analyze/route.ts
│       │   ├── confirm/route.ts
│       │   └── export/route.ts
│       ├── forex/
│       │   ├── pairs/route.ts
│       │   ├── refresh/route.ts
│       │   └── sparkline/[pair]/route.ts
│       ├── env/
│       │   ├── weather/route.ts          # Open-Meteo proxy + cache
│       │   ├── aqi/route.ts              # OpenAQ proxy + cache
│       │   ├── earthquakes/route.ts      # USGS feed proxy
│       │   ├── wildfires/route.ts        # NASA EONET fires proxy
│       │   ├── storms/route.ts           # NASA EONET storms proxy
│       │   └── sea-temp/route.ts         # NOAA ERDDAP proxy
│       ├── watchlist/
│       │   └── route.ts
│       ├── push/
│       │   ├── subscribe/route.ts
│       │   └── notify/route.ts
│       └── rss/
│           └── poll/route.ts
├── components/
│   ├── globe/
│   │   ├── GlobeRenderer.tsx
│   │   ├── GlobeWrapper.tsx
│   │   ├── ripple.utils.ts
│   │   └── layers/
│   │       ├── WindLayer.tsx             # Animated wind particles on sphere
│   │       ├── AQILayer.tsx              # AQI heatmap dots
│   │       ├── EarthquakeLayer.tsx       # Magnitude-scaled quake rings
│   │       ├── WildfireLayer.tsx         # Fire markers
│   │       ├── StormLayer.tsx            # Storm track markers
│   │       └── TempAnomalyLayer.tsx      # Temperature anomaly color overlay
│   ├── ui/
│   │   ├── EventModal.tsx
│   │   ├── TooltipOverlay.tsx
│   │   ├── ForexPanel.tsx
│   │   ├── NewsTicker.tsx
│   │   ├── FilterBar.tsx
│   │   ├── PlaybackControls.tsx
│   │   ├── WatchlistButton.tsx
│   │   ├── ImpactBadge.tsx
│   │   ├── CategoryBadge.tsx
│   │   ├── SparklineChart.tsx
│   │   ├── ConnectionStatus.tsx
│   │   ├── EnvLayerPanel.tsx             # Environmental layer toggle panel
│   │   ├── EnvDataPanel.tsx              # Right panel showing env layer stats
│   │   └── EnvTooltip.tsx                # Tooltip for env markers (AQI value, wind speed, etc.)
│   ├── admin/
│   │   ├── PastePanel.tsx
│   │   └── EventPreview.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   └── layout/
│       ├── AppShell.tsx
│       └── TopBar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── anthropic/
│   │   ├── client.ts
│   │   └── prompts.ts
│   ├── forex/
│   │   ├── twelvedata.ts
│   │   └── cache.ts
│   ├── env/
│   │   ├── openmeteo.ts                  # Open-Meteo API wrapper
│   │   ├── openaq.ts                     # OpenAQ API wrapper
│   │   ├── usgs.ts                       # USGS earthquake feed wrapper
│   │   ├── eonet.ts                      # NASA EONET wrapper
│   │   ├── noaa.ts                       # NOAA alerts wrapper
│   │   └── cache.ts                      # Env data cache (Supabase table)
│   ├── realtime/
│   │   └── useRealtimeEvents.ts
│   ├── geo/
│   │   └── coordinates.ts
│   └── utils/
│       ├── cn.ts
│       ├── format.ts
│       └── dedup.ts
├── store/
│   ├── useGlobeStore.ts
│   └── types.ts
├── hooks/
│   ├── useEvents.ts
│   ├── useForex.ts
│   ├── useEnvLayer.ts                    # Hook for any active env layer data
│   ├── useWatchlist.ts
│   └── usePlayback.ts
├── middleware.ts
└── types/
    └── database.types.ts
```

### Task 0.5 — Environment variables

`.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key

# Twelve Data (forex — free tier)
TWELVE_DATA_API_KEY=your_twelve_data_key

# Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public
VAPID_PRIVATE_KEY=your_vapid_private
VAPID_SUBJECT=mailto:you@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_SECRET=your_admin_secret
CRON_SECRET=your_cron_secret

# Environmental APIs (all free, no key needed — leave blank, just document them)
# Open-Meteo: https://api.open-meteo.com — NO KEY NEEDED
# OpenAQ: https://api.openaq.org — NO KEY NEEDED
# NASA EONET: https://eonet.gsfc.nasa.gov — NO KEY NEEDED
# USGS: https://earthquake.usgs.gov — NO KEY NEEDED
# NOAA: https://api.weather.gov — NO KEY NEEDED
```

### Task 0.6 — Create shared types

Write `src/store/types.ts`:

```typescript
export type ImpactLevel = 'Critical' | 'High' | 'Medium' | 'Low'

export type EventCategory =
  | 'Geopolitical' | 'Central Bank' | 'Macro' | 'Political'
  | 'Crisis' | 'Sanctions' | 'Earnings' | 'Natural Disaster'

// Environmental layer types
export type EnvLayerType =
  | 'none'
  | 'wind'
  | 'aqi'
  | 'temperature_anomaly'
  | 'earthquakes'
  | 'wildfires'
  | 'storms'
  | 'sea_temp'

export interface ForexImpact {
  pair: string
  direction: 1 | -1
  magnitude: 'Large' | 'Medium' | 'Small'
  movePercent: string
  reasoning: string
}

export interface GlobeEvent {
  id: string
  headline: string
  country: string
  lat: number
  lon: number
  impactLevel: ImpactLevel
  category: EventCategory
  summary: string
  sentiment: string
  forexImpacts: ForexImpact[]
  confidenceScore: number
  isMarketMoving: boolean
  publishedAt: string
  expiresAt: string
  sourceUrl?: string
  createdBy: 'ai-auto' | 'ai-confirmed' | 'manual'
}

export interface ForexPair {
  pair: string
  currentPrice: number
  change24h: number
  changePercent24h: number
  sparklineData: number[]
  drivingEventId?: string
  drivingEventHeadline?: string
  lastUpdated: string
}

// Environmental data types
export interface WindPoint {
  lat: number
  lon: number
  speed: number      // m/s
  direction: number  // degrees 0-360
}

export interface AQIPoint {
  lat: number
  lon: number
  city: string
  country: string
  aqi: number        // 0-500 AQI scale
  pm25: number       // µg/m³
  category: 'Good' | 'Moderate' | 'Unhealthy for Sensitive' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous'
}

export interface EarthquakeEvent {
  id: string
  lat: number
  lon: number
  magnitude: number
  depth: number      // km
  location: string
  time: string       // ISO
  url: string
}

export interface WildfireEvent {
  id: string
  lat: number
  lon: number
  title: string
  date: string
  source: string
}

export interface StormEvent {
  id: string
  lat: number
  lon: number
  title: string
  category?: string  // e.g. "Category 3"
  date: string
}

export interface TempAnomalyPoint {
  lat: number
  lon: number
  anomalyC: number   // degrees C above/below baseline
}

export interface EnvLayerData {
  type: EnvLayerType
  updatedAt: string
  wind?: WindPoint[]
  aqi?: AQIPoint[]
  earthquakes?: EarthquakeEvent[]
  wildfires?: WildfireEvent[]
  storms?: StormEvent[]
  tempAnomalies?: TempAnomalyPoint[]
}

export interface WatchlistItem {
  id: string
  userId: string
  type: 'country' | 'forex_pair'
  value: string
  createdAt: string
}

export interface User {
  id: string
  email: string
  createdAt: string
}

export interface Filters {
  categories: EventCategory[]
  impactLevels: ImpactLevel[]
  timeRange: '1h' | '6h' | '24h' | '48h'
  searchQuery: string
}

export type ScreenPosition = { x: number; y: number }
```

### Tasks 0.7–0.8 — Utilities and verification
Same as original AGENTS.md Phase 0, Tasks 0.7–0.8.

---

## PHASE 1 — Three.js Globe Renderer

Same as original AGENTS.md Phase 1, with these additions:

### Task 1.7 — Globe layer system (new)

The `GlobeRenderer.tsx` must support a `activeLayer: EnvLayerType` prop and `layerData: EnvLayerData | null` prop.

When `activeLayer !== 'none'`, the globe renders an additional visual layer on top of the base sphere:

**Wind layer:**
- Render 500 animated particle lines on the sphere surface
- Each particle follows a flow path based on wind direction data
- Color: `#00d4ff` (cyan), opacity based on wind speed
- Lines are `THREE.Line` objects moving along geodesic paths
- Speed: particles complete their path in `3000ms / (windSpeed / 5)` ms

**AQI layer:**
- For each AQI point: render a glowing `THREE.Mesh(SphereGeometry(0.02))` at the lat/lon
- Color mapped: Good=#00e676, Moderate=#ffeb3b, Unhealthy=#ff9800, Very Unhealthy=#f44336, Hazardous=#9c27b0
- Pulsing animation based on severity: more severe = faster pulse

**Earthquake layer:**
- For each earthquake: render concentric ring animation (like news ripples but white/purple)
- Scale ring radius by magnitude: `0.02 * magnitude`
- Color: `#a29bfe` (soft purple)
- Show depth as dot opacity (deeper = more transparent)

**Wildfire layer:**
- Orange/red animated dots at fire locations
- Small `THREE.PointLight` per fire for a subtle glow effect (limit to 10 nearest fires to avoid perf issues)
- Flickering animation: sine wave on opacity with random phase per fire

**Storm layer:**
- Spiral-shaped icon at storm location (created from `THREE.Line` in a spiral pattern)
- Rotation animation (storms rotate)
- Color by intensity: tropical storm=#74b9ff, hurricane=#e84393

**Temperature anomaly layer:**
- Replace globe texture with a dynamically generated canvas texture
- Use `d3-scale` + `d3-interpolate` to map anomaly values to a diverging color scale (blue=-3°C to red=+3°C)
- Sample anomaly grid (~1° resolution from Open-Meteo climate API or fallback to stored grid)
- Apply as secondary texture blended over the earth texture at 60% opacity

---

## PHASE 2 — UI Shell & All Interface Components

Same as original AGENTS.md Phase 2, with these additions/replacements:

### Task 2.0 — Remove all Pro-gating
**DO NOT** implement `ProGate.tsx`. All features are free. Remove all `ProGate` references from the original spec. Historical playback, watchlist, CSV export — all free.

### Task 2.13 — EnvLayerPanel (NEW)

Write `src/components/ui/EnvLayerPanel.tsx`:

A compact floating panel anchored at bottom-left above the ticker. Shows layer toggle buttons:

```
[🌐 None] [💨 Wind] [😷 AQI] [🌡️ Temp] [⚡ Quakes] [🔥 Fire] [🌀 Storms] [🌊 Sea Temp]
```

Each button:
- Icon + label
- Color: uses `env.*` colors from the design system
- Active state: filled background with env color, glow effect
- On click: updates `activeEnvLayer` in Zustand store, triggers data fetch

Below the buttons: a legend for the active layer (e.g. AQI shows the color scale from Good to Hazardous).

### Task 2.14 — EnvDataPanel (NEW)

Write `src/components/ui/EnvDataPanel.tsx`:

This replaces the ForexPanel on the right side when an environmental layer is active, OR can be toggled between "Forex" and "Environment" via tabs.

When env layer active:
- Panel header: layer name + last updated time + data source credit
- Layer-specific stats:
  - **Wind:** Top 5 windiest cities right now, global average wind speed
  - **AQI:** Top 5 most polluted cities, global AQI distribution chart (small bar chart)
  - **Earthquakes:** Last 10 earthquakes, list with magnitude + location + time
  - **Wildfires:** Count of active fires by continent, total affected area estimate
  - **Storms:** Active named storms list with category and location
  - **Temp anomaly:** Hottest/coldest anomaly regions, global average anomaly vs baseline
  - **Sea Temp:** Warmest/coldest sea surface temps, anomaly vs 1991-2020 baseline

### Task 2.15 — EnvTooltip (NEW)

Write `src/components/ui/EnvTooltip.tsx`:
- Similar to `TooltipOverlay` but for environmental markers
- For AQI: shows city name, AQI value, PM2.5, health advice
- For earthquakes: shows magnitude, depth, location, time
- For wildfires: shows fire name, start date, source
- For storms: shows storm name, category, wind speed

---

## PHASE 3 — Database, Supabase & Realtime

Same as original AGENTS.md Phase 3, with these additions:

### Task 3.2 — Additional DB tables for env data cache

Add to the schema:

```sql
-- Environmental data cache (keyed by layer type)
create table public.env_data_cache (
  layer_type text primary key check (layer_type in ('wind','aqi','earthquakes','wildfires','storms','sea_temp','temp_anomaly')),
  data jsonb not null,            -- serialized EnvLayerData
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- AQI history for sparklines
create table public.aqi_history (
  id uuid primary key default uuid_generate_v4(),
  city text not null,
  country text not null,
  lat numeric(9,6),
  lon numeric(9,6),
  aqi integer not null,
  pm25 numeric(8,2),
  recorded_at timestamptz not null default now()
);

create index idx_aqi_history_city_time on public.aqi_history(city, recorded_at desc);
create index idx_env_cache_expires on public.env_data_cache(expires_at);
```

---

## PHASE 4 — AI Pipeline & News Analysis

Unchanged from original AGENTS.md Phase 4.

---

## PHASE 5 — Forex Data Integration

Unchanged from original AGENTS.md Phase 5.

---

## PHASE 6 — Environmental Data Integration (replaces Billing phase)

**Goal:** All 7 environmental data layers fully working with real data, auto-refreshing, and beautifully visualized on the globe.

### Task 6.1 — Open-Meteo wrapper

Write `src/lib/env/openmeteo.ts`:

```typescript
const BASE = 'https://api.open-meteo.com/v1'

// getWindGrid(): Promise<WindPoint[]>
// Fetches wind speed + direction for a 5°x5° global grid (~72x36 = 2,592 points)
// Uses /forecast with hourly windspeed_10m + winddirection_10m, current hour only
// Batch into 10-point calls to avoid rate limiting
// Cache result for 1 hour

// getTempAnomalies(): Promise<TempAnomalyPoint[]>
// Fetches temperature vs 30-year normal for a coarser 10°x10° grid
// Uses /climate-api or falls back to /forecast comparing to historical normals
// Cache result for 6 hours
```

### Task 6.2 — OpenAQ wrapper

Write `src/lib/env/openaq.ts`:

```typescript
const BASE = 'https://api.openaq.org/v2'

// getGlobalAQI(): Promise<AQIPoint[]>
// GET /latest?limit=500&parameter=pm25&order_by=lastUpdated&sort=desc
// Maps PM2.5 to AQI using EPA formula
// Deduplicate: one entry per city
// Cache result for 30 minutes

// aqiFromPm25(pm25: number): number
// EPA standard conversion formula
// Returns 0-500 AQI number

// aqiCategory(aqi: number): AQIPoint['category']
// Returns the text category for color mapping
```

### Task 6.3 — USGS earthquake wrapper

Write `src/lib/env/usgs.ts`:

```typescript
// getRecentEarthquakes(): Promise<EarthquakeEvent[]>
// Fetch https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson
// Parse GeoJSON FeatureCollection
// Filter: magnitude >= 2.5, within last 24 hours
// Sort by magnitude desc
// Cache 5 minutes
```

### Task 6.4 — NASA EONET wrapper

Write `src/lib/env/eonet.ts`:

```typescript
// getWildfires(): Promise<WildfireEvent[]>
// GET https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=50
// Parse events array, take first geometry coordinate
// Cache 15 minutes

// getStorms(): Promise<StormEvent[]>
// GET https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms&status=open&limit=30
// Parse and return
// Cache 15 minutes
```

### Task 6.5 — Environmental API routes

Write `src/app/api/env/weather/route.ts`:
- Proxy to Open-Meteo
- Returns wind grid and temp anomalies
- Reads from `env_data_cache` if fresh (< 1 hour), else fetches + caches
- `Cache-Control: public, max-age=3600`

Write `src/app/api/env/aqi/route.ts`:
- Returns OpenAQ data
- Cache 30 minutes in `env_data_cache`

Write `src/app/api/env/earthquakes/route.ts`:
- Returns USGS feed data
- Cache 5 minutes

Write `src/app/api/env/wildfires/route.ts` and `src/app/api/env/storms/route.ts`:
- Return EONET data
- Cache 15 minutes

### Task 6.6 — useEnvLayer hook

Write `src/hooks/useEnvLayer.ts`:

```typescript
export function useEnvLayer(layerType: EnvLayerType) {
  const setEnvLayerData = useGlobeStore(s => s.setEnvLayerData)
  
  const endpoint = layerType === 'none' ? null : `/api/env/${layerTypeToPath(layerType)}`
  
  const { data, isLoading, error } = useSWR(endpoint, fetcher, {
    refreshInterval: REFRESH_INTERVALS[layerType],
    revalidateOnFocus: false,
  })
  
  useEffect(() => {
    if (data) setEnvLayerData(data)
  }, [data])
  
  return { isLoading, error }
}

// Refresh intervals per layer type:
const REFRESH_INTERVALS: Record<EnvLayerType, number> = {
  none: 0,
  wind: 3600_000,           // 1 hour
  aqi: 1800_000,            // 30 minutes
  temperature_anomaly: 21600_000, // 6 hours
  earthquakes: 300_000,     // 5 minutes
  wildfires: 900_000,       // 15 minutes
  storms: 900_000,          // 15 minutes
  sea_temp: 86400_000,      // 24 hours
}
```

### Task 6.7 — Zustand store additions

Update `src/store/useGlobeStore.ts` to add:

```typescript
// Environmental layer state
activeEnvLayer: EnvLayerType
envLayerData: EnvLayerData | null

// Actions
setActiveEnvLayer: (layer: EnvLayerType) => void
setEnvLayerData: (data: EnvLayerData) => void
```

### Task 6.8 — Env data cron jobs

Add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/rss/poll", "schedule": "*/15 * * * *" },
    { "path": "/api/forex/refresh", "schedule": "* * * * *" },
    { "path": "/api/env/earthquakes", "schedule": "*/5 * * * *" },
    { "path": "/api/env/wildfires", "schedule": "*/15 * * * *" },
    { "path": "/api/env/aqi", "schedule": "*/30 * * * *" },
    { "path": "/api/env/weather", "schedule": "0 * * * *" }
  ]
}
```

### Task 6.9 — Verify Phase 6

1. Click "Wind" in EnvLayerPanel → wind particles appear on globe
2. Click "AQI" → colored AQI dots appear, tooltip shows AQI value on hover
3. Click "Earthquakes" → recent quakes visible with magnitude-scaled rings
4. Click "Wildfires" → active fires visible with orange glow
5. EnvDataPanel shows layer-specific stats
6. Layers auto-refresh on their schedules
7. Build passes: `npm run build`

```bash
git add -A && git commit -m "feat: phase 6 — all environmental data layers complete"
```

---

## PHASE 7 — Auth, Watchlist & Push Notifications (FREE)

Same as original Phase 6 but with ALL Stripe, billing, and Pro-gating code removed.

### What to keep from original Phase 6:
- Task 6.1 (Supabase Auth) → keep entirely
- Task 6.5 (Watchlist) → keep entirely
- Task 6.6 (Push notifications) → keep entirely

### What to REMOVE:
- ALL of Task 6.2 (Stripe setup) — delete
- ALL of Task 6.3 (Stripe API routes) — delete
- ALL of Task 6.4 (ProGate) — delete
- Any `canAccessFeature` or plan tier checks

The `User` type has no `planTier` or `stripeCustomerId`. Users are either logged in or not. All features available to all users. Watchlist requires login (free account).

---

## PHASE 8 — Historical Playback & Advanced Features

Same as original Phase 7, with ProGate completely removed from PlaybackControls. Historical playback is free.

---

## PHASE 9 — Pre-Launch & Deployment

Same as original Phase 8, removing all Stripe-related checklist items.

Additional checklist items:
- [ ] Data attribution: OpenAQ, USGS, NASA EONET, Open-Meteo credits shown in UI footer
- [ ] Rate limit guards on all env API routes (don't hammer free APIs)
- [ ] Env data cache is warm before launch (run cron jobs once manually)
- [ ] `/api/env/*` routes return stale data gracefully if upstream APIs are down

---

## IMPORTANT NOTES FOR Codex

- **This is a free product.** No Stripe, no paywalls, no plan tiers. Every user gets everything.
- **The globe is the product.** The environmental layers make it 10x more valuable than just news events.
- **Cache aggressively.** All env data goes through Supabase cache. Never call external APIs on every request.
- **Credit your data sources.** Add a footer crediting Open-Meteo, OpenAQ, USGS, NASA EONET, and NOAA.
- **Check BUILD_STATE.md first.** Always. Every session.
- **Do not start Phase N+1 until Phase N is verified.** `npm run build` passing is the bar.