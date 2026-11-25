"use client"

import { useId, useState } from "react"
import type { DayPoint } from "@/lib/insights/types"

const W = 320
const H = 120
const PAD = { t: 10, r: 6, b: 18, l: 6 }

const fmtDay = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })

/**
 * Single-series daily chart. Past days solid, forecast days lighter with a dashed line,
 * a "today" rule between them, crosshair + readout on hover, and a data table for screen readers.
 */
export function TrendChart({
  points, unit, kind = "line", label,
}: { points: DayPoint[]; unit: string; kind?: "line" | "bar"; label: string }) {
  const id = useId()
  const [hover, setHover] = useState<number | null>(null)
  const vals = points.map((p) => p.value).filter((v): v is number => v != null)
  if (vals.length < 2) return <p className="py-10 text-center text-sm text-muted-foreground">Not enough data yet.</p>

  const min = kind === "bar" ? 0 : Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const lo = kind === "bar" ? 0 : min - span * 0.1
  const hi = max + span * 0.1
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const step = iw / points.length
  const x = (i: number) => PAD.l + step * i + step / 2
  const y = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo)) * ih
  const todayIdx = points.findIndex((p) => p.forecast)

  const path = (from: number, to: number) =>
    points
      .slice(from, to)
      .map((p, k) => (p.value == null ? null : `${x(from + k).toFixed(1)},${y(p.value).toFixed(1)}`))
      .filter(Boolean)
      .join(" L")

  const active = hover ?? (todayIdx >= 0 ? todayIdx : points.length - 1)
  const ap = points[active]

  return (
    <figure>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">
          {fmtDay(ap.date)} · {ap.forecast ? (active === todayIdx ? "today (forecast)" : "forecast") : "observed"}
        </span>
        <span className="font-mono text-sm text-foreground">
          {ap.value == null ? "—" : ap.value.toLocaleString()} <span className="text-muted-foreground">{unit}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-labelledby={`${id}-t`}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const i = Math.floor((((e.clientX - r.left) / r.width) * W - PAD.l) / step)
          setHover(Math.max(0, Math.min(points.length - 1, i)))
        }}
      >
        <title id={`${id}-t`}>{label}</title>
        {/* recessive baseline + mid grid */}
        <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + ih} y2={PAD.t + ih} className="stroke-border" strokeWidth={1} />
        <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + ih / 2} y2={PAD.t + ih / 2} className="stroke-border" strokeWidth={1} strokeDasharray="2 4" />
        {todayIdx > 0 && (
          <>
            <rect x={x(todayIdx) - step / 2} y={PAD.t} width={W - PAD.r - (x(todayIdx) - step / 2)} height={ih} className="fill-muted/40" />
            <text x={x(todayIdx) - step / 2 + 4} y={PAD.t + 9} className="fill-muted-foreground font-mono text-[8px]">FORECAST</text>
          </>
        )}

        {kind === "bar"
          ? points.map((p, i) => {
              if (p.value == null) return null
              const bw = Math.max(2, step - 2)
              const top = y(p.value)
              const h = Math.max(p.value > 0 ? 1.5 : 0, PAD.t + ih - top)
              return (
                <rect
                  key={p.date}
                  x={x(i) - bw / 2}
                  y={PAD.t + ih - h}
                  width={bw}
                  height={h}
                  rx={Math.min(3, bw / 2)}
                  className="fill-teal"
                  opacity={p.forecast ? 0.45 : i === active ? 1 : 0.85}
                />
              )
            })
          : (
              <>
                {todayIdx !== 0 && (
                  <path d={`M${path(0, todayIdx < 0 ? points.length : todayIdx + 1)}`} fill="none" className="stroke-teal" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                )}
                {todayIdx >= 0 && (
                  <path d={`M${path(todayIdx, points.length)}`} fill="none" className="stroke-teal" strokeWidth={2} strokeDasharray="4 3" strokeLinecap="round" opacity={0.75} />
                )}
              </>
            )}

        {/* crosshair + marker */}
        <line x1={x(active)} x2={x(active)} y1={PAD.t} y2={PAD.t + ih} className="stroke-foreground/30" strokeWidth={1} />
        {kind === "line" && ap.value != null && (
          <circle cx={x(active)} cy={y(ap.value)} r={4} className="fill-teal stroke-background" strokeWidth={2} />
        )}

        <text x={PAD.l} y={H - 4} className="fill-muted-foreground font-mono text-[8px]">{fmtDay(points[0].date)}</text>
        <text x={W - PAD.r} y={H - 4} textAnchor="end" className="fill-muted-foreground font-mono text-[8px]">{fmtDay(points[points.length - 1].date)}</text>
      </svg>
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none hover:text-foreground">Show data</summary>
        <table className="mt-2 w-full font-mono">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr className="text-left"><th className="py-1 font-normal">Date</th><th className="py-1 text-right font-normal">{unit}</th><th className="py-1 text-right font-normal">Type</th></tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date} className="border-t border-border">
                <td className="py-1">{fmtDay(p.date)}</td>
                <td className="py-1 text-right text-foreground">{p.value ?? "—"}</td>
                <td className="py-1 text-right">{p.forecast ? "forecast" : "observed"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

/** 24 hourly bars, newest on the right. */
export function HourlyBars({ hourly }: { hourly: number[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const series = [...hourly].reverse() // index 0 = 23–24 h ago … 23 = last hour
  const max = Math.max(1, ...series)
  const w = 240
  const h = 56
  const step = w / 24
  const active = hover ?? 23
  const hAgo = 23 - active
  return (
    <figure>
      <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
        <span>{hAgo === 0 ? "Last hour" : `${hAgo}–${hAgo + 1} h ago`}</span>
        <span className="font-mono text-foreground">{series[active]} headline{series[active] === 1 ? "" : "s"}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h + 12}`} className="w-full touch-none" role="img" aria-label="Incident headlines per hour, last 24 hours"
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setHover(Math.max(0, Math.min(23, Math.floor(((e.clientX - r.left) / r.width) * 24))))
        }}
      >
        <line x1={0} x2={w} y1={h} y2={h} className="stroke-border" />
        {series.map((v, i) => {
          const bh = v === 0 ? 0 : Math.max(2, (v / max) * (h - 4))
          return <rect key={i} x={i * step + 1} y={h - bh} width={step - 2} height={bh} rx={2} className="fill-intel" opacity={i === active ? 1 : 0.7} />
        })}
        <text x={0} y={h + 10} className="fill-muted-foreground font-mono text-[7px]">24 h ago</text>
        <text x={w} y={h + 10} textAnchor="end" className="fill-muted-foreground font-mono text-[7px]">now</text>
      </svg>
    </figure>
  )
}
