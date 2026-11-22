"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useRef } from "react"
import { ArrowUpRight, Loader2 } from "lucide-react"
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap"
import { STATUS_META, VERIFICATION_META } from "@/lib/signals"
import { DHAKA, timeAgoIso } from "@/lib/live/types"
import { useLiveSignals } from "@/hooks/use-live-data"

const LiveMap = dynamic(() => import("@/components/live/live-map").then((m) => m.LiveMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-surface" />,
})

export function LivePreview() {
  const root = useRef<HTMLElement>(null)
  const { data } = useLiveSignals(DHAKA, 300_000)
  const local = (data?.signals ?? []).filter((s) => s.distanceKm < 60)
  const list = local.filter((s) => s.verification !== "expired").slice(0, 5)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        ".preview-frame",
        { rotateX: 18, scale: 0.9, y: 50 },
        {
          rotateX: 0, scale: 1, y: 0, ease: "none",
          scrollTrigger: { trigger: ".preview-frame", start: "top 95%", end: "top 30%", scrub: 0.6 },
        },
      )
    },
    { scope: root },
  )

  return (
    <section ref={root} className="py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal" data-reveal>
            SHONGKET Live · Dhaka, right now
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]" data-reveal>
            Map-first. Calm by design.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground" data-reveal>
            Live signals from news, official hazard feeds, weather and air-quality sensors — teal for normal,
            amber and red only when it genuinely matters.
          </p>
        </div>

        <div className="mt-16 [perspective:1400px]">
          <div className="preview-frame overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-[0_40px_120px_-40px_rgb(32_214_194/0.35)]">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="size-2.5 rounded-full bg-status-critical/70" />
              <span className="size-2.5 rounded-full bg-status-minor/70" />
              <span className="size-2.5 rounded-full bg-status-normal/70" />
              <span className="ml-3 truncate font-mono text-[11px] text-muted-foreground">
                shongket · live · {data?.location.place ?? "Dhaka"}
              </span>
            </div>
            <div className="grid lg:grid-cols-[1fr_380px]">
              <div className="relative h-[340px] sm:h-[460px]">
                <LiveMap center={DHAKA} zoom={10.6} signals={local} interactive={false} />
              </div>
              <div className="border-t border-border p-4 lg:border-l lg:border-t-0">
                <p className="px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Latest around Dhaka</p>
                <ul className="mt-3 min-h-[280px] space-y-1">
                  {!data && (
                    <li className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Loading live signals…
                    </li>
                  )}
                  {list.map((s) => (
                    <li key={s.id} className="flex gap-3 rounded-xl p-2.5 hover:bg-muted/60">
                      <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: STATUS_META[s.status].color }} />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium leading-snug">{s.title}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {VERIFICATION_META[s.verification].label} · {s.confidence}% · {timeAgoIso(s.updatedAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/live"
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition hover:brightness-110"
                >
                  See what&apos;s around you <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
            Real data · news locations are area-level approximations
          </p>
        </div>
      </div>
    </section>
  )
}
