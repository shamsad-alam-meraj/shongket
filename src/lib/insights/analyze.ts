/**
 * Insights analysis — trends, risk and impact computed from the same open data the Live map uses.
 *
 *  - Open-Meteo Forecast  → 7 days back + 7 ahead: feels-like max, rainfall
 *  - Open-Meteo Air       → hourly US AQI, 7 days back + 3 ahead → daily max
 *  - GloFAS (Open-Meteo)  → river discharge, 30 days back + 7 ahead
 *  - USGS                 → earthquakes within 600 km, past 30 days
 *  - Google News (news.ts)→ street-incident clusters, last 24 h
 *  - Community reports    → count within 25 km
 *
 * Every score is a transparent rule over those numbers (documented next to it). Nothing is invented.
 */
import "@/lib/live/net"
import { cached } from "@/lib/live/cache"
import { fetchNewsIncidents, type NewsIncident } from "@/lib/live/news"
import { reportSignals } from "@/lib/live/reports-store"
import { haversineKm, toBnDigits } from "@/lib/live/types"
import {
  levelOf,
  type DayPoint, type Impact, type IncidentPulse, type InsightsResponse, type Risk, type RiskLevel, type Trend,
} from "./types"

type Pt = { lat: number; lng: number }

const UA = { "User-Agent": "SHONGKET/0.1 (+open-data prototype)" }
const TZ = "Asia/Dhaka"

async function getJson<T>(url: string, timeoutMs = 12000): Promise<T> {
  let last: unknown
  for (let i = 0; i < 2; i++) {
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

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))
const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ }) // YYYY-MM-DD
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

function change(points: DayPoint[], horizon = 3): Trend["change"] {
  const past = points.filter((p) => !p.forecast && p.value != null).slice(-7).map((p) => p.value!)
  const next = points.filter((p) => p.forecast && p.value != null).slice(0, horizon).map((p) => p.value!)
  const a = mean(past)
  const b = mean(next)
  if (a == null || b == null) return { pct: null, direction: null }
  if (a === 0) return { pct: null, direction: b > 0 ? "up" : "flat" }
  const pct = Math.round(((b - a) / Math.abs(a)) * 100)
  return { pct, direction: Math.abs(pct) < 8 ? "flat" : pct > 0 ? "up" : "down" }
}

// ───────────── Weather (feels-like + rain) ─────────────
type Daily = {
  daily: {
    time: string[]
    apparent_temperature_max: (number | null)[]
    temperature_2m_max: (number | null)[]
    precipitation_sum: (number | null)[]
    precipitation_probability_max: (number | null)[]
    wind_gusts_10m_max: (number | null)[]
  }
}

async function weather(p: Pt) {
  const d = await getJson<Daily>(
    `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}` +
      `&daily=apparent_temperature_max,temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max` +
      `&past_days=7&forecast_days=7&timezone=${encodeURIComponent(TZ)}`,
  )
  const t = today()
  const pts = (arr: (number | null)[], dp = 1): DayPoint[] =>
    d.daily.time.map((date, i) => ({ date, value: arr[i] == null ? null : round(arr[i]!, dp), forecast: date >= t }))
  const idx = Math.max(0, d.daily.time.indexOf(t))
  const next3 = (arr: (number | null)[]) => arr.slice(idx, idx + 3).filter((x): x is number => x != null)
  return {
    feels: pts(d.daily.apparent_temperature_max),
    rain: pts(d.daily.precipitation_sum),
    feelsMax3: Math.max(-99, ...next3(d.daily.apparent_temperature_max)),
    rainMax3: Math.max(0, ...next3(d.daily.precipitation_sum)),
    rainProb3: Math.max(0, ...next3(d.daily.precipitation_probability_max)),
    rainTotal3: next3(d.daily.precipitation_sum).reduce((a, b) => a + b, 0),
    gustMax3: Math.max(0, ...next3(d.daily.wind_gusts_10m_max)),
  }
}

