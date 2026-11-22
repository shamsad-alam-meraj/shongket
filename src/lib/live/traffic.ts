/**
 * Real-time traffic incidents from TomTom (Traffic Incident Details API v5).
 * https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/traffic-incidents/incident-details
 *
 * The free tier is ~2,500 requests / MONTH, so requests are budgeted:
 *  - Users are grouped into ~16 km grid cells; one request covers a ~24 km square around the cell
 *    (well under the API's 10,000 km² bbox limit) and is shared by everyone in that cell.
 *  - Each cell is cached for TOMTOM_CACHE_MINUTES (default 20).
 *  - At most TOMTOM_DAILY_LIMIT requests per day per server instance (default 80 ≈ 2,400 / month).
 *  - Cells with no incidents (no TomTom coverage, e.g. Bangladesh as of 2026-11) are re-checked
 *    only every TOMTOM_EMPTY_CACHE_MINUTES (default 180).
 *  - On errors or when the budget is spent, the last good result is served (marked stale).
 */
import "./net"
import { haversineKm, type LiveSignal, type SignalStatus } from "./types"

type Pt = { lat: number; lng: number }

type TomTomIncident = {
  geometry: { type: "Point" | "LineString"; coordinates: number[] | number[][] }
  properties: {
    id: string
    iconCategory: number
    magnitudeOfDelay: number
    events?: { description: string; code?: number; iconCategory?: number }[]
    startTime?: string | null
    endTime?: string | null
    from?: string | null
    to?: string | null
    length?: number | null
    delay?: number | null
    roadNumbers?: string[] | null
    numberOfReports?: number | null
    lastReportTime?: string | null
  }
}

// iconCategory → [key, label, labelBn]
const CAT: Record<number, [string, string, string]> = {
  0: ["unknown", "Traffic incident", "যান চলাচলে বিঘ্ন"],
  1: ["accident", "Accident", "দুর্ঘটনা"],
  2: ["fog", "Fog", "কুয়াশা"],
  3: ["danger", "Dangerous conditions", "ঝুঁকিপূর্ণ অবস্থা"],
  4: ["rain", "Rain", "বৃষ্টি"],
  5: ["ice", "Ice", "বরফ"],
  6: ["jam", "Traffic jam", "যানজট"],
  7: ["lane_closed", "Lane closed", "লেন বন্ধ"],
  8: ["road_closed", "Road closed", "সড়ক বন্ধ"],
  9: ["roadworks", "Roadworks", "সড়ক সংস্কার"],
  10: ["wind", "Wind", "ঝোড়ো হাওয়া"],
  11: ["flooding", "Flooding", "জলাবদ্ধতা"],
  14: ["breakdown", "Broken-down vehicle", "বিকল যানবাহন"],
}
// magnitudeOfDelay: 0 unknown, 1 minor, 2 moderate, 3 major, 4 undefined (closures / indefinite)
const DELAY_LABEL = ["", "minor delay", "moderate delay", "major delay", ""]

const CELL_DEG = 0.15 // ≈ 16 km
const HALF_DEG = 0.11 // bbox half-size ≈ 12 km → ~24 km square
const NEARBY_KM = 15
const TTL_MS = Number(process.env.TOMTOM_CACHE_MINUTES || 20) * 60_000
const DAILY_LIMIT = Number(process.env.TOMTOM_DAILY_LIMIT || 80)
// Areas TomTom doesn't cover (e.g. Bangladesh today) return no incidents — re-check those rarely.
const EMPTY_TTL_MS = Number(process.env.TOMTOM_EMPTY_CACHE_MINUTES || 180) * 60_000

type CellEntry = { at: number; incidents: Omit<LiveSignal, "distanceKm">[] }
const cells = new Map<string, CellEntry>()
const inflight = new Map<string, Promise<CellEntry>>()
const budget = { day: "", used: 0 }

export const trafficEnabled = () => Boolean(process.env.TOMTOM_API_KEY)

export function trafficBudget() {
  const day = new Date().toISOString().slice(0, 10)
  return { used: budget.day === day ? budget.used : 0, limit: DAILY_LIMIT }
}

