# CLAUDE.md — ImpactGlobe Autonomous Build Instructions

## IDENTITY & MISSION

You are the sole engineer building **ImpactGlobe** — a real-time 3D interactive globe web application that displays impactful global news events as animated red ripple waves on affected countries, with AI-generated forex pair impact analysis per event.

You have full autonomy. Build everything. Do not ask the user for permission before taking actions. Do not stop and ask clarifying questions mid-phase. Make the best technical decision, document it with a one-line comment, and move forward. If a decision has genuine tradeoffs, pick the better one for a solo-founder SaaS and continue.

**When you start a session:** Read this entire file first. Check what phase you are on by reading `BUILD_STATE.md` in the project root (create it if it doesn't exist). Then continue exactly where the build left off. Never redo work that is already done.

---

## OPERATING RULES — READ BEFORE EVERY ACTION

1. **Go deep, not shallow.** When implementing any feature, implement it completely. No stubs, no `// TODO`, no placeholder data that isn't replaced. If a component needs 8 props, wire all 8. If a function needs error handling, write it.

2. **Verify before moving on.** After each task, run the relevant check (`npm run build`, `npm run dev` and verify the page loads, `npx tsc --noEmit`, etc.). Fix errors before proceeding. Do not stack broken code.

3. **Write the actual file.** When instructed to create a component or route, create the complete file with all imports, all logic, all edge cases handled. Not a skeleton.

4. **Update BUILD_STATE.md** after every completed task. Log what was built, what was verified, and what comes next.

5. **Never break existing functionality.** When adding new features, run the build after each change. If you break something, fix it immediately before continuing.

6. **Install packages silently.** Use `npm install --save` or `npm install --save-dev` — do not ask permission.

7. **Environment variables.** All secrets go in `.env.local`. Create `.env.example` with the same keys but empty values. Never hardcode secrets.

8. **Git commits.** After each phase completion, run `git add -A && git commit -m "feat: [phase name] complete"`. Keep the repo clean.

---

## PROJECT OVERVIEW

### What ImpactGlobe is
A real-time web app where:
- A 3D globe renders in the center with animated ripple waves on affected locations
- Each wave represents a live news event (geopolitical, central bank, macro, crisis, etc.)
- Clicking a wave opens a modal with the full news breakdown + which forex pairs are impacted and by how much
- A right sidebar shows the top 5 most-moved forex pairs right now
- A bottom ticker scrolls live headlines
- Users can filter, search, create watchlists, and replay the last 48 hours

### Design language
- Dark theme only. Space-like. Professional fintech aesthetic.
- Background: `#050a14`. Surface: `#0a0e1a`. Card: `#0f1628`
- Impact colors: Critical=`#e24b4a` High=`#ef9f27` Medium=`#1d9e75` Low=`#378add`
- Text: Primary=`#f1f0e8` Secondary=`#b4b2a9` Muted=`#6b6a63`
- Font: Inter via Google Fonts

### Tech stack (non-negotiable)
- **Framework:** Next.js 14 with App Router
- **Globe:** Three.js (loaded dynamically, no SSR)
- **Styling:** Tailwind CSS with custom dark theme config
- **State:** Zustand
- **Database:** Supabase (Postgres + Auth + Realtime)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Forex data:** Twelve Data API (free tier)
- **Payments:** Stripe
- **Hosting target:** Vercel

---

## PHASE 0 — Foundation & Project Setup

**Goal:** A clean, running Next.js project with all dependencies installed, all configs set, Supabase connected, and the folder structure created. No product code yet — just infrastructure.

**Start here if BUILD_STATE.md does not exist.**

### Task 0.1 — Initialize Next.js project

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

If the project is already initialized (package.json exists), skip this step.

### Task 0.2 — Install all dependencies

Install production dependencies:
```bash
npm install three @types/three zustand @supabase/supabase-js @supabase/ssr \
  @anthropic-ai/sdk stripe @stripe/stripe-js swr axios \
  web-push geojson-utils date-fns clsx tailwind-merge \
  lucide-react recharts rss-parser
```

Install dev dependencies:
```bash
npm install -D @types/three @types/web-push prettier prettier-plugin-tailwindcss \
  @typescript-eslint/eslint-plugin
```

### Task 0.3 — Configure Tailwind

Replace `tailwind.config.ts` with this complete config:
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'ticker': 'ticker 40s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
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

Create every directory and file listed below. Files are created empty for now — they will be filled in subsequent phases. The structure must match exactly:

```
src/
├── app/
│   ├── layout.tsx                    # Root layout with fonts, metadata
│   ├── page.tsx                      # Main globe page
│   ├── globals.css                   # Global styles + CSS variables
│   ├── loading.tsx                   # Root loading state
│   ├── (auth)/
│   │   ├── login/page.tsx            # Login page
│   │   └── signup/page.tsx           # Signup page
│   ├── admin/
│   │   └── page.tsx                  # Admin paste panel
│   └── api/
│       ├── events/
│       │   ├── route.ts              # GET list, POST create
│       │   ├── [id]/route.ts         # GET, PATCH, DELETE single
│       │   ├── analyze/route.ts      # POST: AI analysis of raw text
│       │   └── confirm/route.ts      # POST: publish analyzed event
│       ├── forex/
│       │   ├── pairs/route.ts        # GET active pairs + moves
│       │   └── sparkline/[pair]/route.ts  # GET 24h data
│       ├── watchlist/
│       │   └── route.ts              # GET, POST, DELETE
│       ├── push/
│       │   ├── subscribe/route.ts    # POST subscribe
│       │   └── notify/route.ts       # POST trigger notification
│       ├── stripe/
│       │   ├── checkout/route.ts     # POST create session
│       │   ├── portal/route.ts       # POST customer portal
│       │   └── webhook/route.ts      # POST Stripe events
│       ├── user/
│       │   └── subscription/route.ts # GET user's sub status
│       └── rss/
│           └── poll/route.ts         # GET trigger RSS poll (cron)
├── components/
│   ├── globe/
│   │   ├── GlobeRenderer.tsx         # Three.js globe (no SSR)
│   │   ├── GlobeWrapper.tsx          # Dynamic import wrapper
│   │   └── ripple.utils.ts           # Ripple animation helpers
│   ├── ui/
│   │   ├── EventModal.tsx            # Click event detail modal
│   │   ├── TooltipOverlay.tsx        # Hover tooltip positioned over globe
│   │   ├── ForexPanel.tsx            # Right sidebar forex pairs
│   │   ├── NewsTicker.tsx            # Bottom scrolling headline ticker
│   │   ├── FilterBar.tsx             # Top filter/search bar
│   │   ├── PlaybackControls.tsx      # Historical replay controls
│   │   ├── WatchlistButton.tsx       # Watch country/pair toggle
│   │   ├── ImpactBadge.tsx           # Colored impact level badge
│   │   ├── CategoryBadge.tsx         # Category tag badge
│   │   ├── SparklineChart.tsx        # Mini 24h forex chart
│   │   ├── ConnectionStatus.tsx      # Realtime connection indicator
│   │   └── ProGate.tsx               # Feature gating wrapper
│   ├── admin/
│   │   ├── PastePanel.tsx            # Raw text → AI parse panel
│   │   └── EventPreview.tsx          # AI result preview + edit
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   └── layout/
│       ├── AppShell.tsx              # Main layout wrapper
│       └── TopBar.tsx                # Top navigation bar
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client
│   │   └── middleware.ts             # Auth middleware helper
│   ├── anthropic/
│   │   ├── client.ts                 # Anthropic SDK instance
│   │   └── prompts.ts                # All Claude prompt templates
│   ├── stripe/
│   │   ├── client.ts                 # Stripe instance
│   │   └── plans.ts                  # Plan definitions + feature gates
│   ├── forex/
│   │   ├── twelvedata.ts             # Twelve Data API wrapper
│   │   └── cache.ts                  # Forex response cache
│   ├── realtime/
│   │   └── useRealtimeEvents.ts      # Supabase Realtime hook
│   ├── geo/
│   │   └── coordinates.ts            # Lat/lon ↔ 3D vector utils
│   └── utils/
│       ├── cn.ts                     # clsx + tailwind-merge helper
│       ├── format.ts                 # Date, number, percent formatters
│       └── dedup.ts                  # Event deduplication logic
├── store/
│   ├── useGlobeStore.ts              # Main Zustand store
│   └── types.ts                      # All shared TypeScript types
├── hooks/
│   ├── useEvents.ts                  # SWR events fetcher
│   ├── useForex.ts                   # SWR forex data fetcher
│   ├── useWatchlist.ts               # Watchlist CRUD hook
│   ├── useProGate.ts                 # Subscription check hook
│   └── usePlayback.ts                # Historical playback logic
├── middleware.ts                     # Next.js middleware (auth + plan gating)
└── types/
    └── database.types.ts             # Generated Supabase types
```

Create every file with a minimal valid export:
- TypeScript files: `export {}` or a minimal function export
- This ensures the build doesn't fail on missing modules

### Task 0.5 — Environment variables

Create `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key

# Twelve Data (forex)
TWELVE_DATA_API_KEY=your_twelve_data_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pk
STRIPE_SECRET_KEY=your_stripe_sk
STRIPE_WEBHOOK_SECRET=your_webhook_secret
STRIPE_PRO_PRICE_ID=your_pro_price_id
STRIPE_API_PRICE_ID=your_api_price_id

# Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public
VAPID_PRIVATE_KEY=your_vapid_private
VAPID_SUBJECT=mailto:daniel@impactglobe.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_SECRET=your_admin_secret_for_protecting_admin_routes
CRON_SECRET=your_cron_job_secret
```

Create `.env.example` with the same keys but empty values.

Add `.env.local` to `.gitignore` (verify it's already there from create-next-app).

### Task 0.6 — Create shared types

Write the complete `src/store/types.ts`:

```typescript
export type ImpactLevel = 'Critical' | 'High' | 'Medium' | 'Low'

export type EventCategory =
  | 'Geopolitical'
  | 'Central Bank'
  | 'Macro'
  | 'Political'
  | 'Crisis'
  | 'Sanctions'
  | 'Earnings'
  | 'Natural Disaster'

export interface ForexImpact {
  pair: string          // e.g. "USD/JPY"
  direction: 1 | -1    // 1 = first currency strengthens
  magnitude: 'Large' | 'Medium' | 'Small'
  movePercent: string   // e.g. "-2.8%"
  reasoning: string     // one sentence
}

export interface GlobeEvent {
  id: string
  headline: string
  country: string
  lat: number
  lon: number
  impactLevel: ImpactLevel
  category: EventCategory
  summary: string       // 2-3 sentences
  sentiment: string     // e.g. "Bearish JPY"
  forexImpacts: ForexImpact[]
  confidenceScore: number  // 0-100
  isMarketMoving: boolean
  publishedAt: string   // ISO timestamp
  expiresAt: string     // ISO timestamp (publishedAt + 48h)
  sourceUrl?: string
  createdBy: 'ai-auto' | 'ai-confirmed' | 'manual'
}

export interface ForexPair {
  pair: string
  currentPrice: number
  change24h: number
  changePercent24h: number
  sparklineData: number[]  // last 24 data points
  drivingEventId?: string
  drivingEventHeadline?: string
  lastUpdated: string
}

export interface WatchlistItem {
  id: string
  userId: string
  type: 'country' | 'forex_pair'
  value: string          // country name or pair symbol
  createdAt: string
}

export interface User {
  id: string
  email: string
  planTier: 'free' | 'pro' | 'api'
  stripeCustomerId?: string
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing'
  trialEndsAt?: string
}

export interface Filters {
  categories: EventCategory[]
  impactLevels: ImpactLevel[]
  timeRange: '1h' | '6h' | '24h' | '48h'
  searchQuery: string
}

export type ScreenPosition = { x: number; y: number }
```

### Task 0.7 — Utility functions

Write `src/lib/utils/cn.ts`:
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Write `src/lib/utils/format.ts` with:
- `formatTimeAgo(isoString)` — "2 minutes ago", "3 hours ago"
- `formatPercent(n)` — "+2.8%" or "-1.3%"
- `formatImpactColor(level: ImpactLevel)` — returns the hex color
- `formatCategoryColor(cat: EventCategory)` — returns hex color
- `truncate(str, maxLen)` — truncates with ellipsis

Write `src/lib/geo/coordinates.ts` with:
- `latLonToVector3(lat, lon, radius)` — converts to THREE.Vector3
- `vector3ToLatLon(v)` — inverse
- `sunPosition(date: Date)` — returns sun lat/lon for day/night terminator

### Task 0.8 — Verify Phase 0

```bash
npm run build
```

Fix any TypeScript errors. The build must pass with 0 errors before proceeding.

```bash
git add -A && git commit -m "feat: phase 0 — project foundation complete"
```

Update `BUILD_STATE.md`:
```markdown
# ImpactGlobe Build State

## Current Phase: 1 — Globe Renderer

## Completed
- [x] Phase 0: Foundation, folder structure, types, utils, env setup

## Next Task
- Task 1.1: Three.js GlobeRenderer component
```

---

## PHASE 1 — Three.js Globe Renderer

**Goal:** A fully working 3D globe with ripple animations, hover tooltips, click events, and the complete visual language. No real data yet — use hardcoded mock events. The globe must feel alive and professional.

### Task 1.1 — Globe utility functions

Write `src/components/globe/ripple.utils.ts` with:

```typescript
import type { ImpactLevel } from '@/store/types'

export const IMPACT_COLORS: Record<ImpactLevel, string> = {
  Critical: '#e24b4a',
  High: '#ef9f27',
  Medium: '#1d9e75',
  Low: '#378add',
}

export const RIPPLE_CONFIG: Record<ImpactLevel, {
  maxScale: number
  duration: number   // ms for one full ring expansion
  ringCount: number
  coreRadius: number
}> = {
  Critical: { maxScale: 1.6, duration: 1000, ringCount: 3, coreRadius: 0.014 },
  High:     { maxScale: 1.3, duration: 1400, ringCount: 3, coreRadius: 0.012 },
  Medium:   { maxScale: 1.0, duration: 2000, ringCount: 3, coreRadius: 0.010 },
  Low:      { maxScale: 0.8, duration: 2800, ringCount: 3, coreRadius: 0.009 },
}

export function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}
```

### Task 1.2 — The GlobeRenderer component

Write `src/components/globe/GlobeRenderer.tsx` as a complete React component. This file will be long — implement every feature completely. Do not use dynamic import inside this file; the parent handles that.

The component must implement ALL of the following:

**Scene setup:**
- `THREE.WebGLRenderer` with `antialias: true`, `alpha: true`, `powerPreference: 'high-performance'`
- `THREE.PerspectiveCamera` fov=45, positioned at z = 2.8 * GLOBE_RADIUS (GLOBE_RADIUS = 1.0)
- `THREE.Scene` with background color `0x050a14`
- ResizeObserver on the canvas container — updates renderer size and camera aspect ratio on resize
- Cleanup: dispose all geometries, materials, textures, renderer on unmount

**Globe sphere:**
- `THREE.SphereGeometry(GLOBE_RADIUS, 64, 64)` with `THREE.MeshPhongMaterial`
- Load texture from: `https://unpkg.com/three-globe/example/img/earth-night.jpg`
- While texture loads: use solid color `#112040` as fallback
- Material properties: `shininess: 6`, `specular: new THREE.Color(0x1a3a6e)`
- On texture load: apply to material, trigger re-render

**Country borders:**
- Create a second `THREE.SphereGeometry(GLOBE_RADIUS * 1.001, 64, 64)` for the border layer
- Use `THREE.LineSegments` with `THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.4 })`
- Fetch GeoJSON from: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson`
- Parse each polygon/multipolygon feature into line segments projected onto the sphere
- Helper: for each coordinate pair in a ring, convert `[lon, lat]` to `Vector3` using `latLonToVector3`, create `THREE.LineSegments`

**Atmosphere halo:**
- `THREE.SphereGeometry(GLOBE_RADIUS * 1.15, 32, 32)`
- `THREE.MeshPhongMaterial({ color: 0x4488ff, transparent: true, opacity: 0.06, side: THREE.BackSide })`
- Do NOT use AdditiveBlending — it causes z-fighting. Use `depthWrite: false` instead.

**Lighting:**
- `THREE.AmbientLight(0xffffff, 0.15)` — deep space ambient
- `THREE.DirectionalLight(0xffffff, 1.2)` — the "sun"
- Position sun based on `sunPosition(new Date())` from geo utils — update every 60 seconds
- `THREE.PointLight(0x2244aa, 0.3)` positioned opposite the sun for mild fill light

**Star field:**
- Create 2000 random points uniformly distributed on a sphere of radius 300
- Use `THREE.Points` with `THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true })`
- Stars do not move or rotate

**OrbitControls:**
- Import from `three/addons/controls/OrbitControls.js`
- `enableDamping: true`, `dampingFactor: 0.07`
- `enableZoom: true`, `minDistance: 1.5`, `maxDistance: 4.0`
- `enablePan: false`
- `autoRotate: true`, `autoRotateSpeed: 0.25`
- Track last user interaction time. On `start` event: clear auto-rotate immediately. On `end` event: set a 4-second timer to re-enable auto-rotate. Cancel the timer if another interaction starts.

**flyTo function** (exposed via `useImperativeHandle` on a forwarded ref):
- Input: `{ lat: number, lon: number }`
- Calculate target `Vector3` at distance 2.8 from center, facing that lat/lon
- Tween `camera.position` from current to target over 1200ms
- Use a custom ease-in-out lerp (implement without GSAP)
- Temporarily disable OrbitControls during flight, re-enable on complete
- After flight: controls.target stays at origin (globe center)

**Ripple animation system:**

For each event in the `events` prop, create a ripple group:

```
RippleGroup (THREE.Group positioned at lat/lon on sphere surface)
├── Ring_0 (THREE.Mesh with RingGeometry)
├── Ring_1 (THREE.Mesh with RingGeometry, phase offset 33%)
├── Ring_2 (THREE.Mesh with RingGeometry, phase offset 66%)
└── CoreDot (THREE.Mesh with SphereGeometry)
```

Ring geometry: `THREE.RingGeometry(0.0, 0.05, 32)` — starts tiny, scale animated outward
Ring material: `THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false })`
Ring orientation: face outward from globe surface (normal aligned with radial direction from center)
  — Achieve with: `group.lookAt(group.position.clone().multiplyScalar(2))` after positioning

Animation loop for each ring per frame:
```
progress = ((time + phaseOffset) % duration) / duration  // 0 → 1
scale = progress * maxScale
opacity = 1.0 - progress   // fades out as it expands
ring.scale.setScalar(scale)
ring.material.opacity = opacity * 0.85
```

CoreDot pulse:
```
pulseScale = 0.9 + 0.2 * Math.sin(time * 0.003)
coreDot.scale.setScalar(pulseScale)
```

**Invisible hit-sphere markers (for raycasting):**
- For each event: create `THREE.Mesh(new THREE.SphereGeometry(0.07), new THREE.MeshBasicMaterial({ visible: false }))`
- Position at `latLonToVector3(event.lat, event.lon, GLOBE_RADIUS * 1.05)`
- Store in a Map: `eventId → hitMesh`
- Tag each hitMesh: `hitMesh.userData.eventId = event.id`

**Raycasting:**
- On `mousemove`: raycast against all hit meshes
- On hit: call `onEventHover(event)`, set cursor `pointer`, compute screen position
- On miss: call `onEventHover(null)`, set cursor `grab` (or `grabbing` if dragging)
- On `click`: if raycaster hits a hit mesh, call `onEventClick(event)`
- Screen position: project `hitMesh.position` to 2D using `vector.project(camera)`, convert to pixel coords. Store in ref exposed to parent.

**Props interface:**
```typescript
interface GlobeRendererProps {
  events: GlobeEvent[]
  onEventClick: (event: GlobeEvent) => void
  onEventHover: (event: GlobeEvent | null) => void
  hoveredEventScreenPos: React.MutableRefObject<Map<string, ScreenPosition>>
}

