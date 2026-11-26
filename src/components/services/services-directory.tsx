"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Accessibility, Clock, ExternalLink, Globe, Loader2, LocateFixed, MapPin, Navigation, Phone, RefreshCw, Search, Siren, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DHAKA, SERVICE_INFO, formatDistance, timeAgoIso, toBnDigits } from "@/lib/live/types"
import { useGeolocation } from "@/hooks/use-geolocation"
import { useNow } from "@/hooks/use-live-data"
import { GROUPS, RADII, type DirectoryResponse, type Place, type Radius, type ServiceGroup } from "@/lib/services/types"
import { HOTLINES } from "@/lib/services/hotlines"

const LiveMap = dynamic(() => import("@/components/live/live-map").then((m) => m.LiveMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-surface" />,
})

const MAP_LIMIT = 300
const PAGE = 50

function useDirectory(point: { lat: number; lng: number }, radius: Radius) {
  const [data, setData] = useState<DirectoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)},${radius}`

  const load = useCallback(async () => {
    const [lat, lng, r] = key.split(",")
    setLoading(true)
    try {
      const res = await fetch(`/api/services/directory?lat=${lat}&lng=${lng}&radius=${r}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData((await res.json()) as DirectoryResponse)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [load])

  return { data, loading, error, reload: load }
}

const telHref = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`
const directionsHref = (p: Place) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
const osmHref = (p: Place) => `https://www.openstreetmap.org/${p.id}`

function OpenBadge({ open, bangla }: { open: boolean | null; bangla: boolean }) {
  if (open == null) return null
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px]", open ? "text-teal" : "text-muted-foreground", bangla && "font-bangla")}>
      <span className={cn("size-1.5 rounded-full", open ? "bg-teal" : "bg-status-unknown")} aria-hidden />
      {open ? (bangla ? "এখন খোলা" : "Open now") : bangla ? "এখন বন্ধ" : "Closed now"}
    </span>
  )
}

