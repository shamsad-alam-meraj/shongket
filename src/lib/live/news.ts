/**
 * Street-level incidents from Bangladeshi news (via Google News RSS, last 24 h).
 *
 * Pipeline: search per incident type (Bangla + English) → keyword-classify each headline →
 * locate it with a Dhaka/Bangladesh gazetteer → cluster by (type, place) → the number of
 * distinct outlets reporting it drives verification and confidence.
 *
 * Only headlines + links are used (no article text). Locations are approximate (area level).
 */
import { haversineKm, type LiveSignal, type SignalStatus } from "./types"

type Place = { en: string; bn: string[]; enAlt?: string[]; lat: number; lng: number; level: "area" | "city" }

// Order matters: more specific names first (e.g. "পুরান ঢাকা" before "ঢাকা").
const PLACES: Place[] = [
  { en: "Old Dhaka", bn: ["পুরান ঢাকা", "পুরানো ঢাকা"], lat: 23.7104, lng: 90.4074, level: "area" },
  { en: "Dhaka University", bn: ["ঢাকা বিশ্ববিদ্যালয়", "ঢাবি"], enAlt: ["DU campus"], lat: 23.734, lng: 90.3929, level: "area" },
  { en: "Mirpur", bn: ["মিরপুর"], lat: 23.8223, lng: 90.3654, level: "area" },
  { en: "Pallabi", bn: ["পল্লবী"], lat: 23.8256, lng: 90.3636, level: "area" },
  { en: "Kafrul", bn: ["কাফরুল"], lat: 23.7869, lng: 90.3858, level: "area" },
  { en: "Uttara", bn: ["উত্তরা"], lat: 23.8759, lng: 90.3795, level: "area" },
  { en: "Airport", bn: ["বিমানবন্দর", "কাওলা"], enAlt: ["Shahjalal airport", "airport road"], lat: 23.8433, lng: 90.3978, level: "area" },
  { en: "Khilkhet", bn: ["খিলক্ষেত"], lat: 23.8302, lng: 90.4214, level: "area" },
  { en: "Kuril", bn: ["কুড়িল"], lat: 23.8197, lng: 90.4213, level: "area" },
  { en: "Bashundhara", bn: ["বসুন্ধরা"], lat: 23.8193, lng: 90.4526, level: "area" },
  { en: "Baridhara", bn: ["বারিধারা"], lat: 23.8, lng: 90.42, level: "area" },
  { en: "Gulshan", bn: ["গুলশান"], lat: 23.7925, lng: 90.4078, level: "area" },
  { en: "Banani", bn: ["বনানী"], lat: 23.7937, lng: 90.4066, level: "area" },
  { en: "Mohakhali", bn: ["মহাখালী"], lat: 23.7781, lng: 90.4006, level: "area" },
  { en: "Badda", bn: ["বাড্ডা"], lat: 23.7806, lng: 90.4262, level: "area" },
  { en: "Rampura", bn: ["রামপুরা"], lat: 23.7612, lng: 90.4231, level: "area" },
  { en: "Hatirjheel", bn: ["হাতিরঝিল"], lat: 23.7568, lng: 90.4086, level: "area" },
  { en: "Tejgaon", bn: ["তেজগাঁও"], lat: 23.759, lng: 90.392, level: "area" },
  { en: "Agargaon", bn: ["আগারগাঁও"], lat: 23.7778, lng: 90.3792, level: "area" },
  { en: "Shyamoli", bn: ["শ্যামলী"], lat: 23.774, lng: 90.3655, level: "area" },
  { en: "Gabtoli", bn: ["গাবতলী"], lat: 23.7838, lng: 90.3442, level: "area" },
  { en: "Mohammadpur", bn: ["মোহাম্মদপুর"], lat: 23.7662, lng: 90.3589, level: "area" },
  { en: "Farmgate", bn: ["ফার্মগেট"], lat: 23.7577, lng: 90.3897, level: "area" },
  { en: "Karwan Bazar", bn: ["কারওয়ান বাজার", "কাওরান বাজার"], lat: 23.7509, lng: 90.3935, level: "area" },
  { en: "Panthapath", bn: ["পান্থপথ"], lat: 23.752, lng: 90.387, level: "area" },
  { en: "Kalabagan", bn: ["কলাবাগান"], lat: 23.7472, lng: 90.3822, level: "area" },
  { en: "Dhanmondi", bn: ["ধানমন্ডি"], lat: 23.7461, lng: 90.3742, level: "area" },
  { en: "Hazaribagh", bn: ["হাজারীবাগ"], lat: 23.7357, lng: 90.36, level: "area" },
  { en: "Science Lab", bn: ["সায়েন্স ল্যাব", "সায়েন্সল্যাব"], lat: 23.7389, lng: 90.3836, level: "area" },
  { en: "Nilkhet", bn: ["নীলক্ষেত"], lat: 23.7329, lng: 90.3853, level: "area" },
  { en: "New Market", bn: ["নিউমার্কেট", "নিউ মার্কেট"], lat: 23.7337, lng: 90.3845, level: "area" },
  { en: "Azimpur", bn: ["আজিমপুর"], lat: 23.7283, lng: 90.3853, level: "area" },
  { en: "Lalbagh", bn: ["লালবাগ"], lat: 23.7186, lng: 90.388, level: "area" },
  { en: "Chawkbazar", bn: ["চকবাজার"], lat: 23.7177, lng: 90.3967, level: "area" },
  { en: "Sadarghat", bn: ["সদরঘাট"], lat: 23.7058, lng: 90.4128, level: "area" },
  { en: "Shahbagh", bn: ["শাহবাগ"], lat: 23.7389, lng: 90.3958, level: "area" },
  { en: "Bangla Motor", bn: ["বাংলামোটর"], lat: 23.7469, lng: 90.3953, level: "area" },
  { en: "Eskaton", bn: ["ইস্কাটন"], lat: 23.7466, lng: 90.399, level: "area" },
  { en: "Moghbazar", bn: ["মগবাজার"], lat: 23.749, lng: 90.406, level: "area" },
  { en: "Kakrail", bn: ["কাকরাইল"], lat: 23.7383, lng: 90.4078, level: "area" },
  { en: "Press Club", bn: ["প্রেসক্লাব", "প্রেস ক্লাব"], lat: 23.73, lng: 90.4065, level: "area" },
  { en: "Secretariat", bn: ["সচিবালয়"], lat: 23.7302, lng: 90.4078, level: "area" },
  { en: "Paltan", bn: ["পল্টন"], lat: 23.7347, lng: 90.412, level: "area" },
  { en: "Baitul Mukarram", bn: ["বায়তুল মোকাররম"], lat: 23.729, lng: 90.4128, level: "area" },
  { en: "Gulistan", bn: ["গুলিস্তান"], lat: 23.7246, lng: 90.413, level: "area" },
  { en: "Motijheel", bn: ["মতিঝিল"], lat: 23.733, lng: 90.4172, level: "area" },
  { en: "Shantinagar", bn: ["শান্তিনগর"], lat: 23.7406, lng: 90.4148, level: "area" },
  { en: "Malibagh", bn: ["মালিবাগ"], lat: 23.748, lng: 90.414, level: "area" },
  { en: "Khilgaon", bn: ["খিলগাঁও"], lat: 23.7516, lng: 90.4256, level: "area" },
  { en: "Kamalapur", bn: ["কমলাপুর"], lat: 23.7322, lng: 90.426, level: "area" },
  { en: "Sayedabad", bn: ["সায়েদাবাদ"], lat: 23.7189, lng: 90.4256, level: "area" },
  { en: "Jatrabari", bn: ["যাত্রাবাড়ী", "যাত্রাবাড়ি"], lat: 23.7104, lng: 90.4349, level: "area" },
  { en: "Demra", bn: ["ডেমরা"], lat: 23.7234, lng: 90.497, level: "area" },
  { en: "Keraniganj", bn: ["কেরানীগঞ্জ"], lat: 23.6981, lng: 90.346, level: "area" },
  { en: "Savar", bn: ["সাভার"], lat: 23.8583, lng: 90.2667, level: "area" },
  { en: "Ashulia", bn: ["আশুলিয়া"], lat: 23.8981, lng: 90.3226, level: "area" },
  { en: "Tongi", bn: ["টঙ্গী"], lat: 23.8915, lng: 90.4023, level: "area" },
  { en: "Gazipur", bn: ["গাজীপুর"], lat: 23.9999, lng: 90.4203, level: "city" },
  { en: "Narayanganj", bn: ["নারায়ণগঞ্জ"], lat: 23.6238, lng: 90.5, level: "city" },
  { en: "Chattogram", bn: ["চট্টগ্রাম"], enAlt: ["Chittagong"], lat: 22.3569, lng: 91.7832, level: "city" },
  { en: "Sylhet", bn: ["সিলেট"], lat: 24.8949, lng: 91.8687, level: "city" },
  { en: "Rajshahi", bn: ["রাজশাহী"], lat: 24.3745, lng: 88.6042, level: "city" },
  { en: "Khulna", bn: ["খুলনা"], lat: 22.8456, lng: 89.5403, level: "city" },
  { en: "Barishal", bn: ["বরিশাল"], enAlt: ["Barisal"], lat: 22.701, lng: 90.3535, level: "city" },
  { en: "Rangpur", bn: ["রংপুর"], lat: 25.7439, lng: 89.2752, level: "city" },
  { en: "Mymensingh", bn: ["ময়মনসিংহ"], lat: 24.7471, lng: 90.4203, level: "city" },
  { en: "Cumilla", bn: ["কুমিল্লা"], enAlt: ["Comilla"], lat: 23.4607, lng: 91.1809, level: "city" },
  { en: "Cox's Bazar", bn: ["কক্সবাজার"], lat: 21.4272, lng: 92.0058, level: "city" },
  { en: "Bogura", bn: ["বগুড়া"], enAlt: ["Bogra"], lat: 24.8465, lng: 89.3773, level: "city" },
  { en: "Narsingdi", bn: ["নরসিংদী"], lat: 23.9322, lng: 90.7151, level: "city" },
  { en: "Feni", bn: ["ফেনী"], lat: 23.0159, lng: 91.3976, level: "city" },
  { en: "Jashore", bn: ["যশোর"], enAlt: ["Jessore"], lat: 23.1664, lng: 89.2081, level: "city" },
  { en: "Tangail", bn: ["টাঙ্গাইল"], lat: 24.2513, lng: 89.9167, level: "city" },
  { en: "Faridpur", bn: ["ফরিদপুর"], lat: 23.607, lng: 89.8429, level: "city" },
  { en: "Cumilla", bn: ["কুমিল্লা"], lat: 23.4607, lng: 91.1809, level: "city" },
  { en: "Noakhali", bn: ["নোয়াখালী"], lat: 22.8696, lng: 91.0995, level: "city" },
  { en: "Dinajpur", bn: ["দিনাজপুর"], lat: 25.6217, lng: 88.6355, level: "city" },
  // Catch-all for the capital — lowest precision
  { en: "Dhaka", bn: ["রাজধানী", "ঢাকা"], enAlt: ["capital"], lat: 23.7808, lng: 90.4, level: "city" },
]

