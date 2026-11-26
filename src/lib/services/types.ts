/** Client-safe shapes and constants for the Services directory. */
import type { LiveService, ServiceKind } from "@/lib/live/types"

export type ServiceGroup = "health" | "pharmacy" | "emergency" | "shelter" | "utilities"

export const GROUPS: { key: ServiceGroup; label: string; labelBn: string; kinds: ServiceKind[] }[] = [
  { key: "health", label: "Health", labelBn: "স্বাস্থ্য", kinds: ["hospital", "clinic", "doctors"] },
  { key: "pharmacy", label: "Pharmacies", labelBn: "ফার্মেসি", kinds: ["pharmacy"] },
  { key: "emergency", label: "Police & fire", labelBn: "পুলিশ ও ফায়ার", kinds: ["police", "fire_station"] },
  { key: "shelter", label: "Shelters", labelBn: "আশ্রয়কেন্দ্র", kinds: ["shelter"] },
  { key: "utilities", label: "Utilities", labelBn: "নাগরিক সুবিধা", kinds: ["fuel", "atm", "drinking_water", "toilets"] },
]

export const RADII = [1, 3, 5] as const
/** One fetch covers every radius: 6 km around a ~1.1 km grid cell centre (≥ 5 km for any point in the cell). */
export const FETCH_KM = 6
export const MAX_ELEMENTS = 4000
export type Radius = (typeof RADII)[number]

export type Place = LiveService & {
  group: ServiceGroup
  phone?: string
  address?: string
  website?: string
  operator?: string
  speciality?: string
  wheelchair?: "yes" | "limited" | "no"
  /** true / false / null = hours not mapped or not machine-readable */
  openNow: boolean | null
}

export type DirectoryResponse = {
  location: { lat: number; lng: number }
  radiusKm: number
  generatedAt: string
  ok: boolean
  source: string
  error?: string
  /** true when the result is older than its refresh window because the source failed */
  stale?: boolean
  /** true when OSM returned the maximum number of elements (some may be missing) */
  truncated?: boolean
  places: Place[]
  coverage: { total: number; withPhone: number; withHours: number; byKind: Partial<Record<ServiceKind, number>> }
}
