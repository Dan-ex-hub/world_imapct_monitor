# ImpactGlobe

Real-time geopolitical risk monitoring on an interactive 3D globe with AI-powered forex impact analysis and environmental data layers.

## Features

- **Interactive 3D Globe**: Powered by Three.js with animated ripple markers for news events
- **AI Analysis**: Claude-powered analysis of news events and forex market impacts
- **Environmental Layers**: Real-time data for wind, air quality, earthquakes, wildfires, storms, and temperature anomalies
- **Forex Impact**: Live forex pair movements with AI-generated impact analysis
- **Historical Playback**: Replay events from the last 48 hours
- **Watchlists**: Track specific countries and forex pairs (requires free account)
- **Push Notifications**: Get notified about events you're watching
- **100% Free**: All features available to all users

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **3D Rendering**: Three.js
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Database**: Supabase (Postgres + Auth + Realtime)
- **AI**: Anthropic Claude API
- **Forex Data**: Twelve Data API
- **Environmental Data**: Open-Meteo, OpenAQ, USGS, NASA EONET, NOAA (all free APIs)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier)
- Anthropic API key
- Twelve Data API key (free tier)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/impactglobe.git
cd impactglobe
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual API keys and configuration.

### Generate VAPID Keys for Push Notifications

To enable push notifications, you need to generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

This will output:
```
=======================================
Public Key:
YOUR_PUBLIC_KEY_HERE

Private Key:
YOUR_PRIVATE_KEY_HERE
=======================================
```

Add these to your `.env.local`:
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
VAPID_SUBJECT=mailto:your-email@yourdomain.com
```

### Database Setup

1. Create a new Supabase project at https://supabase.com
2. Run the database migrations (see `BUILD_STATE.md` for schema)
3. Enable Realtime for the `events` table in Supabase dashboard
4. Add your Supabase URL and keys to `.env.local`

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Environment Variables

See `.env.example` for all required environment variables:

- **Supabase**: Database and authentication
- **Anthropic**: AI analysis of news events
- **Twelve Data**: Forex market data
- **VAPID Keys**: Web push notifications
- **Admin/Cron Secrets**: Protect admin routes and cron jobs

## Data Sources

ImpactGlobe aggregates data from free public sources:

- **Open-Meteo**: Weather and climate data (no API key required)
- **OpenAQ**: Air quality index data (no API key required)
- **USGS**: Earthquake data (no API key required)
- **NASA EONET**: Wildfire and storm data (no API key required)
- **NOAA**: Weather alerts (no API key required)
- **Twelve Data**: Forex market data (free tier, API key required)
- **RSS Feeds**: News aggregation from various sources

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables from `.env.local` to Vercel project settings
4. Deploy

The `vercel.json` file includes cron job configurations for:
- RSS polling (every 15 minutes)
- Forex data refresh (every minute)
- Environmental data updates (various intervals)

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

Ensure cron jobs are configured separately if not using Vercel.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
├── components/             # React components
│   ├── globe/             # Three.js globe renderer and layers
│   ├── ui/                # UI components
│   ├── admin/             # Admin panel components
│   ├── auth/              # Authentication forms
│   └── layout/            # Layout components
├── lib/                   # Utilities and integrations
│   ├── supabase/          # Supabase client and helpers
│   ├── anthropic/         # Claude AI integration
│   ├── forex/             # Forex data integration
│   ├── env/               # Environmental data API wrappers
│   ├── push/              # Push notification utilities
│   └── utils/             # General utilities
├── store/                 # Zustand state management
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript type definitions
```

## Features in Detail

### Globe Renderer
- Animated ripple waves for news events
- Color-coded by impact level (Critical, High, Medium, Low)
- Interactive hover tooltips
- Click to view full event details
- Auto-rotation with manual control override

### Environmental Layers
- **Wind**: Animated particle flow visualization
- **Air Quality**: Color-coded AQI markers
- **Earthquakes**: Magnitude-scaled concentric rings
- **Wildfires**: Animated fire markers with glow effects
- **Storms**: Rotating spiral icons
- **Temperature Anomaly**: Diverging color scale overlay

### AI Analysis
- Automatic parsing of news headlines
- Forex pair impact prediction
- Confidence scoring
- Market-moving event detection

### Historical Playback
- Replay events from the last 48 hours
- Adjustable playback speed (1x, 2x, 5x, 10x)
- Timeline scrubber
- Pause/play controls

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Support

For questions or issues, please open a GitHub issue or contact support@impactglobe.com

## Acknowledgments

- Data provided by Open-Meteo, OpenAQ, USGS, NASA EONET, NOAA, and Twelve Data
- Built with Next.js, Three.js, and Supabase
- AI powered by Anthropic Claude

---

**Note**: This is a free product. All features are available to all users. Optional accounts enable watchlists and push notifications.
