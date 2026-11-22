/**
 * Server-side adapters that turn open data feeds into SHONGKET signals.
 * Every signal is derived from a real, public source — nothing here is invented.
 *
 *  - Open-Meteo Forecast  → current weather, rain outlook, heat, wind      (open-meteo.com)
 *  - Open-Meteo Air       → air quality (US AQI, PM2.5)
 *  - Open-Meteo Flood     → GloFAS river discharge forecast
 *  - USGS                 → earthquakes (M2.5+ past week, M4.5+ past month)
 *  - GDACS                → current global disaster alerts (cyclone, flood, quake, fire…)
 *  - NASA EONET           → open natural events (storms, wildfires, floods)
 *  - BigDataCloud         → reverse geocoding for the place name
 */
import "./net"
import {
  haversineKm, toBnDigits,
  type LiveCategory, type LiveSignal, type SignalStatus, type SourceStatus,
} from "./types"

type Pt = { lat: number; lng: number }

const UA = { "User-Agent": "SHONGKET/0.1 (+open-data prototype)" }

async function getJson<T>(url: string, timeoutMs = 12000, attempts = 2): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      return (await res.json()) as T
    } catch (e) {
      last = e
    }
  }
  const err = last as { message?: string; cause?: { code?: string } }
  throw new Error(err?.cause?.code ?? err?.message ?? "request failed")
}

// ───────────────────────────── Weather ─────────────────────────────
const WMO: Record<number, [string, string]> = {
  0: ["Clear sky", "পরিষ্কার আকাশ"],
  1: ["Mainly clear", "প্রায় পরিষ্কার আকাশ"],
  2: ["Partly cloudy", "আংশিক মেঘলা"],
  3: ["Overcast", "মেঘাচ্ছন্ন আকাশ"],
  45: ["Fog", "কুয়াশা"],
  48: ["Freezing fog", "ঘন কুয়াশা"],
  51: ["Light drizzle", "হালকা গুঁড়ি গুঁড়ি বৃষ্টি"],
  53: ["Drizzle", "গুঁড়ি গুঁড়ি বৃষ্টি"],
  55: ["Dense drizzle", "ঘন গুঁড়ি গুঁড়ি বৃষ্টি"],
  61: ["Light rain", "হালকা বৃষ্টি"],
  63: ["Rain", "বৃষ্টি"],
  65: ["Heavy rain", "ভারী বৃষ্টি"],
  80: ["Rain showers", "বৃষ্টির ঝাপটা"],
  81: ["Heavy showers", "ভারী বৃষ্টির ঝাপটা"],
  82: ["Violent showers", "প্রবল বৃষ্টি"],
  95: ["Thunderstorm", "বজ্রঝড়"],
  96: ["Thunderstorm with hail", "শিলাসহ বজ্রঝড়"],
  99: ["Severe thunderstorm with hail", "শিলাসহ তীব্র বজ্রঝড়"],
}
const wmo = (c: number): [string, string] => WMO[c] ?? WMO[Math.floor(c / 10) * 10] ?? ["Unsettled weather", "অস্থির আবহাওয়া"]
const weatherStatus = (c: number): SignalStatus =>
  c >= 95 || c === 65 || c === 82 ? "significant" : (c >= 61 && c <= 81) || c === 48 ? "minor" : "normal"

type Forecast = {
  latitude: number
  longitude: number
  current: {
    time: string; temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number
    precipitation: number; weather_code: number; wind_speed_10m: number; wind_gusts_10m: number
  }
  hourly: { time: string[]; precipitation: number[]; precipitation_probability: number[] }
}

