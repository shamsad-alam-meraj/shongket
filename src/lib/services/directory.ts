/**
 * Services directory — hospitals, clinics, doctors, pharmacies, police, fire service, shelters and
 * everyday utilities (fuel, ATMs, drinking water, public toilets) from OpenStreetMap.
 *
 * Only what mappers have recorded is shown. Missing phone numbers or hours are reported as missing
 * (see `coverage`), never filled in.
 */
import { overpass, type OsmElement } from "@/lib/live/overpass"
import { haversineKm, type ServiceKind } from "@/lib/live/types"
import { isOpenNow } from "./opening-hours"
import { FETCH_KM, GROUPS, MAX_ELEMENTS, type DirectoryResponse, type Place, type ServiceGroup } from "./types"

export * from "./types"

const SHELTER_NAME = /cyclone|flood|shelter|আশ্রয়/i

function query(lat: number, lng: number, r: number) {
  const a = `(around:${r * 1000},${lat},${lng})`
  return `[out:json][timeout:25];(
    nwr[amenity~"^(hospital|clinic|doctors|pharmacy|police|fire_station|fuel|atm|drinking_water|toilets|shelter)$"]${a};
    nwr[healthcare~"^(hospital|clinic|doctor|pharmacy)$"]${a};
    nwr[emergency=assembly_point]${a};
    nwr[social_facility=shelter]${a};
    nwr[building=shelter]${a};
  );out center ${MAX_ELEMENTS};`
}

function kindOf(t: Record<string, string>): ServiceKind | null {
  const am = t.amenity
  const hc = t.healthcare
  if (am === "hospital" || hc === "hospital") return "hospital"
  if (am === "clinic" || hc === "clinic") return "clinic"
  if (am === "doctors" || hc === "doctor") return "doctors"
  if (am === "pharmacy" || hc === "pharmacy") return "pharmacy"
  if (am === "police") return "police"
  if (am === "fire_station") return "fire_station"
  if (t.emergency === "assembly_point" || t.social_facility === "shelter") return "shelter"
  if (t.building === "shelter" && SHELTER_NAME.test(t.name ?? "")) return "shelter"
  // amenity=shelter is mostly bus stops / rain shelters — only count emergency or cyclone ones
  if (am === "shelter") return /emergency|cyclone|flood|evacuation/i.test(`${t.shelter_type ?? ""} ${t.name ?? ""}`) ? "shelter" : null
  if (am === "fuel") return "fuel"
  if (am === "atm" || (am === "bank" && t.atm === "yes")) return "atm"
  if (am === "drinking_water") return "drinking_water"
  if (am === "toilets") return "toilets"
  return null
}

const groupOf = (k: ServiceKind): ServiceGroup => GROUPS.find((g) => g.kinds.includes(k))!.key

function address(t: Record<string, string>) {
  if (t["addr:full"]) return t["addr:full"]
  const line = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ")
  return [line, t["addr:suburb"] ?? t["addr:city"]].filter(Boolean).join(", ") || undefined
}

const cleanPhone = (p?: string) => p?.split(/[;,/]/)[0].trim() || undefined

const fallbackName = (k: ServiceKind, t: Record<string, string>) =>
  k === "atm" && t.operator ? `${t.operator} ATM` : k === "fuel" && t.brand ? t.brand : `Unnamed ${k.replace("_", " ")}`

/** Raw OSM fetch — cached by the caller, so "open now" is recomputed on every request. */
export async function fetchDirectory(lat: number, lng: number): Promise<OsmElement[]> {
  return (await overpass(query(lat, lng, FETCH_KM), 25000)).elements
}

export function toPlaces(elements: OsmElement[], from: { lat: number; lng: number }, r: number, now = new Date()): Place[] {
  const seen = new Set<string>()
  const out: Place[] = []
  for (const e of elements) {
    const lat = e.lat ?? e.center?.lat
    const lng = e.lon ?? e.center?.lon
    const t = e.tags ?? {}
    if (lat == null || lng == null) continue
    const kind = kindOf(t)
    if (!kind) continue
    const id = `${e.type}/${e.id}`
    if (seen.has(id)) continue
    seen.add(id)
    const distanceKm = haversineKm(from, { lat, lng })
    if (distanceKm > r + 0.05) continue
    out.push({
      id,
      kind,
      group: groupOf(kind),
      name: t.name || t["name:en"] || fallbackName(kind, t),
      nameBn: t["name:bn"],
      lat,
      lng,
      distanceKm,
      openingHours: t.opening_hours,
      openNow: isOpenNow(t.opening_hours, now),
      emergency: t.emergency === "yes",
      phone: cleanPhone(t.phone ?? t["contact:phone"] ?? t["contact:mobile"]),
      address: address(t),
      website: t.website ?? t["contact:website"],
      operator: t.operator,
      speciality: t["healthcare:speciality"]?.replace(/_/g, " ").replace(/;/g, ", "),
      wheelchair: t.wheelchair === "yes" || t.wheelchair === "limited" || t.wheelchair === "no" ? t.wheelchair : undefined,
    })
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm)
}

export function coverage(places: Place[]): DirectoryResponse["coverage"] {
  const byKind: Partial<Record<ServiceKind, number>> = {}
  for (const p of places) byKind[p.kind] = (byKind[p.kind] ?? 0) + 1
  return {
    total: places.length,
    withPhone: places.filter((p) => p.phone).length,
    withHours: places.filter((p) => p.openingHours).length,
    byKind,
  }
}