export function ServicesDirectory() {
  const geo = useGeolocation(false)
  const point = geo.coords ?? DHAKA
  const [radius, setRadius] = useState<Radius>(3)
  const { data, loading, error, reload } = useDirectory(point, radius)
  const now = useNow()

  const [bangla, setBangla] = useState(false)
  const [group, setGroup] = useState<ServiceGroup | "all">("all")
  const [query, setQuery] = useState("")
  const [openOnly, setOpenOnly] = useState(false)
  const [phoneOnly, setPhoneOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)
  const [recenter, setRecenter] = useState(0)

  const t = (en: string, bn: string) => (bangla ? bn : en)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.places ?? []).filter((p) => {
      if (group !== "all" && p.group !== group) return false
      if (openOnly && p.openNow !== true) return false
      if (phoneOnly && !p.phone) return false
      if (q && !`${p.name} ${p.nameBn ?? ""} ${p.address ?? ""} ${p.operator ?? ""} ${SERVICE_INFO[p.kind].label}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, group, openOnly, phoneOnly, query])

  const groupCounts = useMemo(() => {
    const c: Record<string, number> = { all: data?.places.length ?? 0 }
    for (const p of data?.places ?? []) c[p.group] = (c[p.group] ?? 0) + 1
    return c
  }, [data])

  const onMap = useMemo(() => {
    const top = filtered.slice(0, MAP_LIMIT)
    const sel = selectedId ? filtered.find((p) => `svc:${p.id}` === selectedId) : null
    return sel && !top.includes(sel) ? [...top, sel] : top
  }, [filtered, selectedId])
  const selected = selectedId ? data?.places.find((p) => `svc:${p.id}` === selectedId) ?? null : null
  const nearestHospital = data?.places.find((p) => p.kind === "hospital")

  const resetPaging = () => setLimit(PAGE)

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">SHONGKET Services</p>
          <h1 className="mt-4 font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Help nearby — <span className="font-serif font-normal italic text-teal">found in seconds.</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Hospitals, pharmacies, police, fire service, shelters and everyday utilities around you, with what&apos;s open
            now. Mapped by the OpenStreetMap community.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setBangla((v) => !v)} className="h-9 rounded-full border border-border px-3.5 text-sm transition-colors hover:bg-muted" aria-pressed={bangla}>
            {bangla ? "English" : "বাংলা"}
          </button>
          <button onClick={reload} disabled={loading} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm transition-colors hover:bg-muted disabled:opacity-60">
            <RefreshCw className={cn("size-4", loading && "animate-spin")} /> {t("Refresh", "রিফ্রেশ")}
          </button>
        </div>
      </div>

      {/* ── Emergency strip ── */}
      <a
        href="tel:999"
        className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-status-critical/40 bg-status-critical/10 px-5 py-4 transition-colors hover:bg-status-critical/15"
      >
        <Siren className="size-5 text-status-critical" />
        <span className={cn("font-medium", bangla && "font-bangla")}>{t("In an emergency, call 999", "জরুরি প্রয়োজনে ৯৯৯ নম্বরে কল করুন")}</span>
        <span className={cn("text-sm text-muted-foreground", bangla && "font-bangla")}>
          {t("Police, fire service and ambulance — free, 24/7", "পুলিশ, ফায়ার সার্ভিস ও অ্যাম্বুলেন্স — বিনা খরচে, ২৪ ঘণ্টা")}
        </span>
        {nearestHospital && (
          <span className="text-sm text-muted-foreground sm:ml-auto">
            {t("Nearest hospital", "নিকটতম হাসপাতাল")}: <span className="text-foreground">{(bangla && nearestHospital.nameBn) || nearestHospital.name}</span> · {formatDistance(nearestHospital.distanceKm)}
          </span>
        )}
      </a>

      {/* ── Location + radius ── */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
        <MapPin className="size-4 text-teal" />
        <span className="font-medium">{geo.coords ? t("Around you", "আপনার আশপাশে") : t("Central Dhaka", "কেন্দ্রীয় ঢাকা")}</span>
        {!geo.coords && geo.status !== "denied" && geo.status !== "unsupported" && (
          <button onClick={geo.request} className="inline-flex items-center gap-1.5 text-teal hover:underline">
            <LocateFixed className="size-4" /> {t("Use my location", "আমার অবস্থান ব্যবহার করুন")}
          </button>
        )}
        {geo.status === "denied" && <span className="text-muted-foreground">{t("Location permission is off — showing central Dhaka.", "লোকেশন অনুমতি বন্ধ — কেন্দ্রীয় ঢাকা দেখানো হচ্ছে।")}</span>}
        <div className="flex items-center gap-1 sm:ml-auto" role="group" aria-label="Search radius">
          {RADII.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRadius(r)
                resetPaging()
              }}
              aria-pressed={radius === r}
              className={cn("h-8 rounded-full px-3 font-mono text-xs transition-colors", radius === r ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {bangla ? toBnDigits(r) : r} km
            </button>
          ))}
        </div>
      </div>

      {/* ── Directory: list + map ── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="order-2 flex min-h-0 flex-col overflow-hidden rounded-3xl border border-border lg:order-1 lg:h-[75vh]">
          {/* filters */}
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex flex-wrap gap-1.5">
              {[{ key: "all" as const, label: "All", labelBn: "সব" }, ...GROUPS].map((g) => (
                <button
                  key={g.key}
                  onClick={() => {
                    setGroup(g.key)
                    resetPaging()
                  }}
                  aria-pressed={group === g.key}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
                    group === g.key ? "border-transparent bg-foreground text-background" : "border-border hover:bg-muted",
                    bangla && "font-bangla",
                  )}
                >
                  {bangla ? g.labelBn : g.label}
                  <span className="font-mono opacity-60">{groupCounts[g.key] ?? 0}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative min-w-48 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    resetPaging()
                  }}
                  placeholder={t("Search name, area or type…", "নাম, এলাকা বা ধরন খুঁজুন…")}
                  className="h-9 w-full rounded-full border border-border bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-teal"
                  aria-label="Search services"
                />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                <input type="checkbox" checked={openOnly} onChange={(e) => { setOpenOnly(e.target.checked); resetPaging() }} className="accent-teal" />
                {t("Open now", "এখন খোলা")}
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                <input type="checkbox" checked={phoneOnly} onChange={(e) => { setPhoneOnly(e.target.checked); resetPaging() }} className="accent-teal" />
                {t("Has phone", "ফোন আছে")}
              </label>
            </div>
          </div>

          {/* list */}
          <ul className="max-h-[70vh] min-h-0 flex-1 overflow-y-auto p-2 lg:max-h-none" aria-live="polite">
            {loading && !data && (
              <li className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {t("Searching OpenStreetMap…", "ওপেনস্ট্রিটম্যাপে খোঁজা হচ্ছে…")}
              </li>
            )}
            {(error || (data && !data.ok)) && (
              <li className="p-8 text-center text-sm text-muted-foreground">
                {t("The OpenStreetMap lookup is busy right now.", "ওপেনস্ট্রিটম্যাপ এখন ব্যস্ত।")}{" "}
                <button onClick={reload} className="text-teal underline">{t("Try again", "আবার চেষ্টা করুন")}</button>
              </li>
            )}
            {data?.ok && filtered.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground">
                {group === "shelter"
                  ? t("No emergency shelters are mapped here. In coastal districts, ask your Union Parishad or call 1090 for the nearest cyclone shelter.", "এখানে কোনো আশ্রয়কেন্দ্র ম্যাপে নেই। উপকূলীয় এলাকায় নিকটতম আশ্রয়কেন্দ্রের জন্য ইউনিয়ন পরিষদে যোগাযোগ করুন বা ১০৯০ নম্বরে কল করুন।")
                  : t("Nothing matches these filters within this radius.", "এই দূরত্বে এমন কিছু পাওয়া যায়নি।")}
              </li>
            )}
            {filtered.slice(0, limit).map((p) => {
              const info = SERVICE_INFO[p.kind]
              const isSel = `svc:${p.id}` === selectedId
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setSelectedId(isSel ? null : `svc:${p.id}`)}
                    aria-expanded={isSel}
                    className={cn("flex w-full items-center gap-3 rounded-xl p-3 text-left transition", isSel ? "bg-muted" : "hover:bg-muted/50")}
                  >
                    <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-lg px-1 font-mono text-[11px] font-bold" style={{ background: info.color, color: info.ink }} aria-hidden>
                      {info.glyph}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm font-medium", bangla && p.nameBn && "font-bangla")}>{(bangla && p.nameBn) || p.name}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span className={cn(bangla && "font-bangla")}>{bangla ? info.labelBn : info.label}</span>
                        {p.emergency && <span className="text-status-critical">{t("Emergency dept.", "জরুরি বিভাগ")}</span>}
                        <OpenBadge open={p.openNow} bangla={bangla} />
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{formatDistance(p.distanceKm)}</span>
                  </button>
                  {isSel && <PlaceDetail p={p} bangla={bangla} />}
                </li>
              )
            })}
            {filtered.length > limit && (
              <li className="p-3">
                <button onClick={() => setLimit((l) => l + PAGE)} className="w-full rounded-xl border border-border py-2.5 text-sm transition hover:bg-muted">
                  {t(`Show more (${filtered.length - limit} left)`, `আরও দেখুন (${toBnDigits(filtered.length - limit)}টি বাকি)`)}
                </button>
              </li>
            )}
          </ul>
        </div>

        <div className="relative order-1 h-80 overflow-hidden rounded-3xl border border-border sm:h-96 lg:order-2 lg:sticky lg:top-24 lg:h-[75vh]">
          <LiveMap
            center={point}
            zoom={radius === 1 ? 14.5 : radius === 3 ? 13.2 : 12.4}
            user={geo.coords ? { coords: geo.coords, accuracy: geo.accuracy } : null}
            signals={[]}
            services={onMap}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            recenterKey={recenter + radius}
          />
          {selected && (
            <div className="glass absolute inset-x-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm sm:right-auto sm:max-w-sm">
              <span className={cn("min-w-0 flex-1 truncate", bangla && selected.nameBn && "font-bangla")}>{(bangla && selected.nameBn) || selected.name}</span>
              <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground" aria-label="Clear selection"><X className="size-4" /></button>
            </div>
          )}
          <button
            onClick={() => setRecenter((r) => r + 1)}
            className="glass absolute bottom-3 left-3 z-10 inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs"
          >
            <LocateFixed className="size-3.5" /> {t("Re-centre", "মাঝে আনুন")}
          </button>
          {filtered.length > MAP_LIMIT && (
            <p className="glass absolute bottom-3 right-14 z-10 rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground">
              {t(`Map shows the nearest ${MAP_LIMIT}`, `ম্যাপে নিকটতম ${toBnDigits(MAP_LIMIT)}টি`)}
            </p>
          )}
        </div>
      </div>

      {data?.ok && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("Updated", "হালনাগাদ")} {now ? timeAgoIso(data.generatedAt, now) : ""}
          {data.stale && t(" · OpenStreetMap is busy, showing the last saved copy", " · ওপেনস্ট্রিটম্যাপ ব্যস্ত, সর্বশেষ সংরক্ষিত তথ্য দেখানো হচ্ছে")}
          {data.truncated && t(" · very dense area — some places may be missing", " · ঘনবসতিপূর্ণ এলাকা — কিছু স্থান বাদ পড়তে পারে")}
        </p>
      )}

      {/* ── Hotlines + coverage ── */}
      <section className="mt-16 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-border p-6 sm:p-8" aria-labelledby="hot-h">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">{t("Hotlines", "হটলাইন")}</p>
          <h2 id="hot-h" className={cn("mt-3 text-xl font-semibold", bangla ? "font-bangla" : "font-display")}>{t("National numbers worth saving", "যে নম্বরগুলো সেভ করে রাখা জরুরি")}</h2>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {HOTLINES.map((h) => (
              <li key={h.number}>
                <a href={telHref(h.number)} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:bg-muted">
                  <span className="w-16 shrink-0 font-mono text-lg font-semibold text-teal">{bangla ? toBnDigits(h.number) : h.number}</span>
                  <span className="min-w-0">
                    <span className={cn("block text-sm font-medium", bangla && "font-bangla")}>{bangla ? h.labelBn : h.label}</span>
                    <span className="block text-xs text-muted-foreground">{h.note}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Government-published short codes. Calls from mobile phones in Bangladesh.</p>
        </div>

        <div className="rounded-3xl border border-border p-6 sm:p-8" aria-labelledby="cov-h">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">{t("Coverage", "তথ্যের পরিধি")}</p>
          <h2 id="cov-h" className={cn("mt-3 text-xl font-semibold", bangla ? "font-bangla" : "font-display")}>{t("How complete is this map?", "এই ম্যাপ কতটা সম্পূর্ণ?")}</h2>
          {data?.ok ? (
            <>
              <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
                {[
                  [t("places", "স্থান"), data.coverage.total],
                  [t("with phone", "ফোনসহ"), data.coverage.withPhone],
                  [t("with hours", "সময়সূচিসহ"), data.coverage.withHours],
                ].map(([label, v]) => (
                  <div key={String(label)} className="rounded-2xl bg-surface px-2 py-4">
                    <dd className="font-display text-2xl font-semibold">{bangla ? toBnDigits(Number(v)) : Number(v).toLocaleString()}</dd>
                    <dt className={cn("mt-1 text-[11px] text-muted-foreground", bangla && "font-bangla")}>{label}</dt>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-sm text-muted-foreground">
                {data.coverage.total > 0
                  ? t(
                      `Only ${Math.round((data.coverage.withPhone / data.coverage.total) * 100)}% of places here list a phone number and ${Math.round((data.coverage.withHours / data.coverage.total) * 100)}% list opening hours. Call ahead before you travel.`,
                      `এখানকার মাত্র ${toBnDigits(Math.round((data.coverage.withPhone / data.coverage.total) * 100))}% স্থানে ফোন নম্বর ও ${toBnDigits(Math.round((data.coverage.withHours / data.coverage.total) * 100))}% স্থানে খোলার সময় আছে। যাওয়ার আগে ফোন করে নিন।`,
                    )
                  : t("Nothing is mapped within this radius yet.", "এই দূরত্বে এখনো কিছু ম্যাপ করা হয়নি।")}
              </p>
              <a
                href={`https://www.openstreetmap.org/#map=16/${point.lat.toFixed(4)}/${point.lng.toFixed(4)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm text-teal hover:underline"
              >
                {t("Add or fix a place on OpenStreetMap", "ওপেনস্ট্রিটম্যাপে স্থান যোগ বা সংশোধন করুন")} <ExternalLink className="size-3.5" />
              </a>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t("Waiting for OpenStreetMap…", "ওপেনস্ট্রিটম্যাপের অপেক্ষায়…")}</p>
          )}
          <p className="mt-6 text-[11px] text-muted-foreground">Data © OpenStreetMap contributors, ODbL. Map © OpenFreeMap.</p>
        </div>
      </section>
    </div>
  )
}