export async function weatherSignals(p: Pt): Promise<LiveSignal[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m` +
    `&hourly=precipitation,precipitation_probability&forecast_hours=6&timezone=GMT`
  const d = await getJson<Forecast>(url)
  const c = d.current
  const at = new Date(c.time + "Z").toISOString()
  const base = { lat: p.lat, lng: p.lng, distanceKm: 0, source: "Open-Meteo", sourceUrl: "https://open-meteo.com/", verification: "confirmed" as const }
  const [desc, descBn] = wmo(c.weather_code)
  const t = Math.round(c.temperature_2m)
  const out: LiveSignal[] = [
    {
      ...base, id: "wx-now", category: "weather", kind: "observed",
      title: `${desc}, ${t}°C`, titleBn: `${descBn}, ${toBnDigits(t)}°সে`,
      summary: `Feels like ${Math.round(c.apparent_temperature)}°C · humidity ${c.relative_humidity_2m}% · wind ${Math.round(c.wind_speed_10m)} km/h.`,
      status: weatherStatus(c.weather_code), confidence: 90, updatedAt: at,
      metric: `${t}°C`,
    },
  ]

  // Rain outlook — next 6 hours
  const total = d.hourly.precipitation.reduce((a, b) => a + (b ?? 0), 0)
  const prob = Math.max(0, ...d.hourly.precipitation_probability.map((v) => v ?? 0))
  const mm = total.toFixed(1)
  const rainStatus: SignalStatus = total >= 10 ? "significant" : total >= 2 ? "minor" : "normal"
  out.push({
    ...base, id: "wx-rain", category: "rain", kind: "forecast",
    title: rainStatus === "significant" ? "Heavy rain likely in the next 6 hours" : rainStatus === "minor" ? "Rain expected in the next 6 hours" : "No significant rain expected in the next 6 hours",
    titleBn: rainStatus === "significant" ? "আগামী ৬ ঘণ্টায় ভারী বৃষ্টির সম্ভাবনা" : rainStatus === "minor" ? "আগামী ৬ ঘণ্টায় বৃষ্টির সম্ভাবনা" : "আগামী ৬ ঘণ্টায় উল্লেখযোগ্য বৃষ্টির সম্ভাবনা নেই",
    summary: `${mm} mm forecast over 6 h · peak chance ${prob}%.${rainStatus === "significant" ? " Low-lying roads may see waterlogging." : ""}`,
    status: rainStatus, confidence: Math.max(40, Math.min(85, prob)), updatedAt: at, metric: `${mm} mm`,
  })

  // Heat stress
  const feels = c.apparent_temperature
  if (feels >= 36) {
    const s: SignalStatus = feels >= 41 ? "significant" : "minor"
    out.push({
      ...base, id: "wx-heat", category: "heat", kind: "observed",
      title: `High heat stress — feels like ${Math.round(feels)}°C`, titleBn: `তীব্র গরম — অনুভূত তাপমাত্রা ${toBnDigits(Math.round(feels))}°সে`,
      summary: "Limit time outdoors during the afternoon and stay hydrated.",
      status: s, confidence: 85, updatedAt: at, metric: `${Math.round(feels)}°C`,
    })
  }
  // Strong wind
  if (c.wind_gusts_10m >= 40) {
    const s: SignalStatus = c.wind_gusts_10m >= 60 ? "significant" : "minor"
    out.push({
      ...base, id: "wx-wind", category: "wind", kind: "observed",
      title: `Strong wind gusts up to ${Math.round(c.wind_gusts_10m)} km/h`, titleBn: `দমকা হাওয়া — ঘণ্টায় ${toBnDigits(Math.round(c.wind_gusts_10m))} কিমি পর্যন্ত`,
      summary: "Loose objects and temporary structures may be affected.",
      status: s, confidence: 80, updatedAt: at, metric: `${Math.round(c.wind_gusts_10m)} km/h`,
    })
  }
  return out
}

// ───────────────────────────── Air quality ─────────────────────────────
export async function airSignals(p: Pt): Promise<LiveSignal[]> {
  const d = await getJson<{ current: { time: string; us_aqi: number; pm2_5: number; pm10: number } }>(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.lat}&longitude=${p.lng}&current=us_aqi,pm2_5,pm10&timezone=GMT`,
  )
  const { us_aqi: aqi, pm2_5, time } = d.current
  if (aqi == null) return []
  const band =
    aqi <= 50 ? ["Good", "ভালো", "normal"] :
    aqi <= 100 ? ["Moderate", "মাঝারি", "normal"] :
    aqi <= 150 ? ["Unhealthy for sensitive groups", "সংবেদনশীলদের জন্য অস্বাস্থ্যকর", "minor"] :
    aqi <= 200 ? ["Unhealthy", "অস্বাস্থ্যকর", "significant"] :
    aqi <= 300 ? ["Very unhealthy", "খুবই অস্বাস্থ্যকর", "critical"] :
    ["Hazardous", "বিপজ্জনক", "critical"]
  return [
    {
      id: "air-now", category: "air", kind: "observed",
      title: `Air quality: ${band[0]} (AQI ${Math.round(aqi)})`,
      titleBn: `বায়ুর মান: ${band[1]} (AQI ${toBnDigits(Math.round(aqi))})`,
      summary: `PM2.5 ${pm2_5?.toFixed(0)} µg/m³.${aqi > 150 ? " Consider a mask outdoors; sensitive groups should limit exertion." : aqi > 100 ? " Sensitive groups should reduce prolonged outdoor exertion." : ""}`,
      status: band[2] as SignalStatus, verification: "confirmed", confidence: 75,
      source: "Open-Meteo Air Quality (CAMS)", sourceUrl: "https://open-meteo.com/en/docs/air-quality-api",
      updatedAt: new Date(time + "Z").toISOString(), lat: p.lat, lng: p.lng, distanceKm: 0, metric: `AQI ${Math.round(aqi)}`,
    },
  ]
}