// ───────────── Air quality ─────────────
async function air(p: Pt) {
  const d = await getJson<{ hourly: { time: string[]; us_aqi: (number | null)[] } }>(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.lat}&longitude=${p.lng}` +
      `&hourly=us_aqi&past_days=7&forecast_days=3&timezone=${encodeURIComponent(TZ)}`,
  )
  const byDay = new Map<string, number[]>()
  d.hourly.time.forEach((ts, i) => {
    const v = d.hourly.us_aqi[i]
    if (v == null) return
    const day = ts.slice(0, 10)
    byDay.set(day, [...(byDay.get(day) ?? []), v])
  })
  const t = today()
  const points: DayPoint[] = [...byDay.entries()].map(([date, vs]) => ({
    date,
    value: Math.round(Math.max(...vs)),
    forecast: date >= t,
  }))
  const next = points.filter((x) => x.forecast).slice(0, 3).map((x) => x.value ?? 0)
  return { points, max3: Math.max(0, ...next) }
}

// ───────────── River discharge ─────────────
async function river(p: Pt) {
  const d = await getJson<{ daily: { time: string[]; river_discharge: (number | null)[] } }>(
    `https://flood-api.open-meteo.com/v1/flood?latitude=${p.lat}&longitude=${p.lng}&daily=river_discharge&past_days=30&forecast_days=7`,
  )
  const t = today()
  const points: DayPoint[] = d.daily.time.map((date, i) => ({
    date,
    value: d.daily.river_discharge[i] == null ? null : Math.round(d.daily.river_discharge[i]!),
    forecast: date >= t,
  }))
  const past = points.filter((x) => !x.forecast && x.value != null).map((x) => x.value!)
  const fut = points.filter((x) => x.forecast && x.value != null).map((x) => x.value!)
  const base = mean(past) ?? 0
  const now = fut[0] ?? past[past.length - 1] ?? 0
  const peak = Math.max(now, ...fut)
  return { points, base, now, peak, meaningful: now >= 1 || base >= 1 }
}

// ───────────── Earthquakes ─────────────
type USGS = { features: { id: string; properties: { mag: number; time: number; place: string } ; geometry: { coordinates: [number, number, number] } }[] }

/** Global feeds — location-independent, so cached once for every visitor. */
const usgsFeeds = () =>
  cached("ins-usgs", 15 * 60_000, () =>
    Promise.all([
      getJson<USGS>("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson"),
      getJson<USGS>("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson"),
    ]),
  )

async function quakes(p: Pt) {
  const [week, month] = await usgsFeeds()
  const seen = new Set<string>()
  const near: { mag: number; dist: number; ageD: number; place: string }[] = []
  for (const f of [...week.features, ...month.features]) {
    if (seen.has(f.id)) continue
    seen.add(f.id)
    const [lng, lat] = f.geometry.coordinates
    const dist = haversineKm(p, { lat, lng })
    if (dist > 600) continue
    near.push({ mag: f.properties.mag, dist, ageD: (Date.now() - f.properties.time) / 8.64e7, place: f.properties.place })
  }
  return near.sort((a, b) => b.mag - a.mag)
}

// ───────────── Scoring rules ─────────────
const STATUS_W = { critical: 30, significant: 18, minor: 8, normal: 0, unknown: 0 } as const

function airRisk(max3: number): Risk {
  // US AQI 50 → 17, 100 → 33, 150 → 50, 200 → 67, 300 → 100
  const score = Math.round(clamp(max3 / 3))
  const band =
    max3 <= 50 ? "good" : max3 <= 100 ? "moderate" : max3 <= 150 ? "unhealthy for sensitive groups" : max3 <= 200 ? "unhealthy" : max3 <= 300 ? "very unhealthy" : "hazardous"
  return {
    key: "air", label: "Air quality", labelBn: "বায়ুর মান", score, level: levelOf(score),
    reading: `Peak AQI ${max3} forecast in the next 3 days (${band})`,
    drivers: [`Daily peak US AQI from the CAMS model — ${band} at its worst.`, "Score = peak AQI ÷ 3, capped at 100."],
    source: "Open-Meteo Air Quality (CAMS)",
  }
}

function heatRisk(feels: number): Risk {
  // feels-like 30 °C → 0, 37 → 49, 41 → 77, ≥ 44 → 98
  const score = Math.round(clamp((feels - 30) * 7))
  return {
    key: "heat", label: "Heat stress", labelBn: "তাপ চাপ", score, level: levelOf(score),
    reading: `Feels-like maximum ${Math.round(feels)}°C in the next 3 days`,
    drivers: [
      feels >= 41 ? "Above 41 °C apparent temperature heat illness becomes likely with exertion." :
      feels >= 36 ? "Above 36 °C apparent temperature, afternoon exertion becomes tiring." :
      "Apparent temperature stays below the heat-stress range.",
      "Score rises 7 points per °C above 30 °C feels-like.",
    ],
    source: "Open-Meteo Forecast",
  }
}

