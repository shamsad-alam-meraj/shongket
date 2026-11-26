"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import {
  ArrowUpDown, CloudRain, ExternalLink, Loader2, LocateFixed, MapPin, Navigation, Route as RouteIcon, Search, Share2, Sparkles, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { STATUS_META } from "@/lib/signals"
import { DHAKA, formatDistance, timeAgoIso, toBnDigits, type LiveSignal } from "@/lib/live/types"
import { useGeolocation } from "@/hooks/use-geolocation"
import { useNow } from "@/hooks/use-live-data"
import { ROUTE_LEVEL, type GeoResult, type PulseResponse, type RouteOption, type RoutesResponse } from "@/lib/routes/types"
import type { MapLine } from "@/components/live/live-map"

const LiveMap = dynamic(() => import("@/components/live/live-map").then((m) => m.LiveMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-surface" />,
})

type Place = { name: string; lat: number; lng: number }

const fmtMin = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`)

/** Debounced place search against /api/routes/geocode. */
function PlaceInput({
  label, value, onPick, near, placeholder, onUseLocation, autoFocus,
}: {
  label: string
  value: Place | null
  onPick: (p: Place | null) => void
  near: { lat: number; lng: number }
  placeholder: string
  onUseLocation?: () => void
  autoFocus?: boolean
}) {
  const [q, setQ] = useState(value?.name ?? "")
  const [results, setResults] = useState<GeoResult[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const listId = useId()

  useEffect(() => {
    const t = setTimeout(() => setQ(value?.name ?? ""), 0)
    return () => clearTimeout(t)
  }, [value])

  const search = (text: string) => {
    clearTimeout(timer.current)
    if (text.trim().length < 2) {
      setResults([])
      return
    }
    timer.current = setTimeout(async () => {
      setBusy(true)
      try {
        const r = await fetch(`/api/routes/geocode?q=${encodeURIComponent(text)}&lat=${near.lat.toFixed(2)}&lng=${near.lng.toFixed(2)}`)
        const d = (await r.json()) as { results: GeoResult[] }
        setResults(d.results)
        setActive(0)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setBusy(false)
      }
    }, 300)
  }

  const pick = (g: GeoResult) => {
    onPick({ name: g.name, lat: g.lat, lng: g.lng })
    setQ(g.name)
    setOpen(false)
  }

  return (
    <div className="relative">
      <label className="block">
        <span className="sr-only">{label}</span>
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">{label}</span>
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value)
            if (value) onPick(null)
            search(e.target.value)
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !results.length) return
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)) }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
            if (e.key === "Enter") { e.preventDefault(); pick(results[active]) }
            if (e.key === "Escape") setOpen(false)
          }}
          placeholder={placeholder}
          role="combobox"
          aria-controls={listId}
          aria-expanded={open}
          aria-autocomplete="list"
          className="h-12 w-full rounded-2xl border border-border bg-background pl-10 pr-24 text-sm outline-none placeholder:text-muted-foreground focus:border-teal"
        />
      </label>
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {q && (
          <button onClick={() => { setQ(""); onPick(null); setResults([]) }} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted" aria-label={`Clear ${label}`}>
            <X className="size-4" />
          </button>
        )}
        {onUseLocation && (
          <button onClick={onUseLocation} className="grid size-8 place-items-center rounded-full text-teal hover:bg-muted" aria-label="Use my location" title="Use my location">
            <LocateFixed className="size-4" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          {results.map((g, i) => (
            <li key={g.id} role="option" aria-selected={i === active}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(g)}
                className={cn("flex w-full items-start gap-2.5 px-4 py-2.5 text-left text-sm", i === active ? "bg-muted" : "hover:bg-muted/60")}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate">{g.name}</span>
                  {g.context && <span className="block truncate text-xs text-muted-foreground">{g.context}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LevelPill({ level, bangla }: { level: RouteOption["level"]; bangla: boolean }) {
  const m = ROUTE_LEVEL[level]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px]", bangla && "font-bangla")}>
      <span className="size-1.5 rounded-full" style={{ background: m.color }} aria-hidden />
      {bangla ? m.labelBn : m.label}
    </span>
  )
}

export function RoutesPlanner() {
  const geo = useGeolocation(false)
  const now = useNow()
  const [bangla, setBangla] = useState(false)
  const [from, setFrom] = useState<Place | null>(null)
  const [to, setTo] = useState<Place | null>(null)
  const [data, setData] = useState<RoutesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [pulse, setPulse] = useState<PulseResponse | null>(null)
  const [wantLocation, setWantLocation] = useState(false)
  const [copied, setCopied] = useState(false)
  const t = (en: string, bn: string) => (bangla ? bn : en)
  const near = geo.coords ?? DHAKA

  // Shareable links: /routes?from=lat,lng,name&to=lat,lng,name
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const parse = (v: string | null): Place | null => {
      if (!v) return null
      const [lat, lng, ...rest] = v.split(",")
      const p = { lat: Number(lat), lng: Number(lng), name: decodeURIComponent(rest.join(",")) || "Pinned place" }
      return Number.isFinite(p.lat) && Number.isFinite(p.lng) ? p : null
    }
    const f = parse(sp.get("from"))
    const tt = parse(sp.get("to"))
    const id = setTimeout(() => {
      if (f) setFrom(f)
      if (tt) setTo(tt)
    }, 0)
    return () => clearTimeout(id)
  }, [])

  // "Use my location" for the start, once the browser hands us a fix
  useEffect(() => {
    if (!wantLocation || !geo.coords) return
    const id = setTimeout(() => {
      setFrom({ name: "My location", lat: geo.coords!.lat, lng: geo.coords!.lng })
      setWantLocation(false)
    }, 0)
    return () => clearTimeout(id)
  }, [wantLocation, geo.coords])

  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/routes/pulse?lat=${near.lat.toFixed(2)}&lng=${near.lng.toFixed(2)}`, { cache: "no-store" })
        setPulse((await r.json()) as PulseResponse)
      } catch {
        setPulse({ generatedAt: new Date().toISOString(), ok: false, hotspots: [] })
      }
    }, 0)
    return () => clearTimeout(id)
  }, [near.lat, near.lng])

  const plan = useCallback(async (a: Place, b: Place) => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/routes?from=${a.lat.toFixed(5)},${a.lng.toFixed(5)}&to=${b.lat.toFixed(5)},${b.lng.toFixed(5)}`, { cache: "no-store" })
      const d = (await r.json()) as RoutesResponse & { error?: string }
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
      setData(d)
      setSelected(d.routes.find((x) => x.recommended)?.id ?? d.routes[0]?.id ?? null)
      if (!d.ok) setError(d.error ?? "Routing is busy right now")
      const enc = (p: Place) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)},${encodeURIComponent(p.name)}`
      window.history.replaceState(null, "", `/routes?from=${enc(a)}&to=${enc(b)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to plan route")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Plan automatically once both ends are set
  useEffect(() => {
    if (!from || !to) return
    const id = setTimeout(() => plan(from, to), 0)
    return () => clearTimeout(id)
  }, [from, to, plan])

  const route = data?.routes.find((r) => r.id === selected) ?? null

  const lines: MapLine[] = useMemo(() => {
    if (!data?.ok) return []
    const others = data.routes.filter((r) => r.id !== selected).map((r) => ({ id: r.id, coords: r.coords, color: "#7d8aa0", width: 5, opacity: 0.55 }))
    const sel = route ? [{ id: route.id, coords: route.coords, color: "#20d6c2", width: 7, opacity: 0.95 }] : []
    return [...others, ...sel]
  }, [data, selected, route])

  const signals: LiveSignal[] = useMemo(() => {
    if (route) return route.hits.map((h) => h.signal)
    return []
  }, [route])

  const pins = useMemo(() => {
    const out: { id: string; lat: number; lng: number; label: string; color: string }[] = []
    if (from) out.push({ id: "from", lat: from.lat, lng: from.lng, label: "A", color: "#20d6c2" })
    if (to) out.push({ id: "to", lat: to.lat, lng: to.lng, label: "B", color: "#579bff" })
    return out
  }, [from, to])

  const fitCoords = useMemo(() => {
    if (data?.ok && data.routes.length) return data.routes.flatMap((r) => r.coords)
    return pins.map((p) => [p.lng, p.lat] as [number, number])
  }, [data, pins])
  const fitKey = data?.ok ? data.generatedAt : pins.map((p) => `${p.lat},${p.lng}`).join("|")

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">SHONGKET Routes</p>
          <h1 className="mt-4 font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Know what&apos;s on the road — <span className="font-serif font-normal italic text-teal">before you leave.</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Pick a start and a destination. We check each road route against confirmed reports of blockades, rallies,
            clashes, accidents, jams and waterlogging, and point you to the one with the fewest. Unverified reports are
            shown, but never change the route we recommend.
          </p>
        </div>
        <button onClick={() => setBangla((v) => !v)} className="h-9 rounded-full border border-border px-3.5 text-sm transition-colors hover:bg-muted" aria-pressed={bangla}>
          {bangla ? "English" : "বাংলা"}
        </button>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* ── Left: planner + results ── */}
        <div className="order-2 space-y-4 lg:order-1">
          <div className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-stretch gap-2">
              <div className="flex-1 space-y-2">
                <PlaceInput
                  label="A"
                  value={from}
                  onPick={setFrom}
                  near={near}
                  autoFocus
                  placeholder={t("Start — e.g. Farmgate", "শুরু — যেমন ফার্মগেট")}
                  onUseLocation={() => {
                    if (geo.coords) setFrom({ name: "My location", lat: geo.coords.lat, lng: geo.coords.lng })
                    else {
                      setWantLocation(true)
                      geo.request()
                    }
                  }}
                />
                <PlaceInput label="B" value={to} onPick={setTo} near={near} placeholder={t("Destination — e.g. Motijheel", "গন্তব্য — যেমন মতিঝিল")} />
              </div>
              <button
                onClick={() => {
                  const a = from
                  setFrom(to)
                  setTo(a)
                }}
                className="grid w-10 place-items-center rounded-2xl border border-border text-muted-foreground transition hover:bg-muted"
                aria-label="Swap start and destination"
              >
                <ArrowUpDown className="size-4" />
              </button>
            </div>
            {wantLocation && geo.status === "denied" && (
              <p className="mt-3 text-xs text-muted-foreground">{t("Location permission is off — type your start instead.", "লোকেশন অনুমতি বন্ধ — শুরুর স্থান লিখুন।")}</p>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-2 rounded-3xl border border-border p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t("Checking routes against live disruptions…", "লাইভ বিঘ্নের সঙ্গে রুট মিলিয়ে দেখা হচ্ছে…")}
            </div>
          )}
          {error && !loading && (
            <div className="rounded-3xl border border-border p-6 text-sm">
              {error}.{" "}
              {from && to && <button onClick={() => plan(from, to)} className="text-teal hover:underline">{t("Try again", "আবার চেষ্টা করুন")}</button>}
            </div>
          )}

          {!loading && data?.ok && (
            <>
              <ul className="space-y-2" aria-label="Route options">
                {data.routes.map((r, i) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelected(r.id)}
                      aria-pressed={selected === r.id}
                      className={cn("w-full rounded-3xl border p-4 text-left transition sm:p-5", selected === r.id ? "border-teal bg-surface" : "border-border hover:bg-surface")}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{t(`Route ${i + 1}`, `রুট ${toBnDigits(i + 1)}`)}</span>
                        {r.recommended && data.routes.length > 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal/12 px-2 py-0.5 text-[11px] text-teal">
                            <Sparkles className="size-3" /> {t("Fewest disruptions", "সবচেয়ে কম বিঘ্ন")}
                          </span>
                        )}
                        <span className="ml-auto"><LevelPill level={r.level} bangla={bangla} /></span>
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">{t("via", "হয়ে")} {r.via}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
                        <span>{r.distanceKm} km</span>
                        <span title="Free-flow estimate — Dhaka traffic is usually much slower">{fmtMin(r.freeFlowMin)} {t("with empty roads", "ফাঁকা রাস্তায়")}</span>
                        {(() => {
                          const c = r.hits.filter((h) => h.counts).length
                          const u = r.hits.length - c
                          return (
                            <span>
                              {bangla ? toBnDigits(c) : c} {t(c === 1 ? "confirmed report" : "confirmed reports", "টি নিশ্চিত খবর")}
                              {u > 0 && ` · ${bangla ? toBnDigits(u) : u} ${t("unverified", "অযাচাইকৃত")}`}
                            </span>
                          )
                        })()}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {route && (
                <div className="rounded-3xl border border-border p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold">{t("Along this route", "এই রুটে")}</h2>
                    <div className="flex gap-2">
                      <button onClick={share} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs transition hover:bg-muted">
                        <Share2 className="size-3.5" /> {copied ? t("Link copied", "লিংক কপি হয়েছে") : t("Share", "শেয়ার")}
                      </button>
                      {from && to && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:brightness-110"
                        >
                          <Navigation className="size-3.5" /> {t("Navigate", "নেভিগেট")}
                        </a>
                      )}
                    </div>
                  </div>
                  {route.hits.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {t(
                        "No blockades, rallies, clashes, accidents, jams or waterlogging have been reported along this route in the last few hours.",
                        "গত কয়েক ঘণ্টায় এই রুটে অবরোধ, মিছিল, সংঘর্ষ, দুর্ঘটনা, যানজট বা জলাবদ্ধতার কোনো খবর নেই।",
                      )}
                    </p>
                  ) : (
                    <ol className="mt-5 space-y-4 border-l border-border pl-5">
                      {route.hits.map((h) => {
                        const s = h.signal
                        return (
                          <li key={s.id} className="relative">
                            <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-background" style={{ background: h.counts ? STATUS_META[s.status].color : "var(--color-status-unknown)" }} aria-hidden />
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {t(`at ${h.atKm.toFixed(1)} km`, `${toBnDigits(h.atKm.toFixed(1))} কিমি-তে`)} · {h.offsetKm < 0.15 ? t("on the route", "রুটের ওপর") : t(`${formatDistance(h.offsetKm)} off the route`, `রুট থেকে ${formatDistance(h.offsetKm)}`)}
                              {now ? ` · ${timeAgoIso(s.updatedAt, now)}` : ""}
                            </p>
                            <p className={cn("mt-0.5 text-sm font-medium", bangla && "font-bangla", !h.counts && "text-muted-foreground")}>{bangla ? s.titleBn : s.title}</p>
                            {!h.counts && (
                              <p className={cn("mt-0.5 inline-block rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground", bangla && "font-bangla")}>
                                {t("Unverified — shown for awareness, doesn't change the route rating", "অযাচাইকৃত — শুধু জানার জন্য, রুটের মূল্যায়নে প্রভাব নেই")}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {STATUS_META[s.status].label} · {s.verification === "confirmed" ? t("confirmed", "নিশ্চিত") : t("unverified", "অযাচাইকৃত")} · {s.source}
                              {s.approximate && t(" · area-level location", " · আনুমানিক অবস্থান")}
                            </p>
                            {s.sourceUrl && (
                              <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-teal hover:underline">
                                {t("Read the report", "খবরটি পড়ুন")} <ExternalLink className="size-3" />
                              </a>
                            )}
                          </li>
                        )
                      })}
                    </ol>
                  )}
                  {data.weather.length > 0 && (
                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                      {data.weather.map((w) => (
                        <div key={w.at} className="flex gap-2.5 rounded-2xl bg-surface px-3.5 py-3 text-xs">
                          <CloudRain className={cn("mt-0.5 size-4 shrink-0", w.rainMm3h >= 1 ? "text-intel" : "text-muted-foreground")} />
                          <span>
                            <span className="block font-medium">{w.at === "start" ? t("At the start", "শুরুতে") : t("At the destination", "গন্তব্যে")}</span>
                            <span className="text-muted-foreground">{w.summary} ({w.rainMm3h} mm, {w.chance}%)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-5 text-[11px] text-muted-foreground">
                    {t(
                      "Times assume empty roads (OSRM). They are not traffic predictions — use them to compare routes, not to plan arrival.",
                      "সময় ফাঁকা রাস্তা ধরে হিসাব (OSRM) — যানজটের পূর্বাভাস নয়। রুট তুলনায় ব্যবহার করুন।",
                    )}
                  </p>
                </div>
              )}
            </>
          )}

          {!data && !loading && (
            <div className="rounded-3xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              <RouteIcon className="mb-3 size-5 text-teal" />
              {t("Enter both ends to compare routes. Your trip is not stored — only the two points are sent to the routing service.", "রুট তুলনা করতে দুই প্রান্তই লিখুন। আপনার যাত্রা সংরক্ষণ করা হয় না — শুধু দুটি বিন্দু রাউটিং সেবায় পাঠানো হয়।")}
            </div>
          )}
        </div>

        {/* ── Right: map ── */}
        <div className="relative order-1 h-80 overflow-hidden rounded-3xl border border-border sm:h-[28rem] lg:order-2 lg:sticky lg:top-24 lg:h-[72vh]">
          <LiveMap
            center={near}
            zoom={12}
            user={geo.coords ? { coords: geo.coords, accuracy: geo.accuracy } : null}
            signals={signals}
            lines={lines}
            pins={pins}
            fitKey={fitKey}
            fitCoords={fitCoords}
          />
        </div>
      </div>

      {/* ── Mobility pulse ── */}
      <section className="mt-16" aria-labelledby="pulse-h">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">{t("Mobility pulse · 24 h", "চলাচলের হালচাল · ২৪ ঘণ্টা")}</p>
        <h2 id="pulse-h" className={cn("mt-3 text-2xl font-semibold tracking-tight", bangla ? "font-bangla" : "font-display")}>{t("Hotspots reported around the city", "শহরজুড়ে যেসব জায়গায় বিঘ্নের খবর")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("From news headlines in the last 24 hours, clustered by area. Locations are area-level.", "গত ২৪ ঘণ্টার সংবাদ শিরোনাম থেকে, এলাকাভিত্তিক। অবস্থান আনুমানিক।")}
        </p>
        {!pulse ? (
          <div className="mt-6 h-24 animate-pulse rounded-3xl bg-surface" />
        ) : !pulse.ok ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("The news source is unavailable right now.", "সংবাদ সূত্র এখন পাওয়া যাচ্ছে না।")}</p>
        ) : pulse.hotspots.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("No road disruptions reported within 60 km in the last 24 hours.", "গত ২৪ ঘণ্টায় ৬০ কিমির মধ্যে সড়কে বিঘ্নের খবর নেই।")}</p>
        ) : (
          <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pulse.hotspots.map((h) => (
              <li key={h.id} className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: STATUS_META[h.status].color }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", bangla && "font-bangla")}>{bangla ? `${h.areaBn} — ${h.labelBn}` : `${h.label} — ${h.area}`}</span>
                  <span className="block text-xs text-muted-foreground">
                    {h.outlets} {t(h.outlets === 1 ? "outlet" : "outlets", "সূত্র")}{now ? ` · ${timeAgoIso(h.latestAt, now)}` : ""}
                    {!h.confirmed && ` · ${t("unverified", "অযাচাইকৃত")}`}
                  </span>
                </span>
                <button
                  onClick={() => setTo({ name: h.area, lat: h.lat, lng: h.lng })}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={t("Check a route to here", "এখানে যাওয়ার রুট দেখুন")}
                  aria-label={`Check a route to ${h.area}`}
                >
                  <Search className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Sources ── */}
      {data && (
        <section className="mt-12" aria-label="Sources">
          <ul className="flex flex-wrap gap-2">
            {data.sources.map((s) => (
              <li key={s.name} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs">
                <span className="size-1.5 rounded-full" style={{ background: s.ok ? "var(--color-status-normal)" : "var(--color-status-unknown)" }} aria-hidden />
                {s.name}
                {!s.ok && <span className="text-muted-foreground">· {s.error ?? "unavailable"}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">Routing © OSRM · Roads & places © OpenStreetMap contributors · Search by Photon (komoot).</p>
        </section>
      )}
    </div>
  )
}