// ───────────────────────────── River discharge (GloFAS) ─────────────────────────────
export async function riverSignals(p: Pt): Promise<LiveSignal[]> {
  const d = await getJson<{ latitude: number; longitude: number; daily: { time: string[]; river_discharge: (number | null)[] } }>(
    `https://flood-api.open-meteo.com/v1/flood?latitude=${p.lat}&longitude=${p.lng}&daily=river_discharge&past_days=7&forecast_days=7`,
  )
  const v = d.daily.river_discharge
  const todayIdx = 7
  const today = v[todayIdx]
  if (today == null || today < 1) return [] // no meaningful river near this point
  const future = v.slice(todayIdx + 1).filter((x): x is number => x != null)
  const peak = Math.max(today, ...future)
  const ratio = peak / today
  const status: SignalStatus = ratio >= 1.5 ? "significant" : ratio >= 1.2 ? "minor" : "normal"
  const pct = Math.round((ratio - 1) * 100)
  const loc = { lat: d.latitude, lng: d.longitude }
  return [
    {
      id: "river-flow", category: "river", kind: "forecast",
      title: status === "normal" ? "Nearby river flow is stable" : `River flow forecast to rise ${pct}% this week`,
      titleBn: status === "normal" ? "কাছের নদীর প্রবাহ স্থিতিশীল" : `এই সপ্তাহে নদীর প্রবাহ ${toBnDigits(pct)}% বাড়ার পূর্বাভাস`,
      summary: `Modelled discharge today ${Math.round(today).toLocaleString()} m³/s; 7-day peak ${Math.round(peak).toLocaleString()} m³/s.`,
      status, verification: "confirmed", confidence: 65,
      source: "GloFAS via Open-Meteo Flood API", sourceUrl: "https://open-meteo.com/en/docs/flood-api",
      updatedAt: new Date(d.daily.time[todayIdx] + "T00:00:00Z").toISOString(),
      ...loc, distanceKm: haversineKm(p, loc), metric: `${Math.round(today).toLocaleString()} m³/s`,
    },
  ]
}

// ───────────────────────────── Earthquakes (USGS) ─────────────────────────────
type USGS = { features: { id: string; properties: { mag: number; place: string; time: number; url: string; tsunami: number }; geometry: { coordinates: [number, number, number] } }[] }

