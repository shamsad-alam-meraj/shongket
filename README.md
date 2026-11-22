# SHONGKET · সংকেত

**Understand the world around you.**
A real-world intelligence platform: live local signals from news, official hazard feeds, weather, air quality and community reports — verified, mapped and explained. Bangladesh-born. Built for the world.

- `/` — marketing site (GSAP scroll animations, live Dhaka preview)
- `/live` — live intelligence map: asks for browser location, shows nearby incidents, hazards, environment and essential services

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind CSS 4 · shadcn/ui · GSAP (ScrollTrigger, SplitText, DrawSVG) · MapLibre GL + OpenFreeMap tiles

Fonts: Unbounded (display), Sora (UI), Instrument Serif (accents), Martian Mono (data), Anek Bangla (বাংলা).

## Real data sources

| Signal | Source | Notes |
| --- | --- | --- |
| Street incidents — fire (আগুন), hartal (হরতাল), processions/rallies (মিছিল), blockades (অবরোধ), clashes, traffic jams (with cause), road accidents, waterlogging, power outages | Bangladeshi news via Google News RSS (Bangla + English, last 24 h) | Headlines are classified, placed with a Dhaka/Bangladesh gazetteer (area-level, approximate) and clustered. **2+ independent outlets → confirmed**, 1 → unverified. Price idioms ("বাজারে আগুন") are filtered out. |
| Live traffic — jams, closures, accidents, roadworks with cause and delay | TomTom Traffic API | Optional: set `TOMTOM_API_KEY`. One request per ~16 km area, cached 20 min, capped per day; stale data is served if the budget runs out |
| Community reports | Built-in (`/api/reports`) | Unverified until 3 nearby confirmations; expire after 6 h |
| Weather, rain outlook, heat, wind | Open-Meteo | |
| Air quality (US AQI, PM2.5) | Open-Meteo Air Quality (CAMS) | |
| River flow forecast | GloFAS via Open-Meteo Flood API | |
| Earthquakes | USGS | M2.5+ past week, M4.5+ past month (≤ 7 days shown) |
| Cyclones, floods, wildfires, volcanoes | GDACS, NASA EONET | |
| Hospitals, clinics, pharmacies, police, fire service | OpenStreetMap (Overpass) | Within 3 km |
| Place names | BigDataCloud reverse geocoding | |

Coordinates sent to third-party providers are rounded (~1 km); exact distances are computed on our server only. Status colours describe SHONGKET's assessment, not official government warnings.

## Getting started

```bash
npm install          # also copies MapLibre's worker into public/vendor
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/live (allow location when the browser asks).

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Production | Canonical URL for metadata, sitemap, OG images |
| `TOMTOM_API_KEY` | Optional | Real-time traffic incidents. Free key at https://my.tomtom.com/ — verify with `npm run check:traffic` |
| `TOMTOM_DAILY_LIMIT` / `TOMTOM_CACHE_MINUTES` | Optional | Request budget (defaults 80/day, 20 min) — keeps within the ~2,500/month free tier |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Recommended in production | Durable, shared store for community reports (serverless filesystems don't persist) |

## Deploy

Works on any Node host; Vercel is the simplest:

1. Import the repository, framework preset **Next.js** (root directory = repo root).
2. Set the environment variables above.
3. Deploy. `postinstall` copies the MapLibre worker automatically.

Geolocation requires HTTPS (or `localhost`).

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run check:traffic  # verify TOMTOM_API_KEY with one request
```

## Project layout

```
src/
  app/                 routes, API handlers, icons, OG image, manifest, robots, sitemap
    api/signals        aggregates all feeds for a location
    api/services       nearby essential services (OSM)
    api/reports        community reports (POST) and votes (PATCH), rate-limited
  components/
    home/              marketing sections
    live/              live dashboard, MapLibre map, report dialog
    motion/            scroll reveal + motion guard (content never depends on rAF)
  hooks/               geolocation, live data
  lib/live/            feed adapters, news classifier, report store, cache, rate limit
```

## Production notes

- Security headers (HSTS, nosniff, frame-deny, referrer policy, `Permissions-Policy: geolocation=(self)`) in `next.config.ts`.
- API routes are rate-limited per IP (in-memory; use a shared store at scale) and cached server-side (feeds 5 min, news 10 min, services 30 min).
- Every feed fails independently; the **Sources** tab on `/live` shows live status of each.
- Animations respect `prefers-reduced-motion`, and a timer-based motion guard guarantees content becomes visible even if `requestAnimationFrame` is paused.
