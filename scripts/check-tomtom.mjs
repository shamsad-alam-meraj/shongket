// Verifies TOMTOM_API_KEY with ONE request for central Dhaka (counts toward the free quota).
// Usage: npm run check:traffic
import { existsSync, readFileSync } from "node:fs"
import net from "node:net"

net.setDefaultAutoSelectFamilyAttemptTimeout(2500)

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}

const key = process.env.TOMTOM_API_KEY
if (!key) {
  console.error("✗ TOMTOM_API_KEY is not set. Add it to .env.local (see .env.example).")
  process.exit(1)
}

const bbox = "90.30,23.70,90.52,23.92" // central Dhaka, minLon,minLat,maxLon,maxLat
const fields = "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description},from,to,delay}}}"
const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${encodeURIComponent(key)}&bbox=${bbox}&fields=${encodeURIComponent(fields)}&language=en-GB&timeValidityFilter=present`

const NAMES = { 0: "Unknown", 1: "Accident", 2: "Fog", 3: "Dangerous conditions", 4: "Rain", 5: "Ice", 6: "Jam", 7: "Lane closed", 8: "Road closed", 9: "Road works", 10: "Wind", 11: "Flooding", 14: "Broken-down vehicle" }

try {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (res.status === 401 || res.status === 403) throw new Error(`${res.status} — key rejected. Check it was copied fully and that the Traffic API is enabled for it.`)
  if (res.status === 429) throw new Error("429 — rate/quota limit reached.")
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const { incidents = [] } = await res.json()
  const byType = {}
  for (const i of incidents) {
    const n = NAMES[i.properties.iconCategory] ?? `Category ${i.properties.iconCategory}`
    byType[n] = (byType[n] ?? 0) + 1
  }
  console.log(`✓ TomTom key works (key ending …${key.slice(-4)}).`)
  console.log(`  ${incidents.length} live incidents in central Dhaka right now.`)
  for (const [n, c] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`   · ${n}: ${c}`)
  const sample = incidents.slice(0, 3)
  for (const i of sample) {
    const p = i.properties
    console.log(`   e.g. ${NAMES[p.iconCategory] ?? "Incident"} — ${p.from ?? "?"} → ${p.to ?? "?"}${p.delay ? ` (+${Math.round(p.delay / 60)} min)` : ""}${p.events?.[0] ? ` · ${p.events[0].description}` : ""}`)
  }
  if (incidents.length === 0) console.log("  (No incidents returned — coverage may be light at this hour. The integration is still active.)")
} catch (e) {
  console.error(`✗ ${e.message}`)
  process.exit(1)
}
