"use client"

import { STATUS_META, type SignalStatus } from "@/lib/signals"
import { DHAKA, timeAgoIso, type LiveSignal } from "@/lib/live/types"
import { useLiveSignals } from "@/hooks/use-live-data"

// Decorative node layout (percent positions); colours come from live statuses when available.
const NODES = [
  [38, 58], [61, 30], [27, 46], [57, 82], [56, 52], [44, 9], [66, 69],
] as const

/** Radar: concentric rings, a sweep, pulsing nodes, and two live readouts for Dhaka. */
export function RadarVisual() {
  const { data } = useLiveSignals(DHAKA, 300_000)
  const sigs = (data?.signals ?? []).filter((s) => s.verification !== "expired")
  const incident: LiveSignal | undefined = sigs.find((s) => s.category === "news" || s.category === "traffic" || s.category === "community")
  const weather = sigs.find((s) => s.category === "weather")
  const air = sigs.find((s) => s.category === "air")
  const statuses: SignalStatus[] = sigs.slice(0, NODES.length).map((s) => s.status)

  return (
    <div className="relative aspect-square w-full">
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-teal)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--color-teal)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-teal)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--color-teal)" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="196" fill="url(#radar-bg)" />
        {[60, 110, 160, 196].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="var(--color-steel)" strokeOpacity="0.18" strokeDasharray={r === 196 ? "2 6" : undefined} />
        ))}
        <line x1="4" y1="200" x2="396" y2="200" stroke="var(--color-steel)" strokeOpacity="0.12" />
        <line x1="200" y1="4" x2="200" y2="396" stroke="var(--color-steel)" strokeOpacity="0.12" />
        <path d="M30 300 C 110 250, 150 330, 230 280 S 340 220, 380 250" fill="none" stroke="var(--color-intel)" strokeOpacity="0.35" strokeWidth="6" strokeLinecap="round" />
        <path d="M60 90 L 180 170 L 330 120" fill="none" stroke="var(--color-steel)" strokeOpacity="0.22" strokeWidth="2" />
        <path d="M140 380 L 190 230 L 260 60" fill="none" stroke="var(--color-steel)" strokeOpacity="0.22" strokeWidth="2" />
        <g className="radar-sweep" style={{ transformOrigin: "200px 200px" }}>
          <path d="M200 200 L 396 200 A196 196 0 0 0 338.6 61.4 Z" fill="url(#sweep)" />
        </g>
        {NODES.slice(1).map(([x, y], i) => (
          <line key={i} x1={NODES[i][0] * 4} y1={NODES[i][1] * 4} x2={x * 4} y2={y * 4} stroke="var(--color-intel)" strokeOpacity="0.25" strokeDasharray="3 5" />
        ))}
      </svg>

      {NODES.map(([x, y], i) => {
        const c = STATUS_META[statuses[i] ?? "normal"].color
        return (
          <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
            <span className="signal-ping absolute inset-0 rounded-full" style={{ background: c, animationDelay: `${i * 0.35}s` }} />
            <span className="relative block size-3 rounded-full ring-4 ring-background transition-colors duration-700" style={{ background: c }} />
          </span>
        )
      })}

      <div className="glass absolute left-0 top-[12%] hidden max-w-[260px] rounded-xl border border-border px-3 py-2 sm:block">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {incident ? `Live · ${timeAgoIso(incident.updatedAt)}` : "Live signal"}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm font-medium">{incident?.title ?? "Listening for signals…"}</p>
        {incident && (
          <p className="font-mono text-[10px] text-teal">
            confidence {incident.confidence}% · {incident.source}
          </p>
        )}
      </div>
      <div className="glass absolute bottom-[6%] right-0 hidden rounded-xl border border-border px-3 py-2 sm:block">
        <p className="font-mono text-[10px] text-muted-foreground">23.8103° N · 90.4125° E</p>
        <p className="mt-0.5 text-sm">
          <span className="font-bangla">ঢাকা</span>
          {weather?.metric && <span className="text-muted-foreground"> · {weather.metric}</span>}
          {air?.metric && <span className="text-muted-foreground"> · {air.metric}</span>}
        </p>
      </div>
    </div>
  )
}