type IncidentType = {
  key: string
  label: string
  labelBn: string
  status: SignalStatus
  bnQuery: string
  enQuery: string
  /** headline must contain one of these to count */
  match: RegExp
  /** lifetime before the report is considered expired */
  ttlH: number
}

const TYPES: IncidentType[] = [
  { key: "fire", label: "Fire", labelBn: "আগুন", status: "significant", ttlH: 12,
    bnQuery: "(আগুন OR অগ্নিকাণ্ড OR ফায়ার সার্ভিস)", enQuery: "(fire OR blaze) Bangladesh",
    match: /আগুন|অগ্নিকাণ্ড|অগ্নি|ফায়ার সার্ভিস|\bfire\b|\bblaze\b|\bgutted\b/i },
  { key: "hartal", label: "Hartal / shutdown", labelBn: "হরতাল", status: "significant", ttlH: 24,
    bnQuery: "(হরতাল OR শাটডাউন)", enQuery: "hartal Bangladesh",
    match: /হরতাল|শাটডাউন|\bhartal\b|\bshutdown\b/i },
  { key: "blockade", label: "Blockade / road blocked", labelBn: "অবরোধ", status: "significant", ttlH: 12,
    bnQuery: "(অবরোধ OR সড়ক অবরোধ OR ঘেরাও OR যান চলাচল বন্ধ)", enQuery: "(blockade OR \"road blocked\" OR gherao) Dhaka",
    match: /অবরোধ|ঘেরাও|চলাচল বন্ধ|সড়ক বন্ধ|\bblockade\b|\bblocked\b|\bgherao\b|\bsiege\b/i },
  { key: "clash", label: "Clash", labelBn: "সংঘর্ষ", status: "significant", ttlH: 12,
    bnQuery: "(সংঘর্ষ OR ধাওয়া-পাল্টা ধাওয়া)", enQuery: "clash Dhaka",
    match: /সংঘর্ষ|ধাওয়া|\bclash(es)?\b/i },
  { key: "procession", label: "Procession / rally", labelBn: "মিছিল-সমাবেশ", status: "minor", ttlH: 8,
    bnQuery: "(মিছিল OR সমাবেশ OR মানববন্ধন OR বিক্ষোভ)", enQuery: "(procession OR rally OR protest OR \"human chain\") Dhaka",
    match: /মিছিল|সমাবেশ|মানববন্ধন|বিক্ষোভ|\bprocession\b|\brally\b|\bprotest|\bhuman chain\b|\bdemonstrat/i },
  { key: "jam", label: "Traffic jam", labelBn: "যানজট", status: "minor", ttlH: 6,
    bnQuery: "(যানজট OR তীব্র যানজট)", enQuery: "(\"traffic jam\" OR gridlock OR tailback) Dhaka",
    match: /যানজট|জ্যাম|traffic jam|gridlock|tailback|\bcongestion\b/i },
  { key: "accident", label: "Road accident", labelBn: "সড়ক দুর্ঘটনা", status: "significant", ttlH: 12,
    bnQuery: "(সড়ক দুর্ঘটনা OR বাসচাপায় OR ট্রাকচাপায় OR দুর্ঘটনায় নিহত)", enQuery: "(\"road accident\" OR crash OR collision) Bangladesh",
    match: /দুর্ঘটনা|চাপায়|সংঘর্ষে নিহত|\baccident\b|\bcrash\b|\bcollision\b/i },
  { key: "waterlogging", label: "Waterlogging", labelBn: "জলাবদ্ধতা", status: "minor", ttlH: 12,
    bnQuery: "(জলাবদ্ধতা OR জলজট OR পানিবন্দী)", enQuery: "(waterlogging OR waterlogged) Dhaka",
    match: /জলাবদ্ধ|জলজট|পানিবন্দ|waterlog/i },
  { key: "power", label: "Power outage", labelBn: "বিদ্যুৎ বিভ্রাট", status: "minor", ttlH: 8,
    bnQuery: "(বিদ্যুৎ বিভ্রাট OR লোডশেডিং OR বিদ্যুৎহীন)", enQuery: "(\"power outage\" OR blackout OR \"load shedding\") Bangladesh",
    match: /বিদ্যুৎ বিভ্রাট|লোডশেডিং|বিদ্যুৎহীন|বিদ্যুৎ নেই|power outage|blackout|load.?shedding/i },
]

