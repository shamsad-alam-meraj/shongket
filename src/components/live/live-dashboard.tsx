"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle, BellOff, BellRing, Check, ChevronLeft, Crosshair, ExternalLink, Flag,
  Loader2, LocateFixed, MapPin, Megaphone, RefreshCw, Search, X,
} from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { ReportDialog } from "./report-dialog"
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"
import { STATUS_META, VERIFICATION_META, type SignalStatus } from "@/lib/signals"
import {
  CATEGORY_INFO, DHAKA, SERVICE_INFO, formatDistance, haversineKm, timeAgoIso, toBnDigits,
  type LiveCategory, type LiveService, type LiveSignal,
} from "@/lib/live/types"
import { useGeolocation } from "@/hooks/use-geolocation"
import { useLiveSignals, useNow, useServices } from "@/hooks/use-live-data"

const LiveMap = dynamic(() => import("./live-map").then((m) => m.LiveMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-surface" />,
})

const STATUS_ORDER: SignalStatus[] = ["critical", "significant", "minor", "normal", "unknown"]

const GROUPS: { key: string; label: string; labelBn: string; cats: LiveCategory[] | null }[] = [
  { key: "all", label: "All", labelBn: "সব", cats: null },
  { key: "incidents", label: "Incidents", labelBn: "ঘটনা", cats: ["news", "traffic", "community"] },
  { key: "environment", label: "Environment", labelBn: "পরিবেশ", cats: ["weather", "rain", "heat", "wind", "air", "river"] },
  { key: "hazards", label: "Hazards", labelBn: "দুর্যোগ", cats: ["earthquake", "cyclone", "flood", "wildfire", "volcano", "hazard"] },
]

const ALERT_KEY = "shongket-alert-area"
const SEEN_KEY = "shongket-alert-seen"
const VOTES_KEY = "shongket-votes"

const readLS = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
const writeLS = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}

