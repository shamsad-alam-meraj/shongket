"use client"

import { useRef } from "react"
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap"
import { STATUS_META } from "@/lib/signals"
import { DHAKA, timeAgoIso } from "@/lib/live/types"
import { useLiveSignals } from "@/hooks/use-live-data"

export function Ticker() {
  const track = useRef<HTMLDivElement>(null)
  const { data } = useLiveSignals(DHAKA, 300_000)
  const items = (data?.signals ?? []).filter((s) => s.verification !== "expired" && s.distanceKm < 200).slice(0, 14)

  useGSAP(
    () => {
      if (prefersReducedMotion() || !track.current || items.length === 0) return
      const tween = gsap.fromTo(track.current, { xPercent: 0 }, { xPercent: -50, ease: "none", duration: items.length * 6, repeat: -1 })
      const el = track.current.parentElement!
      const slow = () => gsap.to(tween, { timeScale: 0.15, duration: 0.6 })
      const fast = () => gsap.to(tween, { timeScale: 1, duration: 0.6 })
      el.addEventListener("mouseenter", slow)
      el.addEventListener("mouseleave", fast)
      return () => {
        el.removeEventListener("mouseenter", slow)
        el.removeEventListener("mouseleave", fast)
      }
    },
    { dependencies: [items.length] },
  )

  return (
    <div className="relative overflow-hidden border-y border-border bg-surface/40 py-4 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      {items.length === 0 ? (
        <p className="text-center font-mono text-xs text-muted-foreground">Connecting to live feeds…</p>
      ) : (
        <div ref={track} className="flex w-max gap-10">
          {[...items, ...items].map((s, i) => (
            <div key={`${s.id}-${i}`} className="flex items-center gap-3 whitespace-nowrap text-sm" aria-hidden={i >= items.length}>
              <span className="size-2 rounded-full" style={{ background: STATUS_META[s.status].color }} />
              <span>{s.title}</span>
              <span className="text-muted-foreground">· {s.source}</span>
              <span className="font-mono text-xs text-muted-foreground">{timeAgoIso(s.updatedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