/** Idioms and off-topic uses that look like incidents but are not (e.g. "বাজারে আগুন" = soaring prices). */
const NOISE = /দাম|দামে|মূল্য|বাজারে আগুন|price|প্রতিবাদের আগুন|ক্রিকেট|ম্যাচ|ফুটবল|cricket|football|\bmatch\b|সিনেমা|নাটক|গান|film|movie|বিশ্বকাপ|world cup/i
const DEATH = /নিহত|মৃত্যু|প্রাণহানি|দগ্ধ|\bkilled\b|\bdead\b|\bdies\b|\bdeath/i
const NATIONWIDE = /সারা দেশে|দেশব্যাপী|সারাদেশে|nationwide|countrywide/i

/** For traffic jams, try to name the cause from the headline. */
const JAM_CAUSES: [RegExp, string, string][] = [
  [/মিছিল|সমাবেশ|বিক্ষোভ|rally|procession|protest/i, "a procession / rally", "মিছিল-সমাবেশের কারণে"],
  [/অবরোধ|blockade/i, "a blockade", "অবরোধের কারণে"],
  [/দুর্ঘটনা|accident|crash/i, "an accident", "দুর্ঘটনার কারণে"],
  [/বৃষ্টি|জলাবদ্ধ|rain|waterlog/i, "rain / waterlogging", "বৃষ্টি-জলাবদ্ধতার কারণে"],
  [/সংস্কার|নির্মাণ|খোঁড়াখুঁড়ি|roadwork|construction/i, "roadworks", "সড়ক সংস্কারের কারণে"],
  [/ঈদ|উৎসব|eid|festival/i, "festival travel", "উৎসবের যাত্রার কারণে"],
  [/ভিআইপি|vip/i, "VIP movement", "ভিআইপি চলাচলের কারণে"],
]

