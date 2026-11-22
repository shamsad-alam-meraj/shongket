"use client"

import "maplibre-gl/dist/maplibre-gl.css"
import * as maplibregl from "maplibre-gl"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { STATUS_META } from "@/lib/signals"
import { SERVICE_INFO, type LiveService, type LiveSignal } from "@/lib/live/types"
import { useIsDark } from "@/components/site/theme-toggle"

// Serve MapLibre's worker from /public (see scripts/copy-maplibre-worker.mjs) — the default
// import.meta.url-relative lookup breaks once the library is bundled.
maplibregl.setWorkerUrl(`/vendor/maplibre-gl-worker-${maplibregl.getVersion()}.mjs`)

const STYLES = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
}

type Pt = { lat: number; lng: number }

type Props = {
  center: Pt
  zoom?: number
  user?: { coords: Pt; accuracy: number | null } | null
  signals: LiveSignal[]
  services?: LiveService[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  interactive?: boolean
  className?: string
  /** bump to re-centre on `center` */
  recenterKey?: number
}

/** Brand-tint the base style: midnight background, muted water. */
function tint(map: maplibregl.Map, dark: boolean) {
  const style = map.getStyle()
  if (!style?.layers) return
  for (const l of style.layers) {
    try {
      if (l.type === "background") map.setPaintProperty(l.id, "background-color", dark ? "#0b1220" : "#f4f7fb")
      if (l.id.includes("water") && l.type === "fill") map.setPaintProperty(l.id, "fill-color", dark ? "#12243f" : "#d6e4f5")
    } catch {}
  }
}

function circlePolygon(c: Pt, radiusM: number, steps = 48): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = []
  const dLat = radiusM / 111_320
  const dLng = radiusM / (111_320 * Math.cos((c.lat * Math.PI) / 180))
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    coords.push([c.lng + dLng * Math.cos(a), c.lat + dLat * Math.sin(a)])
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } }
}

function signalEl(s: LiveSignal, onClick: () => void) {
  const el = document.createElement("button")
  el.type = "button"
  el.className = "sg-marker"
  el.setAttribute("aria-label", `${s.title} — ${STATUS_META[s.status].label}`)
  el.dataset.status = s.status
  el.dataset.verification = s.verification
  el.style.setProperty("--c", STATUS_META[s.status].color)
  el.innerHTML = `<span class="sg-ping"></span><span class="sg-dot"></span>`
  el.addEventListener("click", (e) => {
    e.stopPropagation()
    onClick()
  })
  return el
}

function serviceEl(s: LiveService, onClick: () => void) {
  const el = document.createElement("button")
  el.type = "button"
  el.className = "sv-marker"
  el.title = `${SERVICE_INFO[s.kind].label}: ${s.name}`
  el.setAttribute("aria-label", el.title)
  el.style.setProperty("--c", SERVICE_INFO[s.kind].color)
  el.textContent = s.kind === "pharmacy" ? "℞" : s.kind === "police" ? "P" : s.kind === "fire_station" ? "F" : "+"
  el.addEventListener("click", (e) => {
    e.stopPropagation()
    onClick()
  })
  return el
}