export function LiveDashboard() {
  const root = useRef<HTMLDivElement>(null)
  const geo = useGeolocation(true) // asks the browser for permission on load
  const anchor = geo.coords ?? DHAKA
  const { data, error, loading, reload } = useLiveSignals(anchor)
  const [tab, setTab] = useState<"signals" | "services" | "sources">("signals")
  const services = useServices(anchor, tab === "services")
  const now = useNow()

  const [bangla, setBangla] = useState(false)
  const [query, setQuery] = useState("")
  const [group, setGroup] = useState("all")
  const [statuses, setStatuses] = useState<Set<SignalStatus>>(new Set(STATUS_ORDER))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [recenter, setRecenter] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)
  const [votes, setVotes] = useState<Record<string, "confirm" | "dispute">>({})
  const [alertArea, setAlertArea] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    // Restore per-browser preferences after hydration
    const t = setTimeout(() => {
      setVotes(readLS(VOTES_KEY, {}))
      setAlertArea(readLS(ALERT_KEY, null))
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const signals = useMemo(() => data?.signals ?? [], [data])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cats = GROUPS.find((g) => g.key === group)?.cats
    return signals.filter(
      (s) =>
        statuses.has(s.status) &&
        (!cats || cats.includes(s.category)) &&
        (!q ||
          [s.title, s.titleBn, s.summary, s.source, CATEGORY_INFO[s.category].label].some((t) =>
            t.toLowerCase().includes(q),
          )),
    )
  }, [signals, query, group, statuses])

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<SignalStatus, number>
    signals.forEach((s) => c[s.status]++)
    return c
  }, [signals])

  const nearbyActive = useMemo(
    () => signals.filter((s) => s.distanceKm <= 25 && s.verification !== "expired" && (s.status === "significant" || s.status === "critical")),
    [signals],
  )

  const selectedSignal = signals.find((s) => s.id === selectedId) ?? null
  const selectedService = services.data?.services.find((s) => `svc:${s.id}` === selectedId) ?? null

  // ── Browser notifications for a watched area ──
  useEffect(() => {
    if (!alertArea || !data || typeof Notification === "undefined" || Notification.permission !== "granted") return
    const seen = new Set<string>(readLS<string[]>(SEEN_KEY, []))
    const firstRun = seen.size === 0
    for (const s of data.signals) {
      if (seen.has(s.id)) continue
      seen.add(s.id)
      if (firstRun) continue
      if (s.verification === "expired" || (s.status !== "significant" && s.status !== "critical")) continue
      if (haversineKm(alertArea, s) > 5) continue
      new Notification(`SHONGKET · ${STATUS_META[s.status].label}`, { body: s.title, tag: s.id, icon: "/icon.svg" })
    }
    writeLS(SEEN_KEY, [...seen].slice(-500))
  }, [data, alertArea])

  const toggleAlerts = async () => {
    if (alertArea) {
      setAlertArea(null)
      writeLS(ALERT_KEY, null)
      return
    }
    if (typeof Notification === "undefined") return
    const perm = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission
    if (perm !== "granted") return
    const area = { lat: anchor.lat, lng: anchor.lng }
    setAlertArea(area)
    writeLS(ALERT_KEY, area)
    writeLS(SEEN_KEY, (data?.signals ?? []).map((s) => s.id))
  }

  const vote = useCallback(
    async (s: LiveSignal, v: "confirm" | "dispute") => {
      const prev = votes[s.id]
      const next = { ...votes }
      const calls: { vote: "confirm" | "dispute"; delta: 1 | -1 }[] = []
      if (prev) calls.push({ vote: prev, delta: -1 })
      if (prev !== v) {
        calls.push({ vote: v, delta: 1 })
        next[s.id] = v
      } else delete next[s.id]
      setVotes(next)
      writeLS(VOTES_KEY, next)
      for (const c of calls) {
        await fetch("/api/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, ...c }) })
      }
      reload()
    },
    [votes, reload],
  )

  const toggleStatus = (s: SignalStatus) => {
    const n = new Set(statuses)
    if (n.has(s)) n.delete(s)
    else n.add(s)
    setStatuses(n)
  }

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(".dash-in", { y: 14, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.7, ease: "expo.out" })
    },
    { scope: root },
  )

  const place = data ? (bangla ? data.location.placeBn || data.location.place : data.location.place) : null
  const t = (en: string, bn: string) => (bangla ? bn : en)

  return (
    <div ref={root} className="flex h-[100svh] flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <header className="dash-in z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:gap-3 sm:px-4">
        <Link href="/" className="text-muted-foreground hover:text-foreground" aria-label="Back to home">
          <ChevronLeft className="size-4" />
        </Link>
        <Link href="/" className="hidden sm:block">
          <Logo showBangla={false} />
        </Link>
        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <span className="relative flex size-2">
            <span className="signal-ping absolute inset-0 rounded-full bg-teal" />
            <span className="relative size-2 rounded-full bg-teal" />
          </span>
          <span className={cn("truncate text-sm", bangla && "font-bangla")}>{place ?? t("Locating…", "অবস্থান খোঁজা হচ্ছে…")}</span>
          {data && (
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">· {timeAgoIso(data.generatedAt, now)}</span>
          )}
        </div>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search signals", "সংকেত খুঁজুন")}
            aria-label="Search signals"
            className={cn("h-9 w-full rounded-full border border-border bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-intel", bangla && "font-bangla")}
          />
        </div>
        <button
          onClick={() => setReportOpen(true)}
          className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 sm:inline-flex"
        >
          <Megaphone className="size-4" /> {t("Report", "রিপোর্ট")}
        </button>
        <div className="flex shrink-0 items-center rounded-full border border-border p-0.5 text-xs">
          <button onClick={() => setBangla(false)} aria-pressed={!bangla} className={cn("rounded-full px-2.5 py-1", !bangla && "bg-muted")}>EN</button>
          <button onClick={() => setBangla(true)} aria-pressed={bangla} className={cn("rounded-full px-2.5 py-1 font-bangla", bangla && "bg-muted")}>বাং</button>
        </div>
        <ThemeToggle />
      </header>

      {/* ── Location banner ── */}
      {geo.status !== "granted" && (
        <div className="dash-in z-20 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-intel/10 px-4 py-2 text-sm">
          <MapPin className="size-4 shrink-0 text-intel" />
          <span className={cn("flex-1", bangla && "font-bangla")}>
            {geo.status === "prompting" || geo.status === "idle"
              ? t("Allow location access in your browser to see signals around you.", "আপনার আশেপাশের সংকেত দেখতে ব্রাউজারে লোকেশন অনুমতি দিন।")
              : geo.status === "denied"
                ? t("Location access is blocked — showing Dhaka. Enable it from the lock icon in the address bar, then retry.", "লোকেশন অনুমতি বন্ধ — ঢাকা দেখানো হচ্ছে। অ্যাড্রেস বারের লক আইকন থেকে অনুমতি দিয়ে আবার চেষ্টা করুন।")
                : geo.status === "unsupported"
                  ? t("This browser can’t share location — showing Dhaka.", "এই ব্রাউজার লোকেশন দিতে পারে না — ঢাকা দেখানো হচ্ছে।")
                  : t("Couldn’t get your position — showing Dhaka.", "আপনার অবস্থান পাওয়া যায়নি — ঢাকা দেখানো হচ্ছে।")}
          </span>
          {geo.status !== "unsupported" && (
            <button onClick={geo.request} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-muted">
              <LocateFixed className="size-3.5" /> {t("Use my location", "আমার লোকেশন ব্যবহার করুন")}
            </button>
          )}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ── Side panel ── */}
        <aside className="dash-in order-2 flex max-h-[50svh] min-h-0 flex-col border-t border-border bg-background lg:order-1 lg:max-h-none lg:w-[400px] lg:border-r lg:border-t-0">
          <div className="flex shrink-0 border-b border-border px-2" role="tablist">
            {(
              [
                ["signals", t("Signals", "সংকেত"), signals.length],
                ["services", t("Services", "সেবা"), services.data?.services.length],
                ["sources", t("Sources", "সূত্র"), data?.sources.filter((s) => s.ok).length],
              ] as const
            ).map(([k, label, n]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn(
                  "relative flex-1 py-3 text-sm transition",
                  bangla && "font-bangla",
                  tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                {n != null && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{bangla ? toBnDigits(n) : n}</span>}
                {tab === k && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-teal" />}
              </button>
            ))}
          </div>

          {tab === "signals" && (
            <>
              <div className="shrink-0 space-y-2 border-b border-border p-3">
                {nearbyActive.length > 0 && (
                  <p className={cn("flex items-center gap-2 rounded-lg bg-status-significant/10 px-3 py-2 text-xs text-status-significant", bangla && "font-bangla")}>
                    <AlertTriangle className="size-3.5 shrink-0" />
                    {t(
                      `${nearbyActive.length} active disruption${nearbyActive.length > 1 ? "s" : ""} reported within 25 km.`,
                      `২৫ কিমির মধ্যে ${toBnDigits(nearbyActive.length)}টি সক্রিয় বিঘ্নের খবর।`,
                    )}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {GROUPS.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => setGroup(g.key)}
                      aria-pressed={group === g.key}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs transition",
                        bangla && "font-bangla",
                        group === g.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {bangla ? g.labelBn : g.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_ORDER.map((s) => {
                    const on = statuses.has(s)
                    return (
                      <button
                        key={s}
                        onClick={() => toggleStatus(s)}
                        aria-pressed={on}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                          on ? "border-border bg-surface" : "border-dashed border-border text-muted-foreground opacity-50",
                        )}
                      >
                        <span className="size-2 rounded-full" style={{ background: STATUS_META[s].color }} />
                        <span className={bangla ? "font-bangla" : undefined}>{bangla ? STATUS_META[s].labelBn : STATUS_META[s].label}</span>
                        <span className="tabular font-mono text-[10px] text-muted-foreground">{counts[s]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <ul className="min-h-0 flex-1 overflow-y-auto p-2" aria-live="polite">
                {!data && !error && (
                  <li className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> {t("Gathering live signals…", "লাইভ সংকেত সংগ্রহ করা হচ্ছে…")}
                  </li>
                )}
                {error && !data && (
                  <li className="p-6 text-center text-sm text-muted-foreground">
                    {t("Couldn’t load signals.", "সংকেত লোড করা যায়নি।")}{" "}
                    <button onClick={reload} className="text-intel underline">{t("Retry", "আবার চেষ্টা")}</button>
                  </li>
                )}
                {data && visible.length === 0 && (
                  <li className="p-6 text-center text-sm text-muted-foreground">{t("No signals match these filters.", "এই ফিল্টারে কোনো সংকেত নেই।")}</li>
                )}
                {visible.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        "flex w-full gap-3 rounded-xl p-3 text-left transition",
                        s.id === selectedId ? "bg-muted" : "hover:bg-muted/50",
                        s.verification === "expired" && "opacity-60",
                      )}
                    >
                      <StatusDot s={s} />
                      <div className="min-w-0 flex-1">
                        <p className={cn("line-clamp-2 text-sm font-medium leading-snug", bangla && "font-bangla")}>{bangla ? s.titleBn : s.title}</p>
                        <p className={cn("mt-1 text-xs text-muted-foreground", bangla && "font-bangla")}>
                          {bangla ? CATEGORY_INFO[s.category].labelBn : CATEGORY_INFO[s.category].label}
                          {s.distanceKm > 0.05 && ` · ${s.approximate ? "~" : ""}${formatDistance(s.distanceKm)}`}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {VERIFICATION_META[s.verification].label} · {s.confidence}% · {timeAgoIso(s.updatedAt, now)} · {s.source}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tab === "services" && (
            <ServicesList
              loading={services.loading}
              ok={services.data?.ok ?? true}
              list={services.data?.services ?? []}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRetry={services.reload}
              bangla={bangla}
            />
          )}

          {tab === "sources" && <SourcesPanel data={data} loading={loading} onRefresh={reload} now={now} />}
        </aside>

        {/* ── Map ── */}
        <div className="dash-in relative order-1 min-h-[40svh] flex-1 lg:order-2">
          <LiveMap
            center={anchor}
            user={geo.coords ? { coords: geo.coords, accuracy: geo.accuracy } : null}
            signals={visible}
            services={tab === "services" ? services.data?.services ?? [] : []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            recenterKey={recenter}
          />

          <div className="absolute bottom-10 left-3 flex flex-col gap-2">
            <button
              onClick={() => (geo.coords ? setRecenter((n) => n + 1) : geo.request())}
              className="glass inline-flex size-10 items-center justify-center rounded-full border border-border"
              aria-label={geo.coords ? "Centre on my location" : "Use my location"}
              title={geo.coords ? "Centre on my location" : "Use my location"}
            >
              <Crosshair className={cn("size-4", geo.coords && "text-intel")} />
            </button>
            <button
              onClick={toggleAlerts}
              className={cn("glass inline-flex size-10 items-center justify-center rounded-full border border-border", alertArea && "border-teal text-teal")}
              aria-label={alertArea ? "Turn off alerts for this area" : "Alert me about this area"}
              title={alertArea ? "Alerts on (5 km) — click to turn off" : "Alert me about disruptions within 5 km"}
            >
              {alertArea ? <BellRing className="size-4" /> : <BellOff className="size-4" />}
            </button>
            <button
              onClick={() => setReportOpen(true)}
              className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground sm:hidden"
              aria-label="Report an incident"
            >
              <Megaphone className="size-4" />
            </button>
          </div>

          {loading && data && (
            <span className="glass absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs">
              <Loader2 className="size-3 animate-spin" /> {t("Updating", "হালনাগাদ হচ্ছে")}
            </span>
          )}

          {selectedSignal && (
            <SignalDetail
              s={selectedSignal}
              bangla={bangla}
              now={now}
              myVote={votes[selectedSignal.id]}
              onVote={(v) => vote(selectedSignal, v)}
              onClose={() => setSelectedId(null)}
            />
          )}
          {selectedService && <ServiceDetail s={selectedService} bangla={bangla} onClose={() => setSelectedId(null)} />}
        </div>
      </div>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        coords={geo.coords}
        onRequestLocation={geo.request}
        bangla={bangla}
        onSubmitted={(id) => {
          reload()
          setTab("signals")
          setTimeout(() => setSelectedId(id), 800)
        }}
      />
    </div>
  )
}

function StatusDot({ s }: { s: LiveSignal }) {
  const c = STATUS_META[s.status].color
  const expired = s.verification === "expired"
  return (
    <span
      className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", s.verification === "unverified" && "outline-1 outline-offset-2 outline-dashed")}
      style={{
        background: expired ? "transparent" : c,
        boxShadow: expired ? `inset 0 0 0 2px ${c}` : undefined,
        outlineColor: c,
      }}
    />
  )
}

function SignalDetail({
  s, bangla, now, myVote, onVote, onClose,
}: {
  s: LiveSignal; bangla: boolean; now?: number
  myVote?: "confirm" | "dispute"; onVote: (v: "confirm" | "dispute") => void; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(ref.current!.children, { y: 10, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.03, duration: 0.45, ease: "power3.out" })
      gsap.fromTo(".detail-bar", { scaleX: 0 }, { scaleX: 1, transformOrigin: "left", duration: 0.9, ease: "expo.out" })
    },
    { scope: ref, dependencies: [s.id] },
  )
  const color = STATUS_META[s.status].color
  return (
    <div
      ref={ref}
      className="glass absolute inset-x-3 top-3 z-20 max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl border border-border p-5 shadow-2xl sm:left-auto sm:w-[380px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
          >
            <span className="size-1.5 rounded-full" style={{ background: color }} />
            {bangla ? STATUS_META[s.status].labelBn : STATUS_META[s.status].label}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {s.kind === "forecast" ? "Forecast" : s.kind === "report" ? "Report" : "Observed"}
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close details">
          <X className="size-4" />
        </button>
      </div>
      <h2 className={cn("mt-3 font-display text-lg font-semibold leading-snug", bangla && "font-bangla")}>{bangla ? s.titleBn : s.title}</h2>
      <p className={cn("mt-1 text-xs text-muted-foreground", bangla && "font-bangla")}>
        {bangla ? CATEGORY_INFO[s.category].labelBn : CATEGORY_INFO[s.category].label}
        {s.distanceKm > 0.05 && ` · ${s.approximate ? "≈" : ""}${formatDistance(s.distanceKm)} away`}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.summary}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border p-3 text-center">
        <div>
          <p className="tabular font-mono text-sm">{s.confidence}%</p>
          <p className="text-[10px] text-muted-foreground">Confidence</p>
        </div>
        <div>
          <p className="truncate font-mono text-sm">{s.metric ?? VERIFICATION_META[s.verification].label}</p>
          <p className="text-[10px] text-muted-foreground">{s.metric ? "Reading" : "Status"}</p>
        </div>
        <div>
          <p className="font-mono text-sm">{timeAgoIso(s.updatedAt, now).replace(" ago", "")}</p>
          <p className="text-[10px] text-muted-foreground">Updated</p>
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
        <div className="detail-bar h-full rounded-full bg-teal" style={{ width: `${s.confidence}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{VERIFICATION_META[s.verification].label}</span> · {s.source}
        {s.approximate && " · location approximate"}
      </p>

      {s.evidence && s.evidence.length > 0 && (
        <div className="mt-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Reported by</p>
          <ul className="mt-2 space-y-2">
            {s.evidence.map((e) => (
              <li key={e.url}>
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="group block rounded-lg border border-border p-2.5 transition hover:bg-muted">
                  <p className="line-clamp-2 text-sm leading-snug group-hover:underline">{e.title}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {e.outlet} · {timeAgoIso(e.at, now)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.category === "community" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => onVote("confirm")}
            className={cn("flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm transition hover:bg-muted", myVote === "confirm" && "border-teal text-teal")}
          >
            <Check className="size-4" /> I see this too {s.confirms ? `(${s.confirms})` : ""}
          </button>
          <button
            onClick={() => onVote("dispute")}
            className={cn("flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm transition hover:bg-muted", myVote === "dispute" && "border-status-significant text-status-significant")}
          >
            <Flag className="size-4" /> Not here {s.disputes ? `(${s.disputes})` : ""}
          </button>
        </div>
      ) : (
        s.sourceUrl && (
          <a
            href={s.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm transition hover:bg-muted"
          >
            View source <ExternalLink className="size-3.5" />
          </a>
        )
      )}
    </div>
  )
}

function ServiceDetail({ s, bangla, onClose }: { s: LiveService; bangla: boolean; onClose: () => void }) {
  const info = SERVICE_INFO[s.kind]
  return (
    <div className="glass absolute inset-x-3 top-3 z-20 rounded-2xl border border-border p-5 shadow-2xl sm:left-auto sm:w-[340px]">
      <div className="flex items-start justify-between">
        <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ color: info.color, background: `color-mix(in srgb, ${info.color} 14%, transparent)` }}>
          {bangla ? info.labelBn : info.label}
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <h2 className={cn("mt-3 font-display text-lg font-semibold", bangla && s.nameBn && "font-bangla")}>{(bangla && s.nameBn) || s.name}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatDistance(s.distanceKm)} away{s.emergency ? " · emergency department" : ""}
      </p>
      {s.openingHours && <p className="mt-3 font-mono text-xs text-muted-foreground">Hours: {s.openingHours}</p>}
      <a
        href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=18/${s.lat}/${s.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm transition hover:bg-muted"
      >
        Open in OpenStreetMap <ExternalLink className="size-3.5" />
      </a>
      <p className="mt-3 text-[10px] text-muted-foreground">Data © OpenStreetMap contributors. Call ahead to confirm availability.</p>
    </div>
  )
}

function ServicesList({
  loading, ok, list, selectedId, onSelect, onRetry, bangla,
}: {
  loading: boolean; ok: boolean; list: LiveService[]; selectedId: string | null
  onSelect: (id: string) => void; onRetry: () => void; bangla: boolean
}) {
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto p-2">
      {loading && list.length === 0 && (
        <li className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Finding hospitals, pharmacies & emergency services…
        </li>
      )}
      {!loading && !ok && (
        <li className="p-6 text-center text-sm text-muted-foreground">
          OpenStreetMap service lookup is busy right now.{" "}
          <button onClick={onRetry} className="text-intel underline">Retry</button>
        </li>
      )}
      {!loading && ok && list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No mapped services within 3 km.</li>}
      {list.map((s) => {
        const info = SERVICE_INFO[s.kind]
        return (
          <li key={s.id}>
            <button
              onClick={() => onSelect(`svc:${s.id}`)}
              className={cn("flex w-full items-center gap-3 rounded-xl p-3 text-left transition", `svc:${s.id}` === selectedId ? "bg-muted" : "hover:bg-muted/50")}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: info.color }}>
                {s.kind === "pharmacy" ? "℞" : s.kind === "police" ? "P" : s.kind === "fire_station" ? "F" : "+"}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-medium", bangla && s.nameBn && "font-bangla")}>{(bangla && s.nameBn) || s.name}</p>
                <p className={cn("text-xs text-muted-foreground", bangla && "font-bangla")}>{bangla ? info.labelBn : info.label}</p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{formatDistance(s.distanceKm)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function SourcesPanel({
  data, loading, onRefresh, now,
}: { data: ReturnType<typeof useLiveSignals>["data"]; loading: boolean; onRefresh: () => void; now?: number }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Live feeds {data && `· ${timeAgoIso(data.generatedAt, now)}`}
        </p>
        <button onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1 text-xs text-intel disabled:opacity-50">
          <RefreshCw className={cn("size-3", loading && "animate-spin")} /> Refresh
        </button>
      </div>
      <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
        {data?.sources.map((s) => (
          <li key={s.name} className="flex items-center gap-3 px-3 py-2.5">
            <span className={cn("size-2 shrink-0 rounded-full", s.ok ? "bg-teal" : "bg-status-unknown")} />
            <div className="min-w-0 flex-1">
              <p className="text-sm">{s.name}</p>
              {!s.ok && s.error && <p className="truncate font-mono text-[10px] text-muted-foreground">{s.error}</p>}
            </div>
            <span className="font-mono text-xs text-muted-foreground">{s.ok ? s.count : "—"}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">How verification works.</span> Official feeds (USGS, GDACS, NASA, Open-Meteo)
          are shown as confirmed. News incidents are confirmed when two or more independent outlets report the same type of
          event in the same area within 24 h; a single outlet is shown as unverified. Community reports become confirmed after
          three people nearby confirm them.
        </p>
        <p>
          Status colours describe SHONGKET&apos;s assessment — not an official government warning. News-based locations are
          area-level approximations.
        </p>
        <p>
          Map © OpenFreeMap, OpenMapTiles, OpenStreetMap contributors. Weather & air quality: Open-Meteo (CC BY 4.0). Earthquakes:
          USGS. Disasters: GDACS, NASA EONET. Headlines link to their original publishers.
        </p>
      </div>
    </div>
  )
}
