/** OpenStreetMap Overpass client — public mirrors are flaky, so each is tried in order. */
import "./net"

const MIRRORS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
]

export type OsmElement = {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}
export type OSM = { elements: OsmElement[] }

async function one(url: string, query: string, timeoutMs: number): Promise<OSM> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "User-Agent": "SHONGKET/0.1 (+open-data prototype)", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return (await res.json()) as OSM
}

/**
 * Hedged request: start the first mirror, and if it hasn't answered within `hedgeMs` (or fails),
 * start the next one too. The first successful answer wins. Keeps latency low without hitting
 * every mirror on every call.
 */
export function overpass(query: string, timeoutMs = 25000, hedgeMs = 7000): Promise<OSM> {
  return new Promise((resolve, reject) => {
    let started = 0
    let failed = 0
    let done = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const errors: unknown[] = []
    const launch = () => {
      if (done || started >= MIRRORS.length) return
      const url = MIRRORS[started++]
      clearTimeout(timer)
      timer = setTimeout(launch, hedgeMs)
      one(url, query, timeoutMs).then(
        (r) => {
          if (done) return
          done = true
          clearTimeout(timer)
          resolve(r)
        },
        (e) => {
          errors.push(e)
          if (++failed === MIRRORS.length) {
            clearTimeout(timer)
            reject(errors[errors.length - 1])
          } else launch()
        },
      )
    }
    launch()
  })
}