// ── Bangla grammar helpers ──
const VOWEL_SIGNS = /[িীুূেৈোৌ]$/
/** locative: শাহবাগ→শাহবাগে, ঢাকা→ঢাকায়, মহাখালী→মহাখালীতে */
export function bnLoc(w: string) {
  if (/া$/.test(w)) return w + "য়"
  if (VOWEL_SIGNS.test(w)) return w + "তে"
  if (/ৎ$/.test(w)) return w + "-এ"
  return w + "ে"
}
/** genitive: আগুন→আগুনের, দুর্ঘটনা→দুর্ঘটনার, যানজট→যানজটের */
export function bnGen(w: string) {
  if (/[াি-ৌ]$/.test(w) && !/়$/.test(w)) return w + "র"
  if (/ৎ$/.test(w)) return w + "-এর"
  return w + "ের"
}

type Item = { title: string; outlet: string; url: string; at: string }

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim()

function parseRss(xml: string): Item[] {
  const items: Item[] = []
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1]
    const pick = (tag: string) => decode(block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "")
    const outlet = pick("source")
    let title = pick("title")
    if (outlet && title.endsWith(` - ${outlet}`)) title = title.slice(0, -(outlet.length + 3))
    const at = new Date(pick("pubDate"))
    if (!title || Number.isNaN(at.getTime())) continue
    items.push({ title, outlet: outlet || "News", url: pick("link"), at: at.toISOString() })
  }
  return items
}

