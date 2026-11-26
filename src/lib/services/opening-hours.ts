/**
 * A small evaluator for the common subset of OSM `opening_hours`:
 *   "24/7" · "09:00-21:00" · "Mo-Fr 09:00-17:00; Sa 10:00-14:00" · "Sa-Th 08:00-13:00,15:00-22:00"
 *   "Mo-Su 18:00-02:00" (past midnight) · "Fr off" · "PH off" (public holidays are ignored)
 * Anything it can't read returns null ("hours unknown") — it never guesses.
 */
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const

function parseDays(spec: string): Set<number> | null {
  const out = new Set<number>()
  for (const part of spec.split(",")) {
    const p = part.trim()
    if (p === "PH" || p === "SH") continue
    const m = p.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/)
    if (!m) return null
    const a = DAYS.indexOf(m[1] as (typeof DAYS)[number])
    const b = m[2] ? DAYS.indexOf(m[2] as (typeof DAYS)[number]) : a
    for (let i = a; ; i = (i + 1) % 7) {
      out.add(i)
      if (i === b) break
    }
  }
  return out
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

type Rule = { days: Set<number>; ranges: [number, number][] | "off" }

function parse(raw: string): Rule[] | null {
  const rules: Rule[] = []
  for (const chunk of raw.split(";")) {
    const r = chunk.trim()
    if (!r) continue
    const m = r.match(/^(?:([A-Za-z,\- ]+?)\s+)?(off|closed|(?:\d{1,2}:\d{2}-\d{1,2}:\d{2}\+?)(?:\s*,\s*\d{1,2}:\d{2}-\d{1,2}:\d{2}\+?)*)$/)
    if (!m) return null
    const days = m[1] ? parseDays(m[1].replace(/\s+/g, "")) : new Set([0, 1, 2, 3, 4, 5, 6])
    if (!days) return null
    if (days.size === 0) continue // PH-only rule
    if (m[2] === "off" || m[2] === "closed") {
      rules.push({ days, ranges: "off" })
      continue
    }
    const ranges = m[2].split(",").map((x) => {
      const [a, b] = x.trim().replace("+", "").split("-")
      return [toMin(a), toMin(b)] as [number, number]
    })
    rules.push({ days, ranges })
  }
  return rules.length ? rules : null
}

/** Is it open at `now` (evaluated in Bangladesh time)? true / false / null = unknown. */
export function isOpenNow(raw: string | undefined, now = new Date()): boolean | null {
  if (!raw) return null
  const v = raw.trim()
  if (v === "24/7" || v === "Mo-Su 00:00-24:00" || v === "00:00-24:00") return true
  const rules = parse(v)
  if (!rules) return null

  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(now)
  const wd = parts.find((p) => p.type === "weekday")!.value.slice(0, 2) // "Mo", "Tu"…
  const day = DAYS.indexOf(wd as (typeof DAYS)[number])
  const min = Number(parts.find((p) => p.type === "hour")!.value) * 60 + Number(parts.find((p) => p.type === "minute")!.value)
  const prev = (day + 6) % 7

  // Later rules override earlier ones for the days they name (OSM semantics).
  const rangesFor = (d: number) => {
    let r: Rule["ranges"] | null = null
    for (const rule of rules) if (rule.days.has(d)) r = rule.ranges
    return r
  }
  const today = rangesFor(day)
  if (today && today !== "off") {
    for (const [a, b] of today) {
      if (b > a ? min >= a && min < b : min >= a) return true
    }
  }
  // Spill-over from yesterday's past-midnight range (e.g. 18:00-02:00)
  const y = rangesFor(prev)
  if (y && y !== "off") for (const [a, b] of y) if (b <= a && min < b) return true
  return false
}
