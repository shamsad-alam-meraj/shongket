/** Client-safe shapes for the Routes module. */
import type { LiveSignal } from "@/lib/live/types"

export type Pt = { lat: number; lng: number }

export type GeoResult = { id: string; name: string; context: string; lat: number; lng: number }

export type RouteLevel = "clear" | "minor" | "significant" | "severe"

export type RouteHit = {
  signal: LiveSignal
  /** distance from the route line, km */
  offsetKm: number
  /** distance along the route from the start, km */
  atKm: number
  /** true only for confirmed reports — unverified ones are shown but never affect scoring */
  counts: boolean
}

export type RouteOption = {
  id: string
  /** OSRM label, e.g. the main roads used */
  via: string
  distanceKm: number
  /** free-flow driving time from OSRM, minutes — real Dhaka traffic is usually far slower */
  freeFlowMin: number
  coords: [number, number][] // [lng, lat]
  hits: RouteHit[]
  score: number
  level: RouteLevel
  recommended: boolean
}

export type Hotspot = {
  id: string
  incident: string
  label: string
  labelBn: string
  area: string
  areaBn: string
  lat: number
  lng: number
  outlets: number
  latestAt: string
  status: LiveSignal["status"]
  confirmed: boolean
}

export type RoutesResponse = {
  from: Pt
  to: Pt
  generatedAt: string
  ok: boolean
  error?: string
  routes: RouteOption[]
  weather: { at: "start" | "destination"; rainMm3h: number; chance: number; summary: string }[]
  sources: { name: string; ok: boolean; error?: string }[]
}

export type PulseResponse = { generatedAt: string; ok: boolean; hotspots: Hotspot[] }

export const ROUTE_LEVEL: Record<RouteLevel, { label: string; labelBn: string; color: string }> = {
  clear: { label: "Clear", labelBn: "বাধাহীন", color: "var(--color-status-normal)" },
  minor: { label: "Minor disruption", labelBn: "সামান্য বিঘ্ন", color: "var(--color-status-minor)" },
  significant: { label: "Significant disruption", labelBn: "উল্লেখযোগ্য বিঘ্ন", color: "var(--color-status-significant)" },
  severe: { label: "Severe disruption", labelBn: "গুরুতর বিঘ্ন", color: "var(--color-status-critical)" },
}

/** Incident types that affect road travel. */
export const MOBILITY_INCIDENTS = ["hartal", "blockade", "procession", "clash", "jam", "accident", "waterlogging", "fire"] as const