function toSignal(inc: TomTomIncident): Omit<LiveSignal, "distanceKm"> | null {
  const pr = inc.properties
  const coords = (inc.geometry.type === "Point" ? [inc.geometry.coordinates] : inc.geometry.coordinates) as number[][]
  const mid = coords[Math.floor(coords.length / 2)] ?? coords[0]
  if (!mid) return null
  const [k, label, labelBn] = CAT[pr.iconCategory] ?? CAT[0]
  const mag = pr.magnitudeOfDelay ?? 0

  let status: SignalStatus =
    mag === 3 || mag === 4 || k === "road_closed" ? "significant" : mag === 2 ? "minor" : "minor"
  if (k === "accident") status = mag >= 3 ? "critical" : "significant"

  const road = pr.from && pr.to ? `${pr.from} → ${pr.to}` : pr.from || pr.roadNumbers?.join(", ") || "nearby road"
  const cause = (pr.events ?? []).map((e) => e.description).filter(Boolean).join(", ")
  const delayMin = pr.delay ? Math.round(pr.delay / 60) : 0
  const reports = pr.numberOfReports ?? 0
  const parts = [
    cause && `Cause: ${cause}.`,
    DELAY_LABEL[mag] && `${DELAY_LABEL[mag][0].toUpperCase()}${DELAY_LABEL[mag].slice(1)}${delayMin ? ` (~${delayMin} min)` : ""}.`,
    !DELAY_LABEL[mag] && delayMin ? `Delay about ${delayMin} min.` : "",
    pr.length ? `Affects ${(pr.length / 1000).toFixed(1)} km.` : "",
    pr.endTime ? `Expected until ${new Date(pr.endTime).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}.` : "",
  ].filter(Boolean)

  return {
    id: `tt-${pr.id}`,
    category: "traffic",
    incident: k,
    kind: "observed",
    title: `${label}: ${road}`,
    titleBn: `${labelBn}: ${road}`,
    summary: parts.join(" ") || "Reported by live traffic data.",
    status,
    verification: "confirmed",
    confidence: Math.min(97, 80 + reports * 3),
    source: reports > 1 ? `TomTom Traffic · ${reports} reports` : "TomTom Traffic",
    sourceUrl: "https://www.tomtom.com/traffic-index/",
    updatedAt: new Date(pr.lastReportTime || pr.startTime || Date.now()).toISOString(),
    lat: mid[1],
    lng: mid[0],
    metric: delayMin ? `+${delayMin} min` : DELAY_LABEL[mag] || undefined,
  }
}

async function fetchCell(center: Pt): Promise<CellEntry> {
  const key = process.env.TOMTOM_API_KEY!
  const bbox = [center.lng - HALF_DEG, center.lat - HALF_DEG, center.lng + HALF_DEG, center.lat + HALF_DEG]
    .map((v) => v.toFixed(4))
    .join(",")
  const fields =
    "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,numberOfReports,lastReportTime}}}"
  const url =
    `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${encodeURIComponent(key)}` +
    `&bbox=${bbox}&fields=${encodeURIComponent(fields)}&language=en-GB&timeValidityFilter=present`

  const day = new Date().toISOString().slice(0, 10)
  if (budget.day !== day) Object.assign(budget, { day, used: 0 })
  budget.used++

  const res = await fetch(url, { headers: { "Accept-Encoding": "gzip" }, signal: AbortSignal.timeout(12000), cache: "no-store" })
  if (res.status === 401 || res.status === 403) throw new Error(`TomTom rejected the API key (${res.status})`)
  if (res.status === 429) throw new Error("TomTom rate limit reached (429)")
  if (!res.ok) throw new Error(`TomTom ${res.status}`)
  const data = (await res.json()) as { incidents?: TomTomIncident[] }
  const incidents = (data.incidents ?? []).map(toSignal).filter((x): x is NonNullable<typeof x> => x !== null)
  return { at: Date.now(), incidents }
}

export async function trafficSignals(p: Pt): Promise<{ signals: LiveSignal[]; stale: boolean; note?: string }> {
  const center = { lat: Math.round(p.lat / CELL_DEG) * CELL_DEG, lng: Math.round(p.lng / CELL_DEG) * CELL_DEG }
  const cellKey = `${center.lat.toFixed(2)},${center.lng.toFixed(2)}`
  const cached = cells.get(cellKey)
  const finish = (e: CellEntry, stale: boolean, note?: string) => ({
    stale,
    note,
    signals: e.incidents
      .map((s) => ({ ...s, distanceKm: haversineKm(p, s) }))
      .filter((s) => s.distanceKm <= NEARBY_KM)
      .slice(0, 80),
  })

  const ttl = cached && cached.incidents.length === 0 ? EMPTY_TTL_MS : TTL_MS
  if (cached && Date.now() - cached.at < ttl) return finish(cached, false)

  const { used, limit } = trafficBudget()
  if (used >= limit) {
    if (cached) return finish(cached, true, "daily request budget reached — showing last update")
    throw new Error("daily request budget reached")
  }

  try {
    let job = inflight.get(cellKey)
    if (!job) {
      job = fetchCell(center).finally(() => inflight.delete(cellKey))
      inflight.set(cellKey, job)
    }
    const fresh = await job
    cells.set(cellKey, fresh)
    if (cells.size > 200) cells.delete(cells.keys().next().value!)
    return finish(fresh, false)
  } catch (e) {
    if (cached) return finish(cached, true, `${(e as Error).message} — showing last update`)
    throw e
  }
}