function PlaceDetail({ p, bangla }: { p: Place; bangla: boolean }) {
  const t = (en: string, bn: string) => (bangla ? bn : en)
  return (
    <div className="mx-3 mb-3 mt-1 space-y-3 rounded-xl border border-border p-4 text-sm">
      {p.address && <p className="flex gap-2 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" /> {p.address}</p>}
      {p.openingHours && (
        <p className="flex gap-2 text-muted-foreground">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <span className="font-mono text-xs leading-5">{p.openingHours}</span>
        </p>
      )}
      {p.speciality && <p className="text-xs text-muted-foreground">{t("Speciality", "বিশেষত্ব")}: {p.speciality}</p>}
      {p.operator && <p className="text-xs text-muted-foreground">{t("Operator", "পরিচালনায়")}: {p.operator}</p>}
      {p.wheelchair && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Accessibility className="size-4" /> {p.wheelchair === "yes" ? t("Wheelchair accessible", "হুইলচেয়ার উপযোগী") : p.wheelchair === "limited" ? t("Limited wheelchair access", "সীমিত হুইলচেয়ার সুবিধা") : t("Not wheelchair accessible", "হুইলচেয়ার উপযোগী নয়")}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {p.phone ? (
          <a href={telHref(p.phone)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-110">
            <Phone className="size-4" /> {p.phone}
          </a>
        ) : (
          <span className="inline-flex h-9 items-center text-xs text-muted-foreground">{t("No phone number mapped", "ফোন নম্বর ম্যাপে নেই")}</span>
        )}
        <a href={directionsHref(p)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm transition hover:bg-muted">
          <Navigation className="size-4" /> {t("Directions", "দিকনির্দেশনা")}
        </a>
        {p.website && (
          <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm transition hover:bg-muted">
            <Globe className="size-4" /> {t("Website", "ওয়েবসাইট")}
          </a>
        )}
        <a href={osmHref(p)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground">
          OSM <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  )
}
