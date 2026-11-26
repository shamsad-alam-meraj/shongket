"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bot, CloudRain, Droplets, Factory, Flame,
  Info, Loader2, LocateFixed, MapPin, Megaphone, RefreshCw, Sparkles, Thermometer, Waves, Wind,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DHAKA, timeAgoIso, toBnDigits } from "@/lib/live/types"
import { useGeolocation } from "@/hooks/use-geolocation"
import { useNow } from "@/hooks/use-live-data"
import { LEVEL_META, type InsightsResponse, type Risk, type RiskKey, type Trend } from "@/lib/insights/types"
import { HourlyBars, TrendChart } from "./trend-chart"

const RISK_ICON: Record<RiskKey, typeof Wind> = {
  air: Factory, heat: Thermometer, rain: CloudRain, river: Waves, seismic: Activity, civic: Megaphone,
}
const TREND_ICON: Record<Trend["key"], typeof Wind> = { aqi: Wind, feels: Flame, rain: Droplets, river: Waves }

function useInsights(point: { lat: number; lng: number }) {
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const key = `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`

  const load = useCallback(async () => {
    const [lat, lng] = key.split(",")
    setLoading(true)
    try {
      const r = await fetch(`/api/insights?lat=${lat}&lng=${lng}`, { cache: "no-store" })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData((await r.json()) as InsightsResponse)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    const first = setTimeout(load, 0)
    const t = setInterval(load, 10 * 60_000)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [load])

  return { data, error, loading, reload: load }
}

function LevelPill({ level, className }: { level: Risk["level"]; className?: string }) {
  if (!level) return <span className={cn("rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground", className)}>No data</span>
  const m = LEVEL_META[level]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-foreground", className)}>
      <span className="size-1.5 rounded-full" style={{ background: m.color }} aria-hidden />
      {m.label}
    </span>
  )
}

function ScoreBar({ score, level }: { score: number | null; level: Risk["level"] }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score ?? 0} aria-label="Risk score">
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${score ?? 0}%`, background: level ? LEVEL_META[level].color : "transparent" }} />
    </div>
  )
}

function ChangeBadge({ change }: { change: Trend["change"] }) {
  if (change.direction == null) return null
  const Icon = change.direction === "up" ? ArrowUpRight : change.direction === "down" ? ArrowDownRight : ArrowRight
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground" title="Next days vs the past week">
      <Icon className="size-3.5" />
      {change.direction === "flat" ? "steady" : `${change.pct! > 0 ? "+" : ""}${change.pct}%`}
    </span>
  )
}

export function InsightsDashboard() {
  const geo = useGeolocation(false)
  const point = geo.coords ?? DHAKA
  const { data, error, loading, reload } = useInsights(point)
  const now = useNow()
  const [bangla, setBangla] = useState(false)

  const usingDefault = !geo.coords
  const b = data?.briefing

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">SHONGKET Insights</p>
          <h1 className="mt-4 font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Trends, risk and impact — <span className="font-serif font-normal italic text-teal">for where you are.</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Seven days back, the days ahead, and what it means for getting around, breathing easy and staying safe.
            Every number traces back to an open data source.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setBangla((v) => !v)}
            className="h-9 rounded-full border border-border px-3.5 text-sm transition-colors hover:bg-muted"
            aria-pressed={bangla}
          >
            {bangla ? "English" : "বাংলা"}
          </button>
          <button
            onClick={reload}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm transition-colors hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Location strip ── */}
      <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
        <MapPin className="size-4 text-teal" />
        <span className="font-medium">{data ? (bangla && data.location.placeBn ? data.location.placeBn : data.location.place) : "Locating…"}</span>
        {usingDefault && <span className="text-muted-foreground">Showing Dhaka by default.</span>}
        {usingDefault && geo.status !== "denied" && geo.status !== "unsupported" && (
          <button onClick={geo.request} className="inline-flex items-center gap-1.5 text-teal hover:underline">
            <LocateFixed className="size-4" /> Use my location
          </button>
        )}
        {geo.status === "denied" && <span className="text-muted-foreground">Location permission is off — allow it in your browser to see your area.</span>}
        <span className="ml-auto font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {data && now ? `Updated ${timeAgoIso(data.generatedAt, now)}` : loading ? "Analysing…" : ""}
        </span>
      </div>

      {error && !data && (
        <div className="mt-8 rounded-2xl border border-border p-6 text-sm">
          Couldn&apos;t load insights ({error}).{" "}
          <button onClick={reload} className="text-teal hover:underline">Try again</button>
        </div>
      )}

      {!data && !error && (
        <div className="mt-8 grid gap-4 md:grid-cols-3" aria-busy>
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-44 animate-pulse rounded-3xl bg-surface" />)}
        </div>
      )}

      {data && b && (
        <>
          {/* ── Briefing + overall ── */}
          <section className="mt-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]" aria-labelledby="brief-h">
            <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/12 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-teal">
                  {b.mode === "ai" ? <Sparkles className="size-3" /> : <Bot className="size-3" />}
                  {b.mode === "ai" ? "AI briefing" : "Rule-based briefing"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {b.mode === "ai" ? "Written by Claude from the numbers below — nothing else." : "Generated from the scores below."}
                </span>
              </div>
              <h2 id="brief-h" className={cn("mt-5 text-2xl font-semibold leading-tight", bangla ? "font-bangla" : "font-display")}>
                {bangla ? b.headlineBn : b.headline}
              </h2>
              <p className={cn("mt-3 text-muted-foreground", bangla && "font-bangla text-base")}>{bangla ? b.summaryBn : b.summary}</p>
              {b.actions.length > 0 && (
                <ul className="mt-6 space-y-2.5">
                  {b.actions.map((a, i) => (
                    <li key={i} className={cn("flex gap-3 text-sm", bangla && "font-bangla text-base")}>
                      <span className="mt-0.5 font-mono text-xs text-teal">{bangla ? toBnDigits(i + 1) : i + 1}</span>
                      {bangla ? a.bn : a.en}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col justify-between rounded-3xl border border-border p-6 sm:p-8">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Overall outlook · next 3 days</p>
                <div className="mt-4 flex items-end gap-3">
                  <span className="font-display text-6xl font-semibold leading-none tracking-tight">
                    {bangla ? toBnDigits(data.overall.score) : data.overall.score}
                  </span>
                  <span className="pb-1.5 font-mono text-sm text-muted-foreground">/ 100</span>
                </div>
                <LevelPill level={data.overall.level} className="mt-4" />
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Led by the highest risk area, nudged up when a second area is also raised. A guide, not a warning —
                official alerts from BMD, FFWC and DDM always come first.
              </p>
            </div>
          </section>

          {/* ── Risk grid ── */}
          <section className="mt-16" aria-labelledby="risk-h">
            <SectionHead id="risk-h" kicker="Risk" title="Six areas, scored 0–100" sub="Each score is a published rule over open data. Tap a card to see why." />
            <div className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {data.risks.map((r) => {
                const Icon = RISK_ICON[r.key]
                return (
                  <details key={r.key} className="group bg-background p-6 transition-colors open:bg-surface hover:bg-surface">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-start justify-between">
                        <Icon className="size-5 text-muted-foreground" />
                        <LevelPill level={r.level} />
                      </div>
                      <h3 className="mt-5 font-display text-lg font-semibold">{bangla ? <span className="font-bangla">{r.labelBn}</span> : r.label}</h3>
                      <div className="mt-3 flex items-center gap-3">
                        <ScoreBar score={r.score} level={r.level} />
                        <span className="w-8 text-right font-mono text-sm">{r.score ?? "—"}</span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{r.reading}</p>
                    </summary>
                    {r.drivers.length > 0 && (
                      <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
                        {r.drivers.map((d, i) => <li key={i} className="flex gap-2"><Info className="mt-0.5 size-3 shrink-0" />{d}</li>)}
                      </ul>
                    )}
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{r.source}</p>
                  </details>
                )
              })}
            </div>
          </section>

          {/* ── Trends ── */}
          <section className="mt-16" aria-labelledby="trend-h">
            <SectionHead id="trend-h" kicker="Trends" title="Last week, and the days ahead" sub="Solid = observed or modelled past. Shaded and dashed = forecast. Hover for daily values." />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {data.trends.map((t) => {
                const Icon = TREND_ICON[t.key]
                return (
                  <div key={t.key} className="rounded-3xl border border-border p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Icon className="size-4 text-teal" />
                        <h3 className="text-sm font-medium">{bangla ? <span className="font-bangla text-base">{t.labelBn}</span> : t.label}</h3>
                      </div>
                      <ChangeBadge change={t.change} />
                    </div>
                    <TrendChart points={t.points} unit={t.unit} kind={t.key === "rain" ? "bar" : "line"} label={t.label} />
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{t.source}</p>
                  </div>
                )
              })}
              {data.trends.length === 0 && <p className="text-sm text-muted-foreground">Trend sources are unavailable right now.</p>}
            </div>
          </section>

          {/* ── Incident pulse + impact ── */}
          <section className="mt-16 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-border p-6 sm:p-8" aria-labelledby="pulse-h">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">Pulse · 24 h</p>
              <h2 id="pulse-h" className="mt-3 font-display text-xl font-semibold">Street incidents nearby</h2>
              {!data.pulse.ok ? (
                <p className="mt-4 text-sm text-muted-foreground">The news source is unavailable right now.</p>
              ) : data.pulse.total === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No fires, hartals, blockades, rallies or jams have been reported within 60 km in the last 24 hours.
                </p>
              ) : (
                <>
                  <div className="mt-6"><HourlyBars hourly={data.pulse.hourly} /></div>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">By type</p>
                      <ul className="mt-3 space-y-2 text-sm">
                        {data.pulse.byType.map((t) => (
                          <li key={t.key} className="flex justify-between gap-3">
                            <span className={cn(bangla && "font-bangla")}>{bangla ? t.labelBn : t.label}</span>
                            <span className="font-mono text-muted-foreground" title={`${t.clusters} clusters from ${t.outlets} outlet reports`}>
                              {t.clusters} · {t.outlets} src
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Most mentioned areas</p>
                      <ul className="mt-3 space-y-2 text-sm">
                        {data.pulse.byArea.map((a) => (
                          <li key={a.name} className="flex justify-between gap-3">
                            <span className={cn(bangla && "font-bangla")}>{bangla ? a.nameBn : a.name}</span>
                            <span className="font-mono text-muted-foreground">{a.clusters}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}
              <p className="mt-6 text-xs text-muted-foreground">
                {data.pulse.unverified > 0 &&
                  `${data.pulse.unverified} of these ${data.pulse.unverified === 1 ? "is" : "are"} unverified (one outlet) and ${data.pulse.unverified === 1 ? "does" : "do"} not count toward any score. `}
                {data.pulse.communityReports} community report{data.pulse.communityReports === 1 ? "" : "s"} within 25 km.{" "}
                <Link href="/live" className="text-teal hover:underline">See them on the Live map →</Link>
              </p>
            </div>

            <div className="rounded-3xl border border-border p-6 sm:p-8" aria-labelledby="impact-h">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">Impact</p>
              <h2 id="impact-h" className="mt-3 font-display text-xl font-semibold">What it means for you</h2>
              {data.impacts.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Nothing in the outlook should change your plans.</p>
              ) : (
                <ul className="mt-6 divide-y divide-border">
                  {data.impacts.map((i) => (
                    <li key={i.area} className="py-4 first:pt-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn("font-medium", bangla && "font-bangla")}>{bangla ? i.labelBn : i.label}</span>
                        <LevelPill level={i.level} />
                      </div>
                      <p className={cn("mt-1.5 text-sm text-muted-foreground", bangla && "font-bangla text-base")}>{bangla ? i.textBn : i.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ── Sources ── */}
          <section className="mt-16" aria-labelledby="src-h">
            <SectionHead id="src-h" kicker="Method" title="Sources behind this page" sub="If a source is down, its card says so — we never fill the gap with guesses." />
            <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {data.sources.map((s) => (
                <li key={s.name} className="flex items-start gap-2.5 rounded-2xl border border-border px-4 py-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: s.ok ? "var(--color-status-normal)" : "var(--color-status-unknown)" }} aria-hidden />
                  <span>
                    {s.name}
                    <span className="block text-xs text-muted-foreground">{s.ok ? "Connected" : s.error ?? "Unavailable"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {loading && data && (
        <div className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm shadow-lg">
          <Loader2 className="size-4 animate-spin" /> Updating…
        </div>
      )}
    </div>
  )
}

function SectionHead({ id, kicker, title, sub }: { id: string; kicker: string; title: string; sub: string }) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">{kicker}</p>
      <h2 id={id} className="mt-3 font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
    </div>
  )
}