async function search(q: string, lang: "bn" | "en"): Promise<Item[]> {
  const params =
    lang === "bn" ? "hl=bn&gl=BD&ceid=BD:bn" : "hl=en-BD&gl=BD&ceid=BD:en"
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:1d")}&${params}`
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SHONGKET/0.1; +open-data prototype)" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return parseRss(await res.text())
}

function locate(title: string): Place | null {
  for (const p of PLACES) {
    if (p.bn.some((n) => title.includes(n))) return p
    const en = [p.en, ...(p.enAlt ?? [])]
    if (en.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(title))) return p
  }
  return null
}

export type NewsIncident = {
  type: IncidentType
  place: Place
  items: Item[]
  nationwide: boolean
  deaths: boolean
}

/** Fetch + classify + cluster. Location-independent, so the caller can cache it globally. */
export async function fetchNewsIncidents(): Promise<NewsIncident[]> {
  const jobs = TYPES.flatMap((t) => [
    search(t.bnQuery, "bn").then((items) => ({ t, items })),
    search(t.enQuery, "en").then((items) => ({ t, items })),
  ])
  const settled = await Promise.allSettled(jobs)
  const ok = settled.filter((r) => r.status === "fulfilled")
  if (ok.length === 0) throw new Error("news search unavailable")

  const clusters = new Map<string, NewsIncident>()
  const seenTitles = new Set<string>()
  for (const r of ok) {
    const { t, items } = (r as PromiseFulfilledResult<{ t: IncidentType; items: Item[] }>).value
    for (const it of items) {
      const key = it.title.toLowerCase()
      if (seenTitles.has(key + t.key)) continue
      seenTitles.add(key + t.key)
      if (!t.match.test(it.title) || NOISE.test(it.title)) continue
      if (Date.now() - new Date(it.at).getTime() > 24 * 3.6e6) continue
      const place = locate(it.title)
      const nationwide = NATIONWIDE.test(it.title)
      if (!place && !(nationwide && (t.key === "hartal" || t.key === "blockade"))) continue
      const where = place ?? PLACES[PLACES.length - 1]
      const ck = `${t.key}:${where.en}`
      const c = clusters.get(ck) ?? { type: t, place: where, items: [], nationwide: false, deaths: false }
      c.items.push(it)
      c.nationwide ||= nationwide
      c.deaths ||= DEATH.test(it.title)
      clusters.set(ck, c)
    }
  }
  return [...clusters.values()]
}