export async function earthquakeSignals(p: Pt): Promise<LiveSignal[]> {
  const [week, month] = await Promise.all([
    getJson<USGS>("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson"),
    getJson<USGS>("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson"),
  ])
  const seen = new Set<string>()
  const out: LiveSignal[] = []
  for (const f of [...week.features, ...month.features]) {
    if (seen.has(f.id)) continue
    seen.add(f.id)
    const [lng, lat, depth] = f.geometry.coordinates
    const dist = haversineKm(p, { lat, lng })
    const m = f.properties.mag
    const radius = m >= 6 ? 2000 : m >= 4.5 ? 1200 : 600
    if (dist > radius) continue
    const ageH = (Date.now() - f.properties.time) / 3.6e6
    if (ageH > 7 * 24) continue // keep the last week only
    let status: SignalStatus = m >= 6 && dist < 600 ? "critical" : (m >= 4.5 && dist < 400) || m >= 6 ? "significant" : "minor"
    if (ageH > 24) status = "minor"
    out.push({
      id: `eq-${f.id}`, category: "earthquake", kind: "observed",
      title: `M${m.toFixed(1)} earthquake — ${f.properties.place}`,
      titleBn: `${toBnDigits(m.toFixed(1))} মাত্রার ভূমিকম্প — ${toBnDigits(Math.round(dist))} কিমি দূরে`,
      summary: `Depth ${Math.round(depth)} km, about ${Math.round(dist)} km from you.${f.properties.tsunami ? " USGS tsunami flag set." : ""}`,
      status, verification: ageH > 24 ? "expired" : "confirmed", confidence: 98,
      source: "USGS Earthquake Hazards", sourceUrl: f.properties.url,
      updatedAt: new Date(f.properties.time).toISOString(), lat, lng, distanceKm: dist, metric: `M${m.toFixed(1)}`,
    })
  }
  return out
}

// ───────────────────────────── GDACS ─────────────────────────────
type GDACS = { features: { geometry: { type: string; coordinates: [number, number] }; properties: { eventtype: string; eventid: number; name: string; description: string; alertlevel: string; country: string; fromdate: string; todate: string; datemodified: string; iscurrent: string | boolean; severitydata?: { severitytext?: string } } }[] }

const GDACS_CAT: Record<string, [LiveCategory, string]> = {
  EQ: ["earthquake", "ভূমিকম্প"], TC: ["cyclone", "ঘূর্ণিঝড়"], FL: ["flood", "বন্যা"],
  VO: ["volcano", "আগ্নেয়গিরি"], WF: ["wildfire", "দাবানল"], DR: ["hazard", "খরা"],
}

export async function gdacsSignals(p: Pt): Promise<LiveSignal[]> {
  const d = await getJson<GDACS>("https://www.gdacs.org/gdacsapi/api/Events/geteventlist/EVENTS4APP", 15000)
  const out: LiveSignal[] = []
  for (const f of d.features) {
    if (f.geometry?.type !== "Point") continue
    const pr = f.properties
    if (pr.eventtype === "EQ") continue // USGS covers earthquakes with better detail
    const [lng, lat] = f.geometry.coordinates
    const dist = haversineKm(p, { lat, lng })
    const radius = pr.eventtype === "TC" ? 2500 : 1500
    if (dist > radius) continue
    const [cat, bn] = GDACS_CAT[pr.eventtype] ?? ["hazard", "দুর্যোগ"]
    const lvl = (pr.alertlevel || "").toLowerCase()
    const status: SignalStatus = lvl === "red" ? "critical" : lvl === "orange" ? "significant" : "minor"
    out.push({
      id: `gdacs-${pr.eventtype}-${pr.eventid}`, category: cat, kind: "observed",
      title: pr.name, titleBn: `${bn} সতর্কতা — ${toBnDigits(Math.round(dist))} কিমি দূরে`,
      summary: `${pr.severitydata?.severitytext ?? pr.description}. GDACS alert level: ${pr.alertlevel}. About ${Math.round(dist)} km away.`,
      status, verification: "confirmed", confidence: 90,
      source: "GDACS (UN / EC JRC)", sourceUrl: `https://www.gdacs.org/report.aspx?eventtype=${pr.eventtype}&eventid=${pr.eventid}`,
      updatedAt: new Date(pr.datemodified || pr.fromdate).toISOString(), lat, lng, distanceKm: dist,
      metric: pr.alertlevel,
    })
  }
  return out
}

