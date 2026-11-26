/**
 * Routes engine — real roads, real disruptions.
 *
 *  - Photon (komoot)  → place search, limited to Bangladesh
 *  - OSRM             → driving routes + alternatives over OpenStreetMap roads
 *  - SHONGKET signals → news incidents, community reports, TomTom (if configured) within reach of
 *                       each route line, and rain at both ends (Open-Meteo)
 *
 * Nothing estimates "delay minutes": we show the free-flow time OSRM gives and the disruptions that
 * sit on or near the path, and say plainly which route has fewer of them.
 */
import "@/lib/live/net"
import { cached } from "@/lib/live/cache"
import { fetchNewsIncidents, newsSignals } from "@/lib/live/news"
import { reportSignals } from "@/lib/live/reports-store"
import { trafficEnabled, trafficSignals } from "@/lib/live/traffic"
import { haversineKm, type LiveSignal } from "@/lib/live/types"
import {
  MOBILITY_INCIDENTS, type GeoResult, type Hotspot, type Pt, type RouteHit, type RouteLevel, type RouteOption, type RoutesResponse,
} from "./types"

const UA = { "User-Agent": "SHONGKET/0.1 (+open-data prototype)" }
const BD_BBOX = "88.0,20.5,92.7,26.7"

async function getJson<T>(url: string, timeoutMs = 12000): Promise<T> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

// ───────────── Geocoding ─────────────
type Photon = { features: { geometry: { coordinates: [number, number] }; properties: Record<string, string | number | undefined> }[] }

