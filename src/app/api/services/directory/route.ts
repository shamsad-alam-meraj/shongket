import { parseCoords } from "@/lib/live/cache"
import { clientIp, rateLimit } from "@/lib/live/rate-limit"
import type { OsmElement } from "@/lib/live/overpass"
import {
  MAX_ELEMENTS, RADII, coverage, fetchDirectory, toPlaces, type DirectoryResponse, type Radius,
} from "@/lib/services/directory"

const SOURCE = "OpenStreetMap contributors (Overpass API)"
const FRESH_MS = 60 * 60_000 // OSM changes slowly
const KEEP_MS = 24 * 60 * 60_000 // serve a stale copy for up to a day if the mirrors are down

type Entry = { at: number; elements: OsmElement[] }
const store = new Map<string, Entry>()
const inflight = new Map<string, Promise<Entry>>()

/** Fresh-or-stale cache: a failed refresh falls back to the last good copy. */
async function load(lat: number, lng: number): Promise<{ entry: Entry; stale: boolean }> {
  const key = `${lat},${lng}`
  const hit = store.get(key)
  if (hit && Date.now() - hit.at < FRESH_MS) return { entry: hit, stale: false }
  let p = inflight.get(key)
  if (!p) {
    p = fetchDirectory(lat, lng)
      .then((elements) => {
        const e = { at: Date.now(), elements }
        store.set(key, e)
        if (store.size > 300) store.delete(store.keys().next().value!)
        return e
      })
      .finally(() => inflight.delete(key))
    inflight.set(key, p)
  }
  try {
    return { entry: await p, stale: false }
  } catch (e) {
    if (hit && Date.now() - hit.at < KEEP_MS) return { entry: hit, stale: true }
    throw e
  }
}

export async function GET(request: Request) {
  const rl = rateLimit(`directory:${clientIp(request)}`, 40, 60_000)
  if (!rl.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } })
  const url = new URL(request.url)
  // ~1.1 km cells: one Overpass query serves everyone nearby, at any radius
  const c = parseCoords(url, 2)
  if (!c) return Response.json({ error: "lat and lng are required" }, { status: 400 })
  const r = Number(url.searchParams.get("radius") ?? 3)
  const radius: Radius = (RADII as readonly number[]).includes(r) ? (r as Radius) : 3
  const base = { location: c.exact, radiusKm: radius, source: SOURCE }

  try {
    const { entry, stale } = await load(c.lat, c.lng)
    const places = toPlaces(entry.elements, c.exact, radius)
    const body: DirectoryResponse = {
      ...base, generatedAt: new Date(entry.at).toISOString(), ok: true, stale,
      truncated: entry.elements.length >= MAX_ELEMENTS, places, coverage: coverage(places),
    }
    return Response.json(body, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    console.warn("[services] Overpass lookup failed:", e instanceof Error ? e.message : e)
    const body: DirectoryResponse = {
      ...base, generatedAt: new Date().toISOString(), ok: false,
      error: "OpenStreetMap lookup is busy right now", places: [], coverage: coverage([]),
    }
    return Response.json(body, { headers: { "Cache-Control": "no-store" } })
  }
}
