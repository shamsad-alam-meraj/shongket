import type { SignalStatus } from "@/lib/signals"

export type { SignalStatus }

export type LiveCategory =
  | "weather" | "rain" | "heat" | "wind" | "air" | "river"
  | "earthquake" | "cyclone" | "flood" | "wildfire" | "volcano" | "hazard"
  | "community" | "news" | "traffic"

/** observed = something that happened / is measured now; forecast = model outlook */
export type SignalKind = "observed" | "forecast" | "report"

/**
 * confirmed  — from an official data feed, or a community report confirmed by 3+ people
 * unverified — a single community report
 * disputed   — community report with more disputes than confirmations
 * expired    — older than its useful life (e.g. an earthquake > 24 h ago)
 */
export type LiveVerification = "confirmed" | "unverified" | "disputed" | "expired"

export type LiveSignal = {
  id: string
  title: string
  titleBn: string
  summary: string
  category: LiveCategory
  kind: SignalKind
  status: SignalStatus
  verification: LiveVerification
  confidence: number // 0–100
  source: string
  sourceUrl?: string
  updatedAt: string // ISO
  lat: number
  lng: number
  distanceKm: number
  metric?: string
  confirms?: number
  disputes?: number
  /** news / traffic incident sub-type, e.g. "fire", "hartal", "jam" */
  incident?: string
  /** true when the position is area/city-level rather than exact */
  approximate?: boolean
  /** supporting reports (headline + outlet + link) */
  evidence?: { title: string; outlet: string; url: string; at: string }[]
}

export type SourceStatus = { name: string; ok: boolean; count: number; error?: string }

export type LiveResponse = {
  location: { lat: number; lng: number; place: string; placeBn?: string; country?: string }
  generatedAt: string
  signals: LiveSignal[]
  sources: SourceStatus[]
}

export type ServiceKind =
  | "hospital" | "clinic" | "doctors" | "pharmacy" | "police" | "fire_station"
  | "shelter" | "fuel" | "atm" | "drinking_water" | "toilets"

export type LiveService = {
  id: string
  name: string
  nameBn?: string
  kind: ServiceKind
  lat: number
  lng: number
  distanceKm: number
  openingHours?: string
  emergency?: boolean
}

export type ServicesResponse = { services: LiveService[]; source: string; ok: boolean; generatedAt: string }

export const DHAKA = { lat: 23.8103, lng: 90.4125 }

export const CATEGORY_INFO: Record<LiveCategory, { label: string; labelBn: string }> = {
  weather: { label: "Weather", labelBn: "আবহাওয়া" },
  rain: { label: "Rain outlook", labelBn: "বৃষ্টির পূর্বাভাস" },
  heat: { label: "Heat", labelBn: "তাপমাত্রা" },
  wind: { label: "Wind", labelBn: "বাতাস" },
  air: { label: "Air quality", labelBn: "বায়ুর মান" },
  river: { label: "River flow", labelBn: "নদীর প্রবাহ" },
  earthquake: { label: "Earthquake", labelBn: "ভূমিকম্প" },
  cyclone: { label: "Cyclone", labelBn: "ঘূর্ণিঝড়" },
  flood: { label: "Flood", labelBn: "বন্যা" },
  wildfire: { label: "Wildfire", labelBn: "দাবানল" },
  volcano: { label: "Volcano", labelBn: "আগ্নেয়গিরি" },
  hazard: { label: "Natural hazard", labelBn: "প্রাকৃতিক দুর্যোগ" },
  community: { label: "Community report", labelBn: "কমিউনিটি রিপোর্ট" },
  news: { label: "Street incident", labelBn: "সড়ক ও নগর ঘটনা" },
  traffic: { label: "Traffic", labelBn: "যান চলাচল" },
}

export const SERVICE_INFO: Record<ServiceKind, { label: string; labelBn: string; color: string; glyph: string; ink: string }> = {
  hospital: { label: "Hospital", labelBn: "হাসপাতাল", color: "#ff5468", glyph: "+", ink: "#ffffff" },
  clinic: { label: "Clinic", labelBn: "ক্লিনিক", color: "#ff9447", glyph: "+", ink: "#0b1220" },
  doctors: { label: "Doctor", labelBn: "চিকিৎসক", color: "#f472b6", glyph: "Dr", ink: "#0b1220" },
  pharmacy: { label: "Pharmacy", labelBn: "ফার্মেসি", color: "#20d6c2", glyph: "℞", ink: "#0b1220" },
  police: { label: "Police", labelBn: "পুলিশ", color: "#579bff", glyph: "P", ink: "#ffffff" },
  fire_station: { label: "Fire service", labelBn: "ফায়ার সার্ভিস", color: "#f5c84b", glyph: "F", ink: "#0b1220" },
  shelter: { label: "Shelter", labelBn: "আশ্রয়কেন্দ্র", color: "#a78bfa", glyph: "S", ink: "#0b1220" },
  fuel: { label: "Fuel station", labelBn: "জ্বালানি স্টেশন", color: "#94a3b8", glyph: "Fu", ink: "#0b1220" },
  atm: { label: "ATM", labelBn: "এটিএম", color: "#4ade80", glyph: "৳", ink: "#0b1220" },
  drinking_water: { label: "Drinking water", labelBn: "খাবার পানি", color: "#38bdf8", glyph: "W", ink: "#0b1220" },
  toilets: { label: "Public toilet", labelBn: "পাবলিক টয়লেট", color: "#cbd5e1", glyph: "WC", ink: "#0b1220" },
}

export const REPORT_TYPES = [
  { key: "waterlogging", label: "Waterlogging", labelBn: "জলাবদ্ধতা" },
  { key: "road_closure", label: "Road closure", labelBn: "সড়ক বন্ধ" },
  { key: "traffic", label: "Heavy traffic", labelBn: "তীব্র যানজট" },
  { key: "accident", label: "Accident", labelBn: "দুর্ঘটনা" },
  { key: "power_outage", label: "Power outage", labelBn: "বিদ্যুৎ বিভ্রাট" },
  { key: "fire", label: "Fire", labelBn: "অগ্নিকাণ্ড" },
  { key: "other", label: "Other", labelBn: "অন্যান্য" },
] as const

export type ReportType = (typeof REPORT_TYPES)[number]["key"]

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"]
export const toBnDigits = (v: string | number) => String(v).replace(/\d/g, (d) => BN_DIGITS[Number(d)])

export function timeAgoIso(iso: string, nowMs?: number) {
  const now = nowMs ?? Date.now()
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (min < 1) return "just now"
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.floor(h / 24)} d ago`
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}