export function LiveMap({
  center, zoom = 12.5, user, signals, services = [], selectedId, onSelect,
  interactive = true, className, recenterKey = 0,
}: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef(new Map<string, maplibregl.Marker>())
  const userMarker = useRef<maplibregl.Marker | null>(null)
  const ready = useRef(false)
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  // Callbacks to run whenever a (new) base style finishes loading
  const onStyleReady = useRef(new Set<() => void>())
  const dark = useIsDark()

  // Create once
  useEffect(() => {
    if (!box.current || map.current) return
    const m = new maplibregl.Map({
      container: box.current,
      style: dark ? STYLES.dark : STYLES.light,
      center: [center.lng, center.lat],
      zoom,
      interactive,
      attributionControl: { compact: true },
      cooperativeGestures: false,
      fadeDuration: 150,
    })
    if (interactive) m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right")
    m.on("style.load", () => {
      tint(m, document.documentElement.classList.contains("dark"))
      ready.current = true
      onStyleReady.current.forEach((fn) => fn())
    })
    map.current = m
    if (process.env.NODE_ENV !== "production") (window as unknown as { __shongketMap?: maplibregl.Map }).__shongketMap = m
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(box.current)
    const mk = markers.current
    return () => {
      ro.disconnect()
      mk.clear()
      m.remove()
      map.current = null
      ready.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Theme switch → swap base style (only on an actual change, never on mount)
  const appliedTheme = useRef(dark)
  useEffect(() => {
    const m = map.current
    if (!m || appliedTheme.current === dark) return
    appliedTheme.current = dark
    ready.current = false
    m.setStyle(dark ? STYLES.dark : STYLES.light)
  }, [dark])

  // Re-centre when asked (or when the anchor changes)
  useEffect(() => {
    map.current?.flyTo({ center: [center.lng, center.lat], zoom: Math.max(map.current.getZoom(), zoom), duration: 1200 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey, center.lat, center.lng])

  // Signal + service markers (diffed by id)
  useEffect(() => {
    const m = map.current
    if (!m) return
    const wanted = new Map<string, () => maplibregl.Marker>()
    for (const s of signals) {
      wanted.set(`s:${s.id}:${s.status}:${s.verification}`, () =>
        new maplibregl.Marker({ element: signalEl(s, () => onSelectRef.current?.(s.id)) }).setLngLat([s.lng, s.lat]),
      )
    }
    for (const s of services) {
      wanted.set(`v:${s.id}`, () =>
        new maplibregl.Marker({ element: serviceEl(s, () => onSelectRef.current?.(`svc:${s.id}`)) }).setLngLat([s.lng, s.lat]),
      )
    }
    for (const [k, mk] of markers.current) {
      if (!wanted.has(k)) {
        mk.remove()
        markers.current.delete(k)
      }
    }
    for (const [k, make] of wanted) {
      if (!markers.current.has(k)) markers.current.set(k, make().addTo(m))
    }
  }, [signals, services])

  // Selection highlight + fly
  useEffect(() => {
    const m = map.current
    if (!m) return
    for (const [k, mk] of markers.current) {
      const id = k.startsWith("s:") ? k.split(":")[1] : `svc:${k.slice(2)}`
      mk.getElement().classList.toggle("is-selected", id === selectedId)
    }
    if (!selectedId || !interactive) return
    const sig = signals.find((s) => s.id === selectedId)
    const svc = services.find((s) => `svc:${s.id}` === selectedId)
    const t = sig ?? svc
    if (!t) return
    const far = sig && sig.distanceKm > 80
    m.flyTo({ center: [t.lng, t.lat], zoom: far ? 6 : Math.max(m.getZoom(), 14), duration: 900, padding: { right: 0, top: 0, bottom: 0, left: 0 } })
  }, [selectedId, signals, services, interactive])

  // User location + accuracy ring
  useEffect(() => {
    const m = map.current
    if (!m) return
    const draw = () => {
      if (!user) {
        userMarker.current?.remove()
        userMarker.current = null
        if (m.getLayer("acc-fill")) m.removeLayer("acc-fill")
        if (m.getLayer("acc-line")) m.removeLayer("acc-line")
        if (m.getSource("acc")) m.removeSource("acc")
        return
      }
      if (!userMarker.current) {
        const el = document.createElement("div")
        el.className = "me-marker"
        el.setAttribute("aria-label", "Your location")
        userMarker.current = new maplibregl.Marker({ element: el }).setLngLat([user.coords.lng, user.coords.lat]).addTo(m)
      } else userMarker.current.setLngLat([user.coords.lng, user.coords.lat])
      const ring = circlePolygon(user.coords, Math.min(Math.max(user.accuracy ?? 30, 15), 3000))
      const src = m.getSource("acc") as maplibregl.GeoJSONSource | undefined
      if (src) src.setData(ring)
      else if (m.isStyleLoaded()) {
        m.addSource("acc", { type: "geojson", data: ring })
        m.addLayer({ id: "acc-fill", type: "fill", source: "acc", paint: { "fill-color": "#579bff", "fill-opacity": 0.12 } })
        m.addLayer({ id: "acc-line", type: "line", source: "acc", paint: { "line-color": "#579bff", "line-opacity": 0.5, "line-width": 1 } })
      }
    }
    if (ready.current) draw()
    const onReady = () => {
      tint(m, document.documentElement.classList.contains("dark"))
      draw()
    }
    const subs = onStyleReady.current
    subs.add(onReady)
    return () => {
      subs.delete(onReady)
    }
  }, [user])

  return <div ref={box} className={cn("size-full", className)} />
}