export async function geocode(q: string, near?: Pt): Promise<GeoResult[]> {
  const bias = near ? `&lat=${near.lat.toFixed(2)}&lon=${near.lng.toFixed(2)}` : ""
  const d = await getJson<Photon>(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7&bbox=${BD_BBOX}&lang=en${bias}`,
    8000,
  )
  const seen = new Set<string>()
  const out: GeoResult[] = []
  for (const f of d.features) {
    const p = f.properties
    const name = String(p.name ?? p.street ?? "").trim()
    if (!name) continue
    const context = [p.district ?? p.locality, p.city, p.state].filter((x, i, a) => x && a.indexOf(x) === i && x !== name).join(", ")
    const key = `${name}|${context}`
    if (seen.has(key)) continue
    seen.add(key)
    const [lng, lat] = f.geometry.coordinates
    out.push({ id: `${p.osm_type}${p.osm_id}`, name, context, lat, lng })
  }
  return out.slice(0, 6)
}

// ───────────── Routing ─────────────
type OSRM = {
  code: string
  message?: string
  routes: { distance: number; duration: number; geometry: { coordinates: [number, number][] }; legs: { summary: string }[] }[]
}

async function osrm(from: Pt, to: Pt) {
  const d = await getJson<OSRM>(
    `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?alternatives=3&overview=full&geometries=geojson&steps=true`,
    15000,
  )
  if (d.code !== "Ok") throw new Error(d.message ?? d.code)
  return d.routes
}

// ───────────── Geometry ─────────────
/** Local equirectangular projection (km) — accurate enough for city-scale offsets. */
function project(origin: Pt) {
  const kx = 111.32 * Math.cos((origin.lat * Math.PI) / 180)
  return (p: Pt) => ({ x: (p.lng - origin.lng) * kx, y: (p.lat - origin.lat) * 110.57 })
}

/** Shortest distance from `p` to the polyline and how far along the line that closest point is. */
function nearestOnLine(line: [number, number][], p: Pt) {
  const proj = project(p)
  const pts = line.map(([lng, lat]) => proj({ lat, lng }))
  let best = Infinity
  let bestAlong = 0
  let along = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / len2))
    const cx = a.x + t * dx
    const cy = a.y + t * dy
    const d = Math.hypot(cx, cy)
    const segLen = Math.sqrt(len2)
    if (d < best) {
      best = d
      bestAlong = along + t * segLen
    }
    along += segLen
  }
  return { offsetKm: best, atKm: bestAlong }
}

// ───────────── Scoring ─────────────
const W = { critical: 40, significant: 22, minor: 9, normal: 0, unknown: 0 } as const

/** How close a signal must be to count. News positions are area-level, so they get more slack. */
const reach = (s: LiveSignal) => (s.approximate ? 1.8 : s.category === "community" ? 0.6 : 0.4)

function relevant(s: LiveSignal) {
  if (s.verification === "expired" || s.verification === "disputed") return false
  if (s.category === "news") return (MOBILITY_INCIDENTS as readonly string[]).includes(s.incident ?? "")
  return s.category === "community" || s.category === "traffic"
}

const levelOf = (score: number): RouteLevel => (score >= 60 ? "severe" : score >= 30 ? "significant" : score >= 8 ? "minor" : "clear")

/**
 * Only CONFIRMED reports move a route's score, level and the recommendation. Unverified reports
 * (a single outlet, or a community report with fewer than 3 confirmations) are still listed on the
 * route so people can see them, but they never change which route we point to.
 */
function scoreRoute(line: [number, number][], signals: LiveSignal[]) {
  const hits: RouteHit[] = []
  let score = 0
  for (const s of signals) {
    if (!relevant(s)) continue
    const { offsetKm, atKm } = nearestOnLine(line, s)
    const r = reach(s)
    if (offsetKm > r) continue
    const counts = s.verification === "confirmed"
    hits.push({ signal: s, offsetKm, atKm, counts })
    if (counts) score += W[s.status] * (1 - (offsetKm / r) * 0.5) // closer = heavier
  }
  hits.sort((a, b) => a.atKm - b.atKm)
  return { hits, score: Math.round(score) }
}

// ───────────── Weather at the ends ─────────────
async function rainAt(p: Pt) {
  const d = await getJson<{ hourly: { precipitation: number[]; precipitation_probability: number[] } }>(
    `https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(2)}&longitude=${p.lng.toFixed(2)}` +
      `&hourly=precipitation,precipitation_probability&forecast_hours=3&timezone=GMT`,
  )
  const mm = d.hourly.precipitation.reduce((a, b) => a + (b ?? 0), 0)
  const chance = Math.max(0, ...d.hourly.precipitation_probability.map((v) => v ?? 0))
  return { mm: Math.round(mm * 10) / 10, chance }
}

// ───────────── Orchestration ─────────────
export async function planRoutes(from: Pt, to: Pt): Promise<Omit<RoutesResponse, "from" | "to">> {
  const direct = haversineKm(from, to)
  const mid = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 }
  const span = direct / 2 + 3

  const [routesR, newsR, reportsR, trafficR, rainA, rainB] = await Promise.allSettled([
    cached(`osrm:${from.lat.toFixed(4)},${from.lng.toFixed(4)}:${to.lat.toFixed(4)},${to.lng.toFixed(4)}`, 30 * 60_000, () => osrm(from, to)),
    cached("news", 10 * 60_000, fetchNewsIncidents),
    reportSignals(mid, span),
    trafficEnabled() ? trafficSignals(mid) : Promise.resolve(null),
    cached(`rain3:${from.lat.toFixed(2)},${from.lng.toFixed(2)}`, 15 * 60_000, () => rainAt(from)),
    cached(`rain3:${to.lat.toFixed(2)},${to.lng.toFixed(2)}`, 15 * 60_000, () => rainAt(to)),
  ])
  const err = (r: PromiseSettledResult<unknown>) => (r.status === "rejected" ? String((r.reason as Error)?.message ?? r.reason) : undefined)

  const signals: LiveSignal[] = [
    ...(newsR.status === "fulfilled" ? newsSignals(newsR.value, mid, span + 2) : []),
    ...(reportsR.status === "fulfilled" ? reportsR.value : []),
    ...(trafficR.status === "fulfilled" && trafficR.value ? trafficR.value.signals : []),
  ]

  const weather: RoutesResponse["weather"] = []
  for (const [at, r] of [["start", rainA], ["destination", rainB]] as const) {
    if (r.status !== "fulfilled") continue
    const { mm, chance } = r.value
    weather.push({
      at, rainMm3h: mm, chance,
      summary: mm >= 5 ? "Heavy rain likely in the next 3 hours — expect waterlogging on low roads" : mm >= 1 ? "Some rain likely in the next 3 hours" : "No meaningful rain expected in the next 3 hours",
    })
  }

  const sources: RoutesResponse["sources"] = [
    { name: "OSRM routing (OpenStreetMap roads)", ok: routesR.status === "fulfilled", error: err(routesR) },
    { name: "News reports (Google News)", ok: newsR.status === "fulfilled", error: err(newsR) },
    { name: "Community reports", ok: reportsR.status === "fulfilled", error: err(reportsR) },
    trafficEnabled()
      ? { name: "TomTom live traffic", ok: trafficR.status === "fulfilled", error: err(trafficR) }
      : { name: "TomTom live traffic", ok: false, error: "Not configured" },
    { name: "Open-Meteo rain outlook", ok: rainA.status === "fulfilled" && rainB.status === "fulfilled", error: err(rainA) ?? err(rainB) },
  ]

  if (routesR.status !== "fulfilled")
    return { generatedAt: new Date().toISOString(), ok: false, error: "Routing service is busy right now", routes: [], weather, sources }

  const routes: RouteOption[] = routesR.value.map((r, i) => {
    const coords = r.geometry.coordinates
    const { hits, score } = scoreRoute(coords, signals)
    return {
      id: `r${i}`,
      via: r.legs.map((l) => l.summary).filter(Boolean).join(" · ") || (i === 0 ? "Fastest road route" : `Alternative ${i}`),
      distanceKm: Math.round(r.distance / 100) / 10,
      freeFlowMin: Math.max(1, Math.round(r.duration / 60)),
      coords,
      hits,
      score,
      level: levelOf(score),
      recommended: false,
    }
  })
  // Recommend the route with the fewest disruptions, unless it is more than 40% longer than the shortest.
  const shortest = Math.min(...routes.map((r) => r.distanceKm))
  const pick = [...routes]
    .filter((r) => r.distanceKm <= shortest * 1.4)
    .sort((a, b) => a.score - b.score || a.distanceKm - b.distanceKm)[0]
  if (pick) pick.recommended = true

  return { generatedAt: new Date().toISOString(), ok: true, routes, weather, sources }
}

/** City-wide mobility hotspots from the last 24 h of news (location-independent → cached globally). */
export async function mobilityPulse(near: Pt, radiusKm = 60): Promise<Hotspot[]> {
  const incidents = await cached("news", 10 * 60_000, fetchNewsIncidents)
  return newsSignals(incidents, near, radiusKm)
    .filter((s) => relevant(s) && !s.title.includes("nationwide"))
    .map((s) => {
      const c = incidents.find((x) => s.id === `news-${x.type.key}-${x.place.en.toLowerCase().replace(/\W+/g, "-")}`)
      return {
        id: s.id,
        incident: s.incident ?? "news",
        label: c?.type.label ?? s.title,
        labelBn: c?.type.labelBn ?? s.titleBn,
        area: c?.place.en ?? "",
        areaBn: c?.place.bn[0] ?? "",
        lat: s.lat,
        lng: s.lng,
        outlets: new Set(c?.items.map((i) => i.outlet) ?? []).size,
        latestAt: s.updatedAt,
        status: s.status,
        confirmed: s.verification === "confirmed",
      }
    })
    .sort((a, b) => ({ critical: 0, significant: 1, minor: 2, normal: 3, unknown: 4 })[a.status] - ({ critical: 0, significant: 1, minor: 2, normal: 3, unknown: 4 })[b.status] || b.outlets - a.outlets)
}
