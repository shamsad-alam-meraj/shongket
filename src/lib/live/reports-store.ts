/**
 * Community report store.
 *  - Production: Upstash Redis (set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) — durable,
 *    shared across serverless instances.
 *  - Local dev: JSON file at .data/reports.json.
 *  - If neither is writable (e.g. read-only serverless FS), falls back to process memory.
 */
import { promises as fs } from "fs"
import path from "path"
import { haversineKm, REPORT_TYPES, type LiveSignal, type ReportType } from "./types"
import { bnGen } from "./news"

export type Report = {
  id: string
  type: ReportType
  note: string
  lat: number
  lng: number
  createdAt: string
  confirms: number
  disputes: number
}

const FILE = path.join(process.cwd(), ".data", "reports.json")
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const REDIS_KEY = "shongket:reports:v1"
const MAX_AGE_H = 24
const FRESH_H = 6

let cache: { list: Report[]; at: number } | null = null
let fsWritable = true

async function redis<T>(cmd: unknown[]): Promise<T> {
  const res = await fetch(REDIS_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`redis ${res.status}`)
  return ((await res.json()) as { result: T }).result
}

async function load(): Promise<Report[]> {
  // Shared store: short cache so all instances converge quickly
  if (REDIS_URL && REDIS_TOKEN) {
    if (cache && Date.now() - cache.at < 3000) return cache.list
    const raw = await redis<string | null>(["GET", REDIS_KEY])
    cache = { list: raw ? (JSON.parse(raw) as Report[]) : [], at: Date.now() }
    return cache.list
  }
  if (cache) return cache.list
  try {
    cache = { list: JSON.parse(await fs.readFile(FILE, "utf8")) as Report[], at: Date.now() }
  } catch {
    cache = { list: [], at: Date.now() }
  }
  return cache.list
}

async function save(list: Report[]) {
  cache = { list, at: Date.now() }
  if (REDIS_URL && REDIS_TOKEN) {
    await redis(["SET", REDIS_KEY, JSON.stringify(list), "EX", String(48 * 3600)])
    return
  }
  if (!fsWritable) return
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true })
    await fs.writeFile(FILE, JSON.stringify(list, null, 2))
  } catch (e) {
    fsWritable = false
    console.warn("[reports] filesystem not writable — keeping reports in memory. Configure Upstash Redis for production.", e)
  }
}

const prune = (list: Report[]) =>
  list.filter((r) => Date.now() - new Date(r.createdAt).getTime() < MAX_AGE_H * 3.6e6)

export async function addReport(input: { type: ReportType; note: string; lat: number; lng: number }) {
  const list = prune(await load())
  const r: Report = {
    id: `rp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: input.type,
    note: input.note.slice(0, 280),
    lat: input.lat,
    lng: input.lng,
    createdAt: new Date().toISOString(),
    confirms: 0,
    disputes: 0,
  }
  list.unshift(r)
  await save(list.slice(0, 500))
  return r
}

export async function voteReport(id: string, vote: "confirm" | "dispute", delta: 1 | -1) {
  const list = await load()
  const r = list.find((x) => x.id === id)
  if (!r) return null
  if (vote === "confirm") r.confirms = Math.max(0, r.confirms + delta)
  else r.disputes = Math.max(0, r.disputes + delta)
  await save(list)
  return r
}

export async function reportSignals(p: { lat: number; lng: number }, radiusKm = 25): Promise<LiveSignal[]> {
  const list = prune(await load())
  return list
    .map((r) => ({ r, d: haversineKm(p, r) }))
    .filter(({ d }) => d <= radiusKm)
    .map(({ r, d }) => {
      const meta = REPORT_TYPES.find((t) => t.key === r.type) ?? REPORT_TYPES[REPORT_TYPES.length - 1]
      const ageH = (Date.now() - new Date(r.createdAt).getTime()) / 3.6e6
      const verification =
        ageH > FRESH_H ? "expired" : r.disputes > r.confirms ? "disputed" : r.confirms >= 3 ? "confirmed" : "unverified"
      const severe = r.type === "fire" || r.type === "accident" || r.type === "road_closure"
      const status = verification === "expired" ? "unknown" : severe ? "significant" : "minor"
      const sources = 1 + r.confirms
      return {
        id: r.id,
        category: "community" as const,
        kind: "report" as const,
        title: `${meta.label} reported nearby`,
        titleBn: `কাছাকাছি ${bnGen(meta.labelBn)} খবর`,
        summary: r.note || `A ${meta.label.toLowerCase()} has been reported by a community member.`,
        status,
        verification,
        confidence: Math.min(95, 35 + r.confirms * 15 - r.disputes * 15),
        source: `Community · ${sources} ${sources === 1 ? "report" : "reports"}`,
        updatedAt: r.createdAt,
        lat: r.lat,
        lng: r.lng,
        distanceKm: d,
        confirms: r.confirms,
        disputes: r.disputes,
      } satisfies LiveSignal
    })
}