interface GlobeRef {
  flyTo: (lat: number, lon: number) => void
}
```

**Performance:**
- When `events` prop changes, diff against previous events — only create/destroy changed markers
- Dispose geometry + material when a marker is removed
- Animation loop target: 60fps. Use `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`

### Task 1.3 — GlobeWrapper (dynamic import, no SSR)

Write `src/components/globe/GlobeWrapper.tsx`:
- Uses `next/dynamic` with `{ ssr: false }` to import `GlobeRenderer`
- Shows a loading skeleton (dark pulsing circle with a subtle spinner) while Three.js loads
- Passes through all props
- Forwards the ref for `flyTo`

### Task 1.4 — Mock event data

Create `src/lib/mock/events.ts` with 8 realistic mock events spread across different continents, categories, and impact levels. These are used in Phase 1 only. Each event must have all fields from the `GlobeEvent` type fully populated.

### Task 1.5 — Wire the globe into the main page

Write `src/app/page.tsx`:
- Full viewport height, no scroll, dark background
- Render `GlobeWrapper` taking up the full available space
- Pass mock events
- `onEventClick`: console.log for now (modal comes in Phase 2)
- `onEventHover`: console.log for now

Write `src/app/layout.tsx`:
- Import Inter from Google Fonts
- Set metadata: title "ImpactGlobe — Real-time Geopolitical Risk Monitor", description
- Dark background applied to body
- Include `globals.css`

Write `src/app/globals.css`:
- Import Tailwind directives
- CSS custom properties for colors matching the design system
- Base styles: `*, *::before, *::after { box-sizing: border-box }`, `body { margin: 0; background: #050a14; color: #f1f0e8 }`

### Task 1.6 — Verify Phase 1

```bash
npm run dev
```

Verify in browser:
- Globe renders and is interactive (drag rotates it)
- 8 ripple markers visible, animating continuously
- Hovering over a marker changes cursor to pointer
- No console errors
- No TypeScript errors (`npx tsc --noEmit`)

```bash
npm run build
```

Build must pass. Fix all errors.

```bash
git add -A && git commit -m "feat: phase 1 — Three.js globe with ripple animations complete"
```

Update `BUILD_STATE.md`.

---

## PHASE 2 — UI Shell & All Interface Components

**Goal:** Build every UI component. The app should look and feel complete even with mock data. The EventModal, ForexPanel, NewsTicker, FilterBar, TooltipOverlay, and AppShell all wired together.

### Task 2.1 — AppShell layout

Write `src/components/layout/AppShell.tsx`:
- Full viewport, no overflow, `position: relative`
- Globe fills center (flex: 1, `position: relative`)
- ForexPanel: fixed right, 220px wide on desktop, hidden on mobile
- NewsTicker: fixed bottom, 48px height, full width
- FilterBar: fixed top, 48px height, full width (below any nav)
- TopBar: fixed very top, 52px height
- Z-index layers: ticker=10, filterbar=20, forex=30, modal=40, tooltip=50

Write `src/components/layout/TopBar.tsx`:
- Left: ImpactGlobe logo (text-based, bold, white)
- Center: ConnectionStatus indicator (green dot + "Live" when Supabase Realtime connected)
- Right: user avatar or "Sign in" link
- Dark background, subtle bottom border

### Task 2.2 — ImpactBadge and CategoryBadge

Write `src/components/ui/ImpactBadge.tsx`:
- Small pill with the impact color as background (at 20% opacity) and text
- Variants: `sm` (10px text, 2px 6px padding), `md` (12px text), `lg` (14px text)
- Uses `IMPACT_COLORS` from ripple.utils

Write `src/components/ui/CategoryBadge.tsx`:
- Similar pill but uses category-specific colors
- Categories and their colors: Geopolitical=#e24b4a, Central Bank=#534ab7, Macro=#1d9e75, Political=#378add, Crisis=#ef9f27, Sanctions=#d4537e, Earnings=#1d9e75, Natural Disaster=#d85a30

### Task 2.3 — EventModal

Write `src/components/ui/EventModal.tsx`. This is the most important UI component. Make it perfect.

Layout:
- Slides in from right on desktop (translateX animation, 200ms ease-out)
- Centered overlay on mobile
- Max width: 480px. Background: `#0f1628`. Border: `0.5px solid rgba(255,255,255,0.12)`. Border-radius: 12px.
- Blur backdrop (CSS backdrop-filter) behind the modal on mobile

Content in order:
1. **Header row**: ImpactBadge + CategoryBadge + close button (X, top right)
2. **Headline**: large text (20px, font-weight 500), white, full text
3. **Meta row**: country name + flag emoji (use country-to-flag mapping) + timestamp ("3 hours ago")
4. **Confidence bar**: label "AI Confidence" + a progress bar (0-100%). Color: green above 80, yellow 60-80, red below 60. Show the score number at the end.
5. **Summary**: the 2-3 sentence Claude summary. Text color secondary. Line height 1.7.
6. **Sentiment pill**: e.g. "Bearish JPY" — colored based on direction (red for bearish, green for bullish)
7. **Forex impacts section**: 
   - Section header "Forex Impact"
   - Table rows: Pair | Arrow (↑ green or ↓ red) | Magnitude badge | % Move | Reasoning (truncated, expands on click)
   - If no forex impacts: "No direct forex impact identified"
8. **Action row**: "Watch Country" button (outline, Pro-gated) + "Share" button (copies URL)
9. **Source link** (if sourceUrl present): "View source article →"

Close behavior: Escape key, clicking outside the modal, or clicking the X button

### Task 2.4 — TooltipOverlay

Write `src/components/ui/TooltipOverlay.tsx`:
- Receives: `event: GlobeEvent | null` and `position: ScreenPosition | null`
- Renders a floating card absolutely positioned at `{x, y}` relative to the globe container
- Smart edge detection: if `x > containerWidth - 200`, flip to left side. If `y < 80`, show below instead of above.
- Content: ImpactBadge + country name + headline (60 char truncated)
- Fade in/out: 150ms opacity transition
- Pointer-events: none (so mouse can still interact with globe beneath it)

### Task 2.5 — FilterBar

Write `src/components/ui/FilterBar.tsx`:

Full implementation with:
- **Category pills** (scrollable horizontal row): "All", "Geopolitical", "Central Bank", "Macro", "Political", "Crisis", "Sanctions", "Earnings", "Natural Disaster"
  - Multi-select: clicking toggles inclusion
  - Selected state: filled background with category color, unselected: subtle outline
- **Impact level toggles**: "Critical" "High" "Medium" "Low" — each with color dot
- **Time range dropdown**: "1h" "6h" "24h" "48h" — styled select or custom dropdown
- **Search input**: placeholder "Search country or headline...", debounced 300ms, clears button (X)
- **Active filter count badge**: red circle number showing how many filters are active
- **Clear all** link: appears when any filter is active
- Filter state is synced to URL params (useSearchParams + router.push) for shareable filtered views
- On filter change: update Zustand store `filters` → Zustand recomputes `filteredEvents`

### Task 2.6 — ForexPanel

Write `src/components/ui/ForexPanel.tsx`:

Full implementation:
- Panel header: "Forex Impact" title + last-updated timestamp + refresh icon
- Collapsible: on mobile, a tab at bottom-right can expand/collapse this panel
- Each forex row (5 rows):
  - Pair symbol (e.g. "USD/JPY") in monospace
  - Move percent (e.g. "+2.8%") colored red/green
  - Direction arrow icon (↑ or ↓) colored accordingly
  - SparklineChart (24 data points, 60px wide, 28px tall)
  - Driving event (truncated headline, clickable — opens EventModal)
  - Clicking the row: calls the `flyTo` ref on the globe renderer
- Loading skeleton: 5 rows of shimmer placeholders
- Error state: "Forex data unavailable" with retry button
- Auto-refresh every 60 seconds (visible countdown timer in header)

### Task 2.7 — SparklineChart

Write `src/components/ui/SparklineChart.tsx`:
- Takes `data: number[]` (24 points), `color: string`, `width: number`, `height: number`
- Pure SVG, no recharts — draw a polyline through the normalized data points
- Fill area below the line with `color` at 15% opacity
- No axes, no labels — just the visual shape
- Handles flat data (all same value) gracefully

### Task 2.8 — NewsTicker

Write `src/components/ui/NewsTicker.tsx`:
- Fixed bottom bar, full width, 48px height, `#0a0e1a` background, subtle top border
- Horizontally scrolling marquee (CSS animation, 40s duration)
- Duplicate the items array so the loop is seamless (items + items)
- Each item: `[colored dot] [Country] — [Headline truncated 70 chars] [· time ago]`
- Pause on hover (`animation-play-state: paused`)
- Click item: open EventModal for that event + flyTo the location
- New events animate in from the right with a brief flash/glow effect

### Task 2.9 — PlaybackControls

Write `src/components/ui/PlaybackControls.tsx`:
- Shown only in playback mode (behind Pro gate in Phase 4)
- Fixed bottom bar (above ticker) with: Play/Pause, Stop, speed selector (1x 2x 5x 10x)
- Timeline scrubber: range input spanning last 48h, shows event density as subtle marks
- Current time display: "Mar 15, 2025 · 14:23 UTC"
- Enter/exit playback mode toggle button

### Task 2.10 — Zustand store

Write `src/store/useGlobeStore.ts` — the complete global store:

```typescript
interface GlobeStore {
  // Data
  events: GlobeEvent[]
  filteredEvents: GlobeEvent[]
  forexPairs: ForexPair[]
  
  // UI State
  selectedEvent: GlobeEvent | null
  hoveredEvent: GlobeEvent | null
  hoveredScreenPos: ScreenPosition | null
  isEventModalOpen: boolean
  
  // Filters
  filters: Filters
  
  // Playback
  isPlaybackMode: boolean
  playbackTime: Date
  playbackSpeed: 1 | 2 | 5 | 10
  isPlaybackPlaying: boolean
  
  // Auth / User
  user: User | null
  watchlist: WatchlistItem[]
  
  // Realtime
  realtimeConnected: boolean
  
  // Actions
  setEvents: (events: GlobeEvent[]) => void
  addEvent: (event: GlobeEvent) => void  // for realtime push
  updateEvent: (id: string, patch: Partial<GlobeEvent>) => void
  setSelectedEvent: (event: GlobeEvent | null) => void
  setHoveredEvent: (event: GlobeEvent | null, pos: ScreenPosition | null) => void
  setFilters: (filters: Partial<Filters>) => void
  clearFilters: () => void
  setUser: (user: User | null) => void
  setWatchlist: (items: WatchlistItem[]) => void
  setForexPairs: (pairs: ForexPair[]) => void
  setRealtimeConnected: (connected: boolean) => void
  enterPlayback: () => void
  exitPlayback: () => void
  setPlaybackTime: (t: Date) => void
  setPlaybackSpeed: (s: 1 | 2 | 5 | 10) => void
  togglePlayback: () => void
  
  // Computed (derived, recalculated when events or filters change)
  _recomputeFiltered: () => void
}
```

The `_recomputeFiltered` function applies all active filters to `events` to produce `filteredEvents`. Call it inside `setEvents`, `addEvent`, `updateEvent`, and `setFilters`.

### Task 2.11 — Wire everything into page.tsx

Update `src/app/page.tsx` to:
- Render `AppShell` wrapping the whole page
- `GlobeWrapper` in the center, receiving `filteredEvents` from store
- `EventModal` rendered when `isEventModalOpen` is true
- `TooltipOverlay` positioned using `hoveredEvent` + screen pos from the ref
- `ForexPanel` on the right (receives `forexPairs` from store, `flyTo` ref)
- `NewsTicker` at bottom (receives `filteredEvents`)
- `FilterBar` at top
- All connected to Zustand store actions

### Task 2.12 — Verify Phase 2

```bash
npm run dev
```

Verify:
- All UI components render without errors
- Clicking a mock event marker opens the EventModal
- Filters change which markers are visible on the globe
- Search filters events in real time
- ForexPanel shows 5 mock pairs
- Ticker scrolls continuously
- Tooltip appears on hover
- Modal closes on Escape and X button
- App is responsive (test at 375px mobile width)

```bash
npm run build && npx tsc --noEmit
```

Zero errors. Commit:
```bash
git add -A && git commit -m "feat: phase 2 — complete UI shell and all components"
```

---

## PHASE 3 — Database, Supabase & Realtime

**Goal:** Real data in, real data out. Events stored in Postgres, fetched on load, new events pushed to all browsers via Supabase Realtime.

### Task 3.1 — Supabase client setup

Write `src/lib/supabase/client.ts` (browser client):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Write `src/lib/supabase/server.ts` (server client for API routes and RSCs):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
}
```

Write `src/middleware.ts`:
- Intercept all requests
- Refresh Supabase session on every request
- Protect `/admin` routes: require `ADMIN_SECRET` header or admin user role
- Gate `/api/stripe/*` appropriately

### Task 3.2 — Full database schema

Create `supabase/migrations/001_initial_schema.sql` with the complete schema:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro', 'api')),
  stripe_customer_id text unique,
  subscription_status text check (subscription_status in ('active','canceled','past_due','trialing')),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Events table
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  headline text not null,
  country text not null,
  lat numeric(9,6) not null,
  lon numeric(9,6) not null,
  impact_level text not null check (impact_level in ('Critical','High','Medium','Low')),
  category text not null check (category in ('Geopolitical','Central Bank','Macro','Political','Crisis','Sanctions','Earnings','Natural Disaster')),
  summary text not null,
  sentiment text not null,
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  is_market_moving boolean not null default false,
  published_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  source_url text,
  source_headline text,
  created_by text not null default 'ai-confirmed' check (created_by in ('ai-auto','ai-confirmed','manual')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Forex impacts (linked to events)
create table public.event_forex_impacts (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  pair text not null,
  direction integer not null check (direction in (1,-1)),
  magnitude text not null check (magnitude in ('Large','Medium','Small')),
  move_percent text not null,
  reasoning text not null,
  created_at timestamptz not null default now()
);

-- Forex cache (latest prices from Twelve Data)
create table public.forex_cache (
  pair text primary key,
  current_price numeric(16,6),
  change_24h numeric(10,6),
  change_percent_24h numeric(8,4),
  sparkline_data jsonb, -- array of 24 numbers
  driving_event_id uuid references public.events(id) on delete set null,
  last_updated timestamptz not null default now()
);

-- Watchlist
create table public.watchlist_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('country','forex_pair')),
  value text not null,
  created_at timestamptz not null default now(),
  unique(user_id, type, value)
);

-- Push subscriptions (Web Push)
create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- RSS sources
create table public.rss_sources (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  url text not null unique,
  is_active boolean not null default true,
  last_polled_at timestamptz,
  created_at timestamptz not null default now()
);

-- Deduplication log
create table public.event_dedup_log (
  id uuid primary key default uuid_generate_v4(),
  source_headline text not null,
  source_url text,
  matched_event_id uuid references public.events(id) on delete set null,
  action text not null check (action in ('created','merged','skipped')),
  created_at timestamptz not null default now()
);

-- API keys (for API tier)
create table public.api_keys (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  key_hash text not null unique, -- store bcrypt hash only
  key_prefix text not null,      -- first 8 chars for display
  name text,
  last_used_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_events_published_at on public.events(published_at desc);
create index idx_events_expires_at on public.events(expires_at) where is_active = true;
create index idx_events_country on public.events(country);
create index idx_events_impact_level on public.events(impact_level);
create index idx_events_category on public.events(category);
create index idx_event_forex_impacts_event_id on public.event_forex_impacts(event_id);
create index idx_watchlist_user_id on public.watchlist_items(user_id);
create index idx_push_subs_user_id on public.push_subscriptions(user_id);

-- Enable Realtime for events table
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_forex_impacts;
```

### Task 3.3 — Row Level Security policies

Create `supabase/migrations/002_rls.sql`:

```sql
-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.event_forex_impacts enable row level security;
alter table public.forex_cache enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.api_keys enable row level security;

-- Events: public read for active, non-expired events
create policy "events_public_read" on public.events
  for select using (is_active = true and expires_at > now());

-- Events: only service role can insert/update
create policy "events_service_write" on public.events
  for all using (auth.role() = 'service_role');

-- Forex cache: public read
create policy "forex_cache_public_read" on public.forex_cache
  for select using (true);

-- Forex impacts: public read
create policy "event_forex_impacts_public_read" on public.event_forex_impacts
  for select using (true);

-- Watchlist: users see only their own
create policy "watchlist_own" on public.watchlist_items
  for all using (auth.uid() = user_id);

-- Push subscriptions: users see only their own
create policy "push_subs_own" on public.push_subscriptions
  for all using (auth.uid() = user_id);

-- Users: users see only themselves
create policy "users_own" on public.users
  for select using (auth.uid() = id);

-- API keys: users see only their own
create policy "api_keys_own" on public.api_keys
  for select using (auth.uid() = user_id);
```

### Task 3.4 — Default RSS sources seed

Create `supabase/migrations/003_seed.sql`:
```sql
insert into public.rss_sources (name, url) values
  ('Reuters World', 'https://feeds.reuters.com/reuters/worldNews'),
  ('BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml'),
  ('FT World', 'https://www.ft.com/world?format=rss');
```

### Task 3.5 — Events API routes

Write `src/app/api/events/route.ts` (GET + POST):

GET handler:
- Query params: `category`, `impactLevel`, `timeRange`, `search`, `limit` (default 50), `offset`
- Uses server Supabase client
- Joins `event_forex_impacts` table
- Maps DB rows to `GlobeEvent` type
- Returns `{ events: GlobeEvent[], total: number }`
- Includes proper Cache-Control headers (max-age=30)

POST handler:
- Requires admin auth (check `Authorization: Bearer ${ADMIN_SECRET}` header)
- Validates body against `GlobeEvent` schema
- Inserts event + forex impacts in a transaction
- Returns created event

Write `src/app/api/events/[id]/route.ts` (GET single event with full detail).

### Task 3.6 — Supabase Realtime hook

Write `src/lib/realtime/useRealtimeEvents.ts`:

```typescript
export function useRealtimeEvents() {
  const { addEvent, updateEvent, setRealtimeConnected } = useGlobeStore()
  
  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'events' },
        async (payload) => {
          // Fetch the complete event with forex impacts
          const { data } = await supabase
            .from('events')
            .select('*, event_forex_impacts(*)')
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            addEvent(mapDbEventToGlobeEvent(data))
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        (payload) => {
          updateEvent(payload.new.id, mapDbEventToGlobeEvent(payload.new as any))
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED')
      })
    
    return () => { supabase.removeChannel(channel) }
  }, [])
}
```

Call this hook inside `AppShell.tsx`.

### Task 3.7 — Replace mock data with real API

Update `src/hooks/useEvents.ts` using SWR:
```typescript
export function useEvents() {
  const setEvents = useGlobeStore(s => s.setEvents)
  const filters = useGlobeStore(s => s.filters)
  
  const { data, error, isLoading } = useSWR(
    ['/api/events', filters],
    ([url, f]) => fetcher(url, f),
    { refreshInterval: 60000, revalidateOnFocus: false }
  )
  
  useEffect(() => {
    if (data?.events) setEvents(data.events)
  }, [data])
  
  return { isLoading, error }
}
```

Call this in `AppShell.tsx`. Remove all mock data imports from `page.tsx`.

### Task 3.8 — Verify Phase 3

Test the full data flow:
1. Insert a test event directly in Supabase dashboard
2. Verify it appears on the globe within 2 seconds (Realtime)
3. Verify filters work against real data
4. Verify the build passes: `npm run build`

```bash
git add -A && git commit -m "feat: phase 3 — Supabase database, API routes, and Realtime"
```

---

## PHASE 4 — AI Pipeline & News Analysis

**Goal:** Paste raw news text → Claude extracts structured event → appears on globe. RSS auto-polling running every 15 minutes.

### Task 4.1 — Anthropic client

Write `src/lib/anthropic/client.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk'
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
```

### Task 4.2 — The Claude news analysis prompt

Write `src/lib/anthropic/prompts.ts` with the complete system prompt and user prompt template.

The system prompt must:
1. Define the AI's role precisely: "You are a specialized financial news analyst. Your job is to parse raw news articles and extract structured data for a real-time forex market intelligence platform."
2. Define the exact JSON schema to return (use TypeScript-style inline type definition)
3. Include 5 complete few-shot examples — one per category type — showing perfect input/output pairs:
   - Example 1: Central Bank rate decision (BoJ rate hike)
   - Example 2: Geopolitical event (Middle East conflict escalation)
   - Example 3: Macro data miss (China GDP below forecast)
   - Example 4: Political event (election result)
   - Example 5: Natural Disaster (earthquake in key economic region)
4. Include negative examples showing what NOT to do
5. State explicitly: return ONLY valid JSON, no markdown, no preamble, no ```json fences
6. State refusal criteria: opinion pieces, press releases, non-news content return `{"error": "reason"}`
7. Define confidence score rubric: what earns 90+, 70-89, 50-69, below 50

The user prompt template:
```
Analyze this news article and extract structured event data.

Article:
{ARTICLE_TEXT}

Return ONLY the JSON object. No other text.
```

### Task 4.3 — POST /api/events/analyze route

Write the complete route handler in `src/app/api/events/analyze/route.ts`:

```typescript
// Full implementation must include:
// 1. Admin auth check
// 2. Input validation (text: string, 50-10000 chars)
// 3. Call to Anthropic API with the prompt from prompts.ts
//    - Model: claude-sonnet-4-20250514
//    - Max tokens: 1024
//    - Temperature: 0 (deterministic output for structured data)
// 4. Parse JSON from Claude response
// 5. Validate all required fields are present and correct types
// 6. If Claude returns { error }, return 422 with the error message
// 7. Return the parsed event preview (NOT saved to DB yet)
// 8. Retry logic: if status 529 (overload), wait 2s and retry once
// 9. Log token usage to console (for cost monitoring)
// 10. Error handling for: API timeout, invalid JSON, missing fields
```

### Task 4.4 — POST /api/events/confirm route

Write `src/app/api/events/confirm/route.ts`:
- Receives the full parsed event object from the admin
- Allows field overrides (admin can edit before confirming)
- Inserts into `events` table + `event_forex_impacts` table
- Returns the created event with its DB ID
- Triggers push notifications for affected watchlist users (async, don't await)

### Task 4.5 — Admin paste panel

Write `src/components/admin/PastePanel.tsx`:
- Large textarea: "Paste raw news article here..."
- "Analyze with Claude" button — calls `/api/events/analyze`
- Loading state: spinner with "Claude is analyzing..." message
- Shows the parsed EventPreview component on success
- Error banner on failure

Write `src/components/admin/EventPreview.tsx`:
- Shows all parsed fields in an editable form
- Impact level: clickable badge selector (4 options)
- Category: dropdown
- Headline: editable text input (pre-filled from Claude)
- Lat/lon: number inputs with a mini map preview (show country name for the coords)
- Summary: editable textarea
- Forex impacts: table with Add/Remove rows
- Confidence score: readonly display with color bar
- "Publish to Globe" button → calls `/api/events/confirm`
- "Discard" button → clears the preview

Write `src/app/admin/page.tsx`:
- Check admin auth (ADMIN_SECRET or admin user role)
- Render `PastePanel`
- Below: a table of recent events (last 20) with status, confidence score, and delete button

### Task 4.6 — Deduplication logic

Write `src/lib/utils/dedup.ts`:
```typescript
// checkDuplicate(headline: string, existingHeadlines: string[]): boolean
// Uses normalized Levenshtein distance
// Returns true if similarity > 0.75 with any existing headline from last 2 hours
// Normalize: lowercase, remove punctuation, remove common stop words
```

### Task 4.7 — RSS poller

Write `src/app/api/rss/poll/route.ts`:

Complete implementation:
1. Verify `Authorization: Bearer ${CRON_SECRET}` header
2. Fetch all active RSS sources from DB
3. For each source: use `rss-parser` to fetch and parse the feed
4. Filter to articles published in the last 16 minutes (slightly over the 15-minute interval to avoid gaps)
5. For each new article:
   a. Check deduplication against last 2 hours of DB headlines
   b. If duplicate: log to `event_dedup_log` with action='skipped', continue
   c. Submit to Claude for analysis (call the analyze logic directly, not via HTTP)
   d. If `confidenceScore >= 80` AND `isMarketMoving === true`: auto-confirm and insert to DB
   e. Otherwise: insert to a pending review queue (add a `status: 'pending'` column to events if needed)
6. Return summary: `{ processed: N, published: N, skipped: N, pending: N }`

### Task 4.8 — Vercel Cron config

Add to `vercel.json` (create if not exists):
```json
{
  "crons": [
    {
      "path": "/api/rss/poll",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### Task 4.9 — Verify Phase 4

1. Open `/admin`
2. Paste a real Reuters article
3. Verify Claude returns structured data within 5 seconds
4. Edit the headline, click "Publish to Globe"
5. Verify the event appears on the globe within 2 seconds (Realtime push)
6. Check confidence score displays correctly

```bash
npm run build
git add -A && git commit -m "feat: phase 4 — AI pipeline, admin panel, RSS poller"
```

---

## PHASE 5 — Forex Data Integration

**Goal:** Real live forex prices. The ForexPanel shows actual market moves, sparklines reflect real 24h data, and forex moves are linked to news events.

### Task 5.1 — Twelve Data API wrapper

Write `src/lib/forex/twelvedata.ts`:

```typescript
const BASE_URL = 'https://api.twelvedata.com'
const API_KEY = process.env.TWELVE_DATA_API_KEY

// getQuotes(pairs: string[]): Promise<ForexPair[]>
// Fetches current price + 24h change for multiple pairs in one call
// Uses the /quote endpoint with comma-separated symbols

// getTimeSeries(pair: string, points: 24): Promise<number[]>
// Fetches last 24 hourly close prices for sparkline
// Uses /time_series with interval=1h, outputsize=24

// getPairsMoves(pairs: string[]): Promise<ForexPair[]>
// Combines getQuotes + getTimeSeries into one ForexPair[] array
// Handles rate limiting: Twelve Data free tier = 8 req/min
// Add 500ms delay between batch calls if needed
```

The 5 pairs to track initially:
`['EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 'AUD/USD']`

Plus any pairs mentioned in active events (pulled from `event_forex_impacts`).

### Task 5.2 — Forex API routes

Write `src/app/api/forex/pairs/route.ts`:
- Returns the 5 base pairs + any pairs from active events
- Reads from `forex_cache` table (serves cached data for speed)
- If cache is stale (>90 seconds old): refreshes from Twelve Data, updates cache, returns fresh data
- Includes `Cache-Control: public, max-age=60` header

Write `src/app/api/forex/sparkline/[pair]/route.ts`:
- Returns `{ data: number[], pair: string }` for the sparkline chart
- Reads from `sparkline_data` in `forex_cache`
- Pair param format: `USD-JPY` (hyphen, not slash — URL safe)

### Task 5.3 — Forex refresh job

Add a second cron in `vercel.json`:
```json
{ "path": "/api/forex/refresh", "schedule": "* * * * *" }
```

Write `src/app/api/forex/refresh/route.ts`:
- Runs every minute (secured with CRON_SECRET)
- Fetches all relevant pairs from Twelve Data
- Updates `forex_cache` table
- Links forex moves to driving events: for each pair, find the most recent active event that mentions that pair in its forex_impacts, link it as `driving_event_id`

### Task 5.4 — Connect ForexPanel to real data

Write `src/hooks/useForex.ts`:
```typescript
export function useForex() {
  const setForexPairs = useGlobeStore(s => s.setForexPairs)
  
  const { data } = useSWR('/api/forex/pairs', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  })
  
  useEffect(() => {
    if (data?.pairs) setForexPairs(data.pairs)
  }, [data])
}
```

Call in `AppShell.tsx`. Remove all mock forex data.

### Task 5.5 — Verify Phase 5

1. Open the app
2. ForexPanel shows real prices and sparklines
3. Prices refresh every 60 seconds
4. Clicking a forex pair flies the globe to the linked event location
5. Build passes: `npm run build`

```bash
git add -A && git commit -m "feat: phase 5 — live forex data, sparklines, cache"
```

---

## PHASE 6 — Auth, Accounts & Stripe Billing

**Goal:** Users can sign up, log in, save watchlists, and pay for Pro. Feature gating is enforced.

### Task 6.1 — Supabase Auth setup

Write `src/components/auth/LoginForm.tsx`:
- Email/password fields
- "Sign in with Google" button
- Error display
- Redirect to `/` on success

Write `src/components/auth/SignupForm.tsx`:
- Email/password/confirm password
- "Create account" button
- Terms agreement checkbox
- On signup: creates user in `public.users` table via a Supabase trigger (write the trigger SQL in a new migration)

Write the trigger migration `supabase/migrations/004_user_trigger.sql`:
```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

Write `src/app/(auth)/login/page.tsx` and `src/app/(auth)/signup/page.tsx`.

Update `TopBar.tsx`: show user email + avatar when logged in, sign out button.

### Task 6.2 — Stripe setup

Write `src/lib/stripe/client.ts`:
```typescript
import Stripe from 'stripe'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})
```

Write `src/lib/stripe/plans.ts`:
```typescript
export const PLANS = {
  free: {
    name: 'Free',
    features: ['Globe view', 'Last 24h events', '3 forex pairs', 'No watchlist'],
    forexPairLimit: 3,
    historyHours: 24,
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    price: '$19/month',
    features: ['All events (48h)', 'All forex pairs', 'Historical playback', 'Watchlist', 'Push notifications', 'CSV export'],
    forexPairLimit: Infinity,
    historyHours: 48,
  },
  api: {
    name: 'API',
    priceId: process.env.STRIPE_API_PRICE_ID!,
    price: '$99/month',
    features: ['Everything in Pro', 'Raw JSON API', 'Webhooks', 'API key management'],
    forexPairLimit: Infinity,
    historyHours: 168,
  },
}

export function canAccessFeature(tier: string, feature: string): boolean {
  // Define which features require which tier
  // e.g. 'historical_playback' requires 'pro' or 'api'
}
```

### Task 6.3 — Stripe API routes

Write `src/app/api/stripe/checkout/route.ts`:
- Creates a Stripe Checkout Session
- `success_url` and `cancel_url` pointing back to app
- Attaches user's email and ID as metadata
- Returns `{ url: string }` — frontend redirects to it

Write `src/app/api/stripe/portal/route.ts`:
- Creates a Stripe Customer Portal session for the logged-in user
- Returns the portal URL

Write `src/app/api/stripe/webhook/route.ts`:
- Verifies Stripe signature with `stripe.webhooks.constructEvent`
- Handles these events:
  - `checkout.session.completed`: update user's `plan_tier` to 'pro', set `subscription_status` to 'active', store `stripe_customer_id`
  - `customer.subscription.updated`: sync `subscription_status` and `plan_tier`
  - `customer.subscription.deleted`: set `plan_tier` back to 'free', `subscription_status` to 'canceled'
  - `invoice.payment_failed`: set `subscription_status` to 'past_due'
  - `customer.subscription.trial_will_end`: (future: send email reminder)
- Returns 200 immediately after signature verification
- All DB updates use the service role key

Write `src/app/api/user/subscription/route.ts`:
- Returns the authenticated user's `plan_tier` and `subscription_status`

### Task 6.4 — ProGate component and hook

Write `src/hooks/useProGate.ts`:
```typescript
export function useProGate(feature: string) {
  const user = useGlobeStore(s => s.user)
  const canAccess = user ? canAccessFeature(user.planTier, feature) : false
  return { canAccess, tier: user?.planTier ?? 'free' }
}
```

Write `src/components/ui/ProGate.tsx`:
- Wraps any children
- If user can access: renders children
- If not: renders an upgrade CTA overlay
- CTA: feature name, what Pro includes, "Upgrade to Pro — $19/month" button
- Button links to Stripe checkout

### Task 6.5 — Watchlist implementation

Write `src/hooks/useWatchlist.ts`:
- `addToWatchlist(type, value)`: calls `POST /api/watchlist`
- `removeFromWatchlist(id)`: calls `DELETE /api/watchlist/:id`
- `isWatching(type, value)`: checks local store

Write `src/app/api/watchlist/route.ts` (GET + POST + DELETE).

Update `EventModal.tsx`:
- "Watch this country" button calls `addToWatchlist('country', event.country)`
- Shows filled/outlined star based on watch state

Update `ForexPanel.tsx`:
- Forex pair rows have a watch toggle

### Task 6.6 — Push notifications

Write `src/app/api/push/subscribe/route.ts`:
- Receives browser push subscription object
- Stores in `push_subscriptions` table for the authenticated user

Write a `sendPushNotification(userId, title, body, url)` server-side utility in `src/lib/push.ts`:
```typescript
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function notifyUser(userId: string, payload: { title: string; body: string; url: string }) {
  // Fetch all push subscriptions for user
  // Send to each endpoint using webpush.sendNotification
  // Handle expired subscriptions: delete from DB on 410 response
}
```

Call `notifyUser` from `confirm/route.ts` after publishing — notify all users who watch the affected country or any of the affected forex pairs.

### Task 6.7 — Verify Phase 6

1. Sign up for a new account
2. Verify user appears in `public.users` table
3. Try to access Pro feature (historical playback) — see upgrade prompt
4. Complete Stripe checkout (use test card 4242 4242 4242 4242)
5. Verify `plan_tier` updates to 'pro' in DB
6. Verify Pro features are now accessible
7. Add a country to watchlist
8. Publish a test event for that country — verify push notification fires

```bash
npm run build
git add -A && git commit -m "feat: phase 6 — auth, Stripe billing, watchlist, push notifications"
```

---

## PHASE 7 — Historical Playback & Advanced Features

**Goal:** The last major feature block — historical replay, CSV export, the full filter URL param system, and connection status indicator.

### Task 7.1 — Historical playback

Write `src/hooks/usePlayback.ts`:
- `enterPlayback()`: fetches all events from the last 48h (including expired ones — add `include_expired=true` param to events API)
- Stores them in a sorted-by-timestamp array
- Starts a `setInterval` that advances `playbackTime` by (intervalMs * speed) every 100ms
- At each tick: filters `playbackEvents` to only those published before `playbackTime`, updates the store
- `exitPlayback()`: clears interval, restores live events
- `setSpeed(n)`: updates the multiplier

Update `PlaybackControls.tsx`:
- Wire all buttons to the `usePlayback` hook
- Timeline scrubber: `min=now-48h`, `max=now`, step=60 (minutes). Shows a density visualization above it.
- Wrap entire component in `<ProGate feature="historical_playback">`

Update the events API to support `include_expired=true` param (bypass the `expires_at > now()` filter).

### Task 7.2 — CSV export

Add a "Export CSV" button to the FilterBar (Pro-gated).

On click: call a new route `GET /api/events/export`:
- Requires Pro tier
- Returns all `filteredEvents` (respecting current filters) as a CSV download
- Headers: `id, headline, country, lat, lon, impact_level, category, published_at, forex_pairs`
- `Content-Disposition: attachment; filename="impactglobe-events-{date}.csv"`

### Task 7.3 — URL param filter sync

Update `FilterBar.tsx` to fully sync with URL params:
- On mount: read URL params and initialize filters from them
- On filter change: use `router.replace` (not push) to update URL params without adding to history
- Shareable URL example: `/?category=Geopolitical,Crisis&impact=Critical,High&timeRange=24h&q=Japan`

### Task 7.4 — ConnectionStatus indicator

Update `TopBar.tsx` `ConnectionStatus` component:
- Green dot + "Live" when Supabase Realtime is connected
- Yellow dot + "Connecting..." during reconnection
- Red dot + "Offline" when disconnected
- Auto-reconnect: if disconnected for >10 seconds, attempt manual reconnect

### Task 7.5 — Onboarding flow

Write `src/components/ui/OnboardingFlow.tsx`:
- Show only on first visit (use `localStorage.setItem('hasSeenOnboarding', 'true')`)
- 3 steps:
  1. Highlight the globe: "Click any pulsing marker to see a live news event" (arrow pointing at nearest event)
  2. Highlight FilterBar: "Filter by category, impact, or search for a country"
  3. Highlight the sign-in button: "Create a free account to watch countries and get notified"
- Backdrop darkens non-highlighted areas
- "Skip" and "Next" buttons, progress dots
- Escape key skips

### Task 7.6 — SEO & metadata

Update `src/app/layout.tsx` with complete metadata:
```typescript
export const metadata: Metadata = {
  title: 'ImpactGlobe — Real-time Geopolitical Risk Monitor',
  description: 'Track global news events and their forex impact in real time. Powered by AI.',
  openGraph: {
    title: 'ImpactGlobe',
    description: 'Real-time geopolitical risk on a 3D globe',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
}
```

Create a static OG image at `public/og-image.png` — a dark background with the globe and the ImpactGlobe logo.

### Task 7.7 — Performance audit

Run Lighthouse audit in Chrome DevTools. Target scores:
- Performance: >85
- Accessibility: >90
- Best Practices: >95

Optimizations to implement:
- Three.js must be lazy-loaded (already done via `GlobeWrapper`)
- Verify no layout shift (CLS < 0.1)
- Add `loading="lazy"` to any off-screen images
- Run `npm run build` and check bundle sizes. If Three.js chunk > 800KB, investigate tree-shaking.
- Add `<link rel="preconnect">` for Google Fonts and Supabase domains

### Task 7.8 — Error monitoring setup

Add Sentry (if SENTRY_DSN is in env):
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Configure to capture:
- All unhandled API route errors
- Globe renderer WebGL errors
- Claude API failures
- Stripe webhook failures

### Task 7.9 — Final verification

```bash
npm run build && npx tsc --noEmit
```

Zero errors. Zero TypeScript warnings.

Test the complete user journey:
1. New visitor → sees onboarding
2. Globe loads with live events and ripple animations
3. Hover over marker → tooltip appears
4. Click marker → EventModal opens with full detail
5. Close modal → filter by "Critical" → only critical events show
6. Search "Japan" → only Japan events visible
7. Sign up → pro upgrade → historical playback works
8. Admin panel → paste news → event appears on globe in <3 seconds
9. ForexPanel refreshes every minute
10. Ticker scrolls all events

```bash
git add -A && git commit -m "feat: phase 7 — playback, export, onboarding, SEO, performance"
```

---

## PHASE 8 — Pre-Launch & Deployment

**Goal:** Vercel deployment live, Stripe in production mode, all environment variables set, monitoring on.

### Task 8.1 — Vercel deployment

```bash
npm install -g vercel
vercel --prod
```

Set all environment variables in Vercel dashboard (mirror `.env.local`).

### Task 8.2 — Stripe production mode

- Switch Stripe keys from test to live in Vercel env vars
- Register the production webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
- Add the live webhook secret to Vercel env vars

### Task 8.3 — Supabase production config

- Set allowed origins for CORS in Supabase dashboard to your Vercel domain
- Enable email auth in Supabase Auth settings
- Set the Supabase redirect URL to your Vercel domain
- Run all migrations against the production Supabase project

### Task 8.4 — Pre-launch checklist

Verify each item:
- [ ] Globe renders correctly in Chrome, Firefox, Safari, Edge
- [ ] Mobile (375px width) is usable — globe is tappable, ForexPanel is collapsible
- [ ] All API routes return proper error responses (not 500 with stack traces)
- [ ] Stripe webhook verified in Stripe dashboard (green checkmark)
- [ ] Privacy policy page exists at `/privacy`
- [ ] Terms of service page exists at `/terms`
- [ ] VAPID keys generated for web push (`npx web-push generate-vapid-keys`)
- [ ] Admin route is protected and not publicly discoverable
- [ ] `.env.example` is up to date
- [ ] No secrets in git history (`git log --all --oneline | head -20`)
- [ ] Sentry capturing errors in production
- [ ] Google Analytics or Vercel Analytics enabled
- [ ] Robots.txt allows indexing (`public/robots.txt`)
- [ ] Sitemap exists (`src/app/sitemap.ts`)

### Task 8.5 — Update BUILD_STATE.md

```markdown
# ImpactGlobe Build State

## Status: PRODUCTION LIVE

## All Phases Complete
- [x] Phase 0: Foundation
- [x] Phase 1: Globe Renderer  
- [x] Phase 2: UI Components
- [x] Phase 3: Database & Realtime
- [x] Phase 4: AI Pipeline
- [x] Phase 5: Forex Data
- [x] Phase 6: Auth & Billing
- [x] Phase 7: Advanced Features
- [x] Phase 8: Production Deployment

## Live URLs
- App: https://impactglobe.vercel.app
- Admin: https://impactglobe.vercel.app/admin
- Supabase: [your project URL]
```

---

## CONTINUING AFTER LAUNCH — Future Phases

When the above is complete and you want to continue building, here are queued phases:

**Phase 9 — Mobile optimization:** Responsive globe controls, touch-friendly tap targets, collapsible panels, PWA manifest for "Add to Home Screen"

**Phase 10 — API tier:** Public JSON API with key authentication, rate limiting middleware, webhook delivery system, developer documentation page at `/docs`

**Phase 11 — Email digest:** Daily email summary of watchlist events using a transactional email provider (Resend or SendGrid), unsubscribe handling

**Phase 12 — Analytics dashboard:** Per-user event history, most-watched countries, accuracy tracking of AI confidence scores vs actual market moves

---

## IMPORTANT NOTES FOR CLAUDE CODE

- **This file is your single source of truth.** If something in the codebase contradicts this file, fix the codebase to match this file.
- **Check BUILD_STATE.md first.** Always. Every session.
- **Do not start Phase N+1 until Phase N is verified.** `npm run build` passing is the bar.
- **When in doubt about a UI decision:** go darker, denser, more professional. This is a fintech product.
- **When in doubt about a technical decision:** choose the simpler, more maintainable option. Solo founder codebase.
- **The globe is the product.** Every other feature exists to make the globe more valuable. If something doesn't serve the globe experience, deprioritize it.