function rainRisk(maxDay: number, prob: number, total: number, gust: number): Risk {
  // 40 mm in a day ≈ waterlogging on low-lying Dhaka roads → 100
  const score = Math.round(clamp(maxDay * 2.5 * (0.5 + prob / 200) + (gust >= 50 ? 10 : 0)))
  return {
    key: "rain", label: "Rain & waterlogging", labelBn: "বৃষ্টি ও জলাবদ্ধতা", score, level: levelOf(score),
    reading: `${round(total, 1)} mm forecast over 3 days · wettest day ${round(maxDay, 1)} mm (${prob}% chance)`,
    drivers: [
      maxDay >= 20 ? "A day above 20 mm commonly leaves low-lying city roads waterlogged." : "No day reaches the 20 mm waterlogging threshold.",
      ...(gust >= 50 ? [`Gusts up to ${Math.round(gust)} km/h add to the score.`] : []),
      "Score = wettest-day mm × 2.5, weighted by rain probability.",
    ],
    source: "Open-Meteo Forecast",
  }
}

function riverRisk(r: Awaited<ReturnType<typeof river>>): Risk {
  if (!r.meaningful)
    return {
      key: "river", label: "River flood", labelBn: "নদীর বন্যা", score: 0, level: "low",
      reading: "No modelled river channel near this point",
      drivers: ["GloFAS shows negligible discharge here."], source: "GloFAS via Open-Meteo",
    }
  const vsBase = r.base > 0 ? r.peak / r.base : 1
  const rise = r.now > 0 ? r.peak / r.now : 1
  // peak at the 30-day mean → 0; 1.5× → 50; 2× → 100. A sharp 7-day rise adds up to 25.
  const score = Math.round(clamp((vsBase - 1) * 100 + clamp((rise - 1) * 50, 0, 25)))
  return {
    key: "river", label: "River flood", labelBn: "নদীর বন্যা", score, level: levelOf(score),
    reading: `Peak ${Math.round(r.peak).toLocaleString()} m³/s this week vs ${Math.round(r.base).toLocaleString()} m³/s 30-day mean`,
    drivers: [
      `Forecast peak is ${Math.round(vsBase * 100)}% of the past month's average flow.`,
      rise > 1.1 ? `Flow rises ${Math.round((rise - 1) * 100)}% over the next 7 days.` : "Flow is steady or falling over the next 7 days.",
    ],
    source: "GloFAS via Open-Meteo",
  }
}

function seismicRisk(near: Awaited<ReturnType<typeof quakes>>): Risk {
  const week = near.filter((q) => q.ageD <= 7)
  const top = near[0]
  // strongest recent quake, discounted by distance and age
  const s = near.reduce((acc, q) => {
    const v = (q.mag - 3) * 25 * (1 - q.dist / 700) * (q.ageD <= 7 ? 1 : 0.5)
    return Math.max(acc, v)
  }, 0)
  const score = Math.round(clamp(s))
  return {
    key: "seismic", label: "Seismic activity", labelBn: "ভূকম্পন", score, level: levelOf(score),
    reading: top
      ? `${near.length} quake${near.length === 1 ? "" : "s"} within 600 km in 30 days · strongest M${top.mag.toFixed(1)}, ${Math.round(top.dist)} km away`
      : "No recorded earthquakes within 600 km in 30 days",
    drivers: [
      `${week.length} in the past 7 days (M2.5+), plus M4.5+ events over 30 days.`,
      "Activity is a record of what happened — earthquakes cannot be forecast.",
    ],
    source: "USGS Earthquake Hazards",
  }
}

function newsWithin(incidents: NewsIncident[], p: Pt) {
  return incidents.filter((c) => {
    const d = haversineKm(p, c.place)
    return d <= 60 || (c.nationwide && d < 800)
  })
}