export function newsSignals(incidents: NewsIncident[], p: { lat: number; lng: number }, radiusKm = 60): LiveSignal[] {
  const out: LiveSignal[] = []
  for (const c of incidents) {
    const dist = haversineKm(p, c.place)
    if (dist > radiusKm && !(c.nationwide && dist < 800)) continue
    const items = [...c.items].sort((a, b) => b.at.localeCompare(a.at))
    const latest = items[0]
    const outlets = new Set(items.map((i) => i.outlet)).size
    const ageH = (Date.now() - new Date(latest.at).getTime()) / 3.6e6
    const expired = ageH > c.type.ttlH
    let status: SignalStatus = c.type.status
    if (c.deaths && (c.type.key === "fire" || c.type.key === "accident" || c.type.key === "clash")) status = "critical"
    if (c.type.key === "jam" && /তীব্র|ভোগান্তি|severe|heavy|gridlock/i.test(items.map((i) => i.title).join(" "))) status = "significant"
    if (expired) status = "unknown"

    let cause = ""
    let causeBn = ""
    if (c.type.key === "jam") {
      const all = items.map((i) => i.title).join(" ")
      const hit = JAM_CAUSES.find(([re]) => re.test(all))
      if (hit) [, cause, causeBn] = hit
    }
    const where = c.nationwide ? "nationwide" : `in ${c.place.en}`
    const whereBn = c.nationwide ? "দেশব্যাপী" : bnLoc(c.place.bn[0])
    out.push({
      id: `news-${c.type.key}-${c.place.en.toLowerCase().replace(/\W+/g, "-")}`,
      category: "news",
      incident: c.type.key,
      kind: "report",
      title: `${c.type.label} reported ${where}${cause ? ` — linked to ${cause}` : ""}`,
      titleBn: `${whereBn}${causeBn ? ` ${causeBn}` : ""} ${bnGen(c.type.labelBn)} খবর`,
      summary: `${outlets} ${outlets === 1 ? "outlet has" : "independent outlets have"} reported this in the last ${Math.max(1, Math.round(ageH))} h. Location is approximate (${c.place.level === "area" ? "area" : "city"} level).`,
      status,
      verification: expired ? "expired" : outlets >= 2 ? "confirmed" : "unverified",
      confidence: Math.min(92, 40 + (outlets - 1) * 18 + (c.place.level === "area" ? 6 : 0)),
      source: `News · ${outlets} ${outlets === 1 ? "outlet" : "outlets"}`,
      sourceUrl: latest.url,
      updatedAt: latest.at,
      lat: c.place.lat,
      lng: c.place.lng,
      distanceKm: dist,
      approximate: true,
      metric: `${outlets} ${outlets === 1 ? "source" : "sources"}`,
      evidence: items.slice(0, 5).map((i) => ({ title: i.title, outlet: i.outlet, url: i.url, at: i.at })),
    })
  }
  return out
}