// ───────────────────────────── NASA EONET ─────────────────────────────
type EONET = { events: { id: string; title: string; link: string; categories: { id: string; title: string }[]; sources: { url: string }[]; geometry: { date: string; type: string; coordinates: number[] | number[][][] }[] }[] }

const EONET_CAT: Record<string, [LiveCategory, string, SignalStatus]> = {
  severeStorms: ["cyclone", "তীব্র ঝড়", "significant"],
  floods: ["flood", "বন্যা", "significant"],
  wildfires: ["wildfire", "দাবানল", "minor"],
  volcanoes: ["volcano", "আগ্নেয়গিরি", "minor"],
  landslides: ["hazard", "ভূমিধস", "significant"],
}

export async function eonetSignals(p: Pt): Promise<LiveSignal[]> {
  const bbox = [p.lng - 12, p.lat + 10, p.lng + 12, p.lat - 10].map((v) => v.toFixed(2)).join(",")
  const d = await getJson<EONET>(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&bbox=${bbox}`)
  const out: LiveSignal[] = []
  for (const e of d.events) {
    const g = [...e.geometry].reverse().find((x) => x.type === "Point")
    if (!g) continue
    const [lng, lat] = g.coordinates as number[]
    const dist = haversineKm(p, { lat, lng })
    const [cat, bn, status] = EONET_CAT[e.categories[0]?.id] ?? ["hazard", "প্রাকৃতিক ঘটনা", "minor"]
    const ageH = (Date.now() - new Date(g.date).getTime()) / 3.6e6
    out.push({
      id: `eonet-${e.id}`, category: cat, kind: "observed",
      title: e.title, titleBn: `${bn} — ${toBnDigits(Math.round(dist))} কিমি দূরে`,
      summary: `${e.categories[0]?.title ?? "Natural event"} tracked by NASA EONET. Last position about ${Math.round(dist)} km away.`,
      status: ageH > 72 ? "minor" : status, verification: ageH > 72 ? "expired" : "confirmed", confidence: 85,
      source: "NASA EONET", sourceUrl: e.sources[0]?.url ?? e.link,
      updatedAt: new Date(g.date).toISOString(), lat, lng, distanceKm: dist,
    })
  }
  return out
}

// ───────────────────────────── Reverse geocode ─────────────────────────────
type BDC = { city?: string; locality?: string; principalSubdivision?: string; countryName?: string }

export async function reverseGeocode(p: Pt) {
  const q = (lang: string) =>
    getJson<BDC>(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${p.lat}&longitude=${p.lng}&localityLanguage=${lang}`, 8000)
  const [en, bn] = await Promise.allSettled([q("en"), q("bn")])
  const name = (r: PromiseSettledResult<BDC>) =>
    r.status === "fulfilled" ? [r.value.locality || r.value.city, r.value.principalSubdivision].filter(Boolean).join(", ") : ""
  return {
    place: name(en) || `${p.lat.toFixed(2)}, ${p.lng.toFixed(2)}`,
    placeBn: name(bn) || undefined,
    country: en.status === "fulfilled" ? en.value.countryName : undefined,
  }
}

// ───────────────────────────── Orchestration ─────────────────────────────
export async function runFeeds(p: Pt) {
  const feeds: [string, (p: Pt) => Promise<LiveSignal[]>][] = [
    ["Open-Meteo Weather", weatherSignals],
    ["Open-Meteo Air Quality", airSignals],
    ["GloFAS River Flow", riverSignals],
    ["USGS Earthquakes", earthquakeSignals],
    ["GDACS Alerts", gdacsSignals],
    ["NASA EONET", eonetSignals],
  ]
  const results = await Promise.allSettled(feeds.map(([, fn]) => fn(p)))
  const signals: LiveSignal[] = []
  const sources: SourceStatus[] = results.map((r, i) => {
    if (r.status === "fulfilled") {
      signals.push(...r.value)
      return { name: feeds[i][0], ok: true, count: r.value.length }
    }
    return { name: feeds[i][0], ok: false, count: 0, error: String(r.reason?.message ?? r.reason) }
  })
  return { signals, sources }
}