function civicRisk(local: NewsIncident[], reports: number, p: Pt): Risk {
  let raw = 0
  for (const c of local) {
    const outlets = new Set(c.items.map((i) => i.outlet)).size
    const deaths = c.deaths && ["fire", "accident", "clash"].includes(c.type.key)
    const d = haversineKm(p, c.place)
    // nearer stories matter more; city-wide / nationwide stories count partly
    const near = c.nationwide ? 0.5 : d <= 10 ? 1 : d <= 25 ? 0.6 : 0.3
    raw += (deaths ? STATUS_W.critical : STATUS_W[c.type.status]) * Math.min(2, 0.6 + outlets * 0.2) * near
  }
  raw += reports * 4
  // Saturating curve: ~2 nearby significant stories → 25, ~6 → 55, a city-wide wave of 20+ → 80s
  const score = Math.round(clamp(100 * (1 - Math.exp(-raw / 160))))
  const types = [...new Set(local.map((c) => c.type.label.toLowerCase()))]
  return {
    key: "civic", label: "Civic disruption", labelBn: "নাগরিক বিঘ্ন", score, level: levelOf(score),
    reading: local.length
      ? `${local.length} incident cluster${local.length === 1 ? "" : "s"} reported nearby in 24 h`
      : "No street incidents reported nearby in 24 h",
    drivers: [
      types.length ? `Reported: ${types.slice(0, 4).join(", ")}${types.length > 4 ? "…" : ""}.` : "News headlines show no fires, hartals, blockades or jams near you.",
      `${reports} community report${reports === 1 ? "" : "s"} within 25 km in the last 24 h.`,
      "Weighted by severity, distance from you and how many independent outlets carry each story.",
    ],
    source: "Google News headlines + community reports",
  }
}

function pulse(local: NewsIncident[], reports: number, ok: boolean): IncidentPulse {
  const byType = new Map<string, IncidentPulse["byType"][number]>()
  const byArea = new Map<string, IncidentPulse["byArea"][number]>()
  const hourly = Array<number>(24).fill(0)
  for (const c of local) {
    const t = byType.get(c.type.key) ?? { key: c.type.key, label: c.type.label, labelBn: c.type.labelBn, clusters: 0, outlets: 0 }
    t.clusters += 1
    t.outlets += new Set(c.items.map((i) => i.outlet)).size
    byType.set(c.type.key, t)
    const name = c.nationwide ? "Nationwide" : c.place.en
    const a = byArea.get(name) ?? { name, nameBn: c.nationwide ? "দেশব্যাপী" : c.place.bn[0], clusters: 0 }
    a.clusters += 1
    byArea.set(name, a)
    for (const it of c.items) {
      const h = Math.floor((Date.now() - new Date(it.at).getTime()) / 3.6e6)
      if (h >= 0 && h < 24) hourly[h] += 1
    }
  }
  return {
    total: local.length,
    byType: [...byType.values()].sort((a, b) => b.clusters - a.clusters || b.outlets - a.outlets),
    byArea: [...byArea.values()].sort((a, b) => b.clusters - a.clusters).slice(0, 6),
    hourly,
    communityReports: reports,
    ok,
  }
}

// ───────────── Impact rules ─────────────
function impacts(risks: Risk[], local: NewsIncident[]): Impact[] {
  const r = Object.fromEntries(risks.map((x) => [x.key, x])) as Record<Risk["key"], Risk>
  const out: Impact[] = []
  const lvl = (k: Risk["key"]) => r[k].level ?? "low"
  const at = (min: RiskLevel, l: RiskLevel) => ["low", "moderate", "elevated", "high"].indexOf(l) >= ["low", "moderate", "elevated", "high"].indexOf(min)

  const mobilityTypes = local.filter((c) => ["hartal", "blockade", "jam", "procession", "clash", "accident"].includes(c.type.key))
  if (mobilityTypes.length || at("elevated", lvl("rain"))) {
    const level: RiskLevel = mobilityTypes.some((c) => c.type.key === "hartal" || c.type.key === "blockade") || lvl("rain") === "high" ? "elevated" : "moderate"
    const what = [...new Set(mobilityTypes.map((c) => c.type.label.toLowerCase()))].slice(0, 3)
    out.push({
      area: "mobility", label: "Getting around", labelBn: "যাতায়াত", level,
      text: `${what.length ? `Reported ${what.join(", ")}` : "Heavy rain"}${what.length && at("elevated", lvl("rain")) ? " plus heavy rain" : ""} may slow travel — allow extra time and check the Live map before leaving.`,
      textBn: "যাতায়াতে বাড়তি সময় লাগতে পারে — বের হওয়ার আগে লাইভ ম্যাপ দেখে নিন।",
    })
  }
  if (at("moderate", lvl("air")))
    out.push({
      area: "health", label: "Breathing", labelBn: "শ্বাসপ্রশ্বাস", level: lvl("air"),
      text: at("elevated", lvl("air"))
        ? "Air will be unhealthy at its peak — a well-fitted mask helps outdoors; children, older people and anyone with asthma should limit exertion."
        : "Sensitive groups may notice the air — reduce long outdoor exertion at peak hours.",
      textBn: at("elevated", lvl("air"))
        ? "বায়ু অস্বাস্থ্যকর থাকবে — বাইরে মাস্ক ব্যবহার করুন; শিশু, বয়স্ক ও অ্যাজমা রোগীরা পরিশ্রম কমান।"
        : "সংবেদনশীলরা দীর্ঘ সময় বাইরে পরিশ্রম কমান।",
    })
  if (at("moderate", lvl("heat")))
    out.push({
      area: "outdoor", label: "Outdoor work", labelBn: "বাইরের কাজ", level: lvl("heat"),
      text: "Shift strenuous outdoor work away from noon–4 pm, drink water regularly and take shade breaks.",
      textBn: "দুপুর ১২টা–৪টার মধ্যে ভারী কাজ এড়িয়ে চলুন, নিয়মিত পানি পান করুন ও ছায়ায় বিশ্রাম নিন।",
    })
  if (at("moderate", lvl("river")) || at("high", lvl("rain")))
    out.push({
      area: "property", label: "Low-lying homes", labelBn: "নিচু এলাকার ঘরবাড়ি", level: at("elevated", lvl("river")) ? lvl("river") : "moderate",
      text: "Keep documents and electrics above floor level and know your nearest higher ground.",
      textBn: "কাগজপত্র ও বৈদ্যুতিক জিনিস উঁচুতে রাখুন এবং কাছের উঁচু জায়গা জেনে রাখুন।",
    })
  if (local.some((c) => c.type.key === "power"))
    out.push({
      area: "power", label: "Power supply", labelBn: "বিদ্যুৎ সরবরাহ", level: "moderate",
      text: "Outages have been reported nearby — keep phones charged and a light source handy.",
      textBn: "কাছাকাছি বিদ্যুৎ বিভ্রাটের খবর — ফোন চার্জ রাখুন ও আলোর ব্যবস্থা হাতের কাছে রাখুন।",
    })
  return out
}

// ───────────── Rule-based briefing ─────────────
export function rulesBriefing(risks: Risk[], impactsList: Impact[], place: string): InsightsResponse["briefing"] {
  const scored = risks.filter((r) => r.score != null).sort((a, b) => b.score! - a.score!)
  const top = scored[0]
  const calm = !top || top.score! < 25
  const second = scored[1] && scored[1].score! >= 25 ? scored[1] : null
  return {
    mode: "rules",
    headline: calm ? `A settled outlook for ${place}` : `${top.label} is the main thing to watch in ${place}`,
    headlineBn: calm ? "পরিস্থিতি স্থিতিশীল" : `মূল নজর: ${top.labelBn}`,
    summary: calm
      ? "No risk area rises above low over the next few days. Conditions look ordinary."
      : `${top.reading}.${second ? ` ${second.label} is also ${second.level} — ${second.reading}.` : ""}`,
    summaryBn: calm
      ? "আগামী কয়েক দিনে কোনো ঝুঁকি কম মাত্রার ওপরে নেই।"
      : `${top.labelBn} — ঝুঁকি স্কোর ${toBnDigits(top.score!)}/১০০।${second ? ` ${second.labelBn} — ${toBnDigits(second.score!)}/১০০।` : ""}`,
    actions: impactsList.slice(0, 3).map((i) => ({ en: i.text, bn: i.textBn })),
  }
}