// ───────────────────────────── Live traffic (TomTom, optional) ─────────────────────────────
// Enabled when TOMTOM_API_KEY is set (free tier: developer.tomtom.com). Returns real-time
// jams, closures, accidents and roadworks within ~8 km, with the reported cause.
type TomTom = {
  incidents: {
    geometry: { type: string; coordinates: number[] | number[][] }
    properties: {
      id: string; iconCategory: number; magnitudeOfDelay: number; startTime?: string; lastReportTime?: string
      from?: string; to?: string; delay?: number; length?: number; events?: { description: string }[]; roadNumbers?: string[]
    }
  }[]
}
const TT_CAT: Record<number, [string, string, string]> = {
  1: ["accident", "Accident", "দুর্ঘটনা"],
  2: ["fog", "Fog", "কুয়াশা"],
  3: ["danger", "Dangerous conditions", "ঝুঁকিপূর্ণ অবস্থা"],
  4: ["rain", "Rain", "বৃষ্টি"],
  6: ["jam", "Traffic jam", "যানজট"],
  7: ["lane_closed", "Lane closed", "লেন বন্ধ"],
  8: ["road_closed", "Road closed", "সড়ক বন্ধ"],
  9: ["roadworks", "Roadworks", "সড়ক সংস্কার"],
  10: ["wind", "Wind", "ঝোড়ো হাওয়া"],
  11: ["flooding", "Flooding", "জলাবদ্ধতা"],
  14: ["breakdown", "Broken-down vehicle", "বিকল যানবাহন"],
}

export const tomtomEnabled = () => Boolean(process.env.TOMTOM_API_KEY)

export async function trafficSignals(p: Pt): Promise<LiveSignal[]> {
  const key = process.env.TOMTOM_API_KEY
  if (!key) return []
  const d = 0.075 // ≈ 8 km
  const bbox = [p.lng - d, p.lat - d, p.lng + d, p.lat + d].map((v) => v.toFixed(4)).join(",")
  const fields =
    "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description},startTime,lastReportTime,from,to,length,delay,roadNumbers}}}"
  const url =
    `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${key}&bbox=${bbox}` +
    `&fields=${encodeURIComponent(fields)}&language=en-GB&timeValidityFilter=present`
  const data = await getJson<TomTom>(url)
  return data.incidents.slice(0, 60).map((inc) => {
    const pr = inc.properties
    const coords = (inc.geometry.type === "Point" ? [inc.geometry.coordinates] : inc.geometry.coordinates) as number[][]
    const mid = coords[Math.floor(coords.length / 2)] ?? coords[0]
    const loc = { lat: mid[1], lng: mid[0] }
    const [k, label, labelBn] = TT_CAT[pr.iconCategory] ?? ["other", "Traffic incident", "যান চলাচলে বিঘ্ন"]
    const mag = pr.magnitudeOfDelay
    const status: SignalStatus = mag >= 4 || k === "road_closed" ? "critical" : mag === 3 ? "significant" : mag === 2 ? "minor" : k === "accident" ? "significant" : "minor"
    const cause = pr.events?.map((e) => e.description).join(", ")
    const road = pr.from && pr.to ? `${pr.from} → ${pr.to}` : pr.from || pr.roadNumbers?.join(", ") || "nearby road"
    const delayMin = pr.delay ? Math.round(pr.delay / 60) : 0
    return {
      id: `tt-${pr.id}`, category: "traffic" as const, incident: k, kind: "observed" as const,
      title: `${label}: ${road}`, titleBn: `${labelBn}: ${road}`,
      summary: `${cause ? `Cause: ${cause}. ` : ""}${delayMin ? `Delay about ${delayMin} min. ` : ""}${pr.length ? `Affects ${(pr.length / 1000).toFixed(1)} km.` : ""}`.trim(),
      status, verification: "confirmed" as const, confidence: 90,
      source: "TomTom Traffic", sourceUrl: "https://www.tomtom.com/traffic-index/",
      updatedAt: new Date(pr.lastReportTime ?? pr.startTime ?? Date.now()).toISOString(),
      ...loc, distanceKm: haversineKm(p, loc), metric: delayMin ? `+${delayMin} min` : undefined,
    }
  })
}