// ───────────── Orchestration ─────────────
export async function analyze(p: Pt, exact: Pt) {
  const [w, a, rv, q, news, reports] = await Promise.allSettled([
    cached(`ins-wx:${p.lat},${p.lng}`, 15 * 60_000, () => weather(p)),
    cached(`ins-air:${p.lat},${p.lng}`, 15 * 60_000, () => air(p)),
    cached(`ins-river:${p.lat},${p.lng}`, 60 * 60_000, () => river(p)),
    quakes(p),
    cached("news", 10 * 60_000, fetchNewsIncidents),
    reportSignals(exact),
  ])
  const err = (r: PromiseSettledResult<unknown>) => (r.status === "rejected" ? String((r.reason as Error)?.message ?? r.reason) : undefined)
  const missing = (key: Risk["key"], label: string, labelBn: string, source: string): Risk => ({
    key, label, labelBn, score: null, level: null, reading: "Source unavailable right now", drivers: [], source,
  })

  const local = news.status === "fulfilled" ? newsWithin(news.value, exact) : []
  const reportCount = reports.status === "fulfilled" ? reports.value.filter((s) => s.verification !== "expired").length : 0

  const risks: Risk[] = [
    a.status === "fulfilled" ? airRisk(a.value.max3) : missing("air", "Air quality", "বায়ুর মান", "Open-Meteo Air Quality (CAMS)"),
    w.status === "fulfilled" ? heatRisk(w.value.feelsMax3) : missing("heat", "Heat stress", "তাপ চাপ", "Open-Meteo Forecast"),
    w.status === "fulfilled"
      ? rainRisk(w.value.rainMax3, w.value.rainProb3, w.value.rainTotal3, w.value.gustMax3)
      : missing("rain", "Rain & waterlogging", "বৃষ্টি ও জলাবদ্ধতা", "Open-Meteo Forecast"),
    rv.status === "fulfilled" ? riverRisk(rv.value) : missing("river", "River flood", "নদীর বন্যা", "GloFAS via Open-Meteo"),
    q.status === "fulfilled" ? seismicRisk(q.value) : missing("seismic", "Seismic activity", "ভূকম্পন", "USGS Earthquake Hazards"),
    news.status === "fulfilled" || reports.status === "fulfilled"
      ? civicRisk(local, reportCount, exact)
      : missing("civic", "Civic disruption", "নাগরিক বিঘ্ন", "Google News headlines + community reports"),
  ]

  const trends: Trend[] = []
  if (a.status === "fulfilled")
    trends.push({ key: "aqi", label: "Air quality — daily peak AQI", labelBn: "বায়ুর মান — দৈনিক সর্বোচ্চ AQI", unit: "AQI", points: a.value.points, change: change(a.value.points), source: "Open-Meteo Air Quality (CAMS)" })
  if (w.status === "fulfilled") {
    trends.push({ key: "feels", label: "Feels-like maximum", labelBn: "অনুভূত সর্বোচ্চ তাপমাত্রা", unit: "°C", points: w.value.feels, change: change(w.value.feels), source: "Open-Meteo Forecast" })
    trends.push({ key: "rain", label: "Daily rainfall", labelBn: "দৈনিক বৃষ্টিপাত", unit: "mm", points: w.value.rain, change: change(w.value.rain), source: "Open-Meteo Forecast" })
  }
  if (rv.status === "fulfilled" && rv.value.meaningful)
    trends.push({ key: "river", label: "River discharge", labelBn: "নদীর প্রবাহ", unit: "m³/s", points: rv.value.points, change: change(rv.value.points, 7), source: "GloFAS via Open-Meteo" })

  const scored = risks.filter((r) => r.score != null).map((r) => r.score!).sort((x, y) => y - x)
  // Overall leans on the worst area, nudged up when a second area is also raised.
  const overallScore = Math.round(clamp((scored[0] ?? 0) + (scored[1] ?? 0) * 0.15))
  const imp = impacts(risks, local)

  return {
    risks,
    trends,
    pulse: pulse(local, reportCount, news.status === "fulfilled"),
    impacts: imp,
    overall: { score: overallScore, level: levelOf(overallScore) },
    sources: [
      { name: "Open-Meteo Forecast", ok: w.status === "fulfilled", error: err(w) },
      { name: "Open-Meteo Air Quality", ok: a.status === "fulfilled", error: err(a) },
      { name: "GloFAS River Flow", ok: rv.status === "fulfilled", error: err(rv) },
      { name: "USGS Earthquakes", ok: q.status === "fulfilled", error: err(q) },
      { name: "News reports (Google News)", ok: news.status === "fulfilled", error: err(news) },
      { name: "Community reports", ok: reports.status === "fulfilled", error: err(reports) },
    ],
  }
}
