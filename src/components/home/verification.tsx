"use client"

import { useRef } from "react"
import { CheckCircle2, CircleDashed, CircleSlash, Clock3 } from "lucide-react"
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap"
import { STATUS_META, type SignalStatus } from "@/lib/signals"

const STATES = [
  { icon: CheckCircle2, label: "Confirmed", copy: "Confirmed by multiple independent sources.", confidence: 92, tone: "var(--color-teal)" },
  { icon: CircleDashed, label: "Unverified", copy: "A single report, awaiting corroboration.", confidence: 54, tone: "var(--color-intel)" },
  { icon: CircleSlash, label: "Disputed", copy: "Conflicting reports have been received.", confidence: 38, tone: "var(--color-status-significant)" },
  { icon: Clock3, label: "Expired", copy: "No recent reports — may be outdated.", confidence: 18, tone: "var(--color-status-unknown)" },
]

const ORDER: SignalStatus[] = ["normal", "minor", "significant", "critical", "unknown"]

export function Verification() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.utils.toArray<HTMLElement>(".conf-bar").forEach((bar) => {
        gsap.from(bar, { scaleX: 0, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: bar, start: "top 90%" } })
      })
      gsap.utils.toArray<HTMLElement>(".conf-num").forEach((el) => {
        const target = Number(el.dataset.value)
        const obj = { v: 0 }
        gsap.to(obj, {
          v: target,
          duration: 1.6,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 90%" },
          onUpdate: () => (el.textContent = `${Math.round(obj.v)}%`),
        })
      })
      gsap.from(".scale-seg", {
        scaleY: 0,
        transformOrigin: "bottom",
        stagger: 0.1,
        duration: 1,
        ease: "expo.out",
        scrollTrigger: { trigger: ".status-scale", start: "top 85%" },
      })
    },
    { scope: root },
  )

  return (
    <section id="verification" ref={root} className="scroll-mt-16 border-t border-border bg-surface/30 py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal" data-reveal>
              Trust, made visible
            </p>
            <h2 className="mt-4 font-display text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]" data-reveal>
              Every signal shows how sure we are.
            </h2>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground" data-reveal>
              Confirmed, unverified, disputed and expired reports look different — always. Every important signal
              carries its confidence, source count and last-updated time.
            </p>

            <div className="status-scale mt-12" data-reveal>
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Signal status scale</p>
              <div className="mt-4 flex h-28 items-end gap-2">
                {ORDER.map((s, i) => (
                  <div key={s} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="scale-seg w-full rounded-t-lg"
                      style={{ background: STATUS_META[s].color, height: s === "unknown" ? 28 : 28 + i * 18, opacity: s === "unknown" ? 0.6 : 1 }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {ORDER.map((s) => (
                  <div key={s}>
                    <p className="text-sm font-medium">{STATUS_META[s].label}</p>
                    <p className="font-bangla text-xs text-muted-foreground">{STATUS_META[s].labelBn}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                These colours describe SHONGKET&apos;s assessment — not an official government warning.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {STATES.map(({ icon: Icon, label, copy, confidence, tone }, i) => (
              <div
                key={label}
                data-reveal="scale"
                data-reveal-delay={String(i * 0.05)}
                className="flex flex-col rounded-2xl border border-border bg-background/60 p-6"
                style={{ borderStyle: label === "Unverified" ? "dashed" : "solid", opacity: label === "Expired" ? 0.8 : undefined }}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: tone }}>
                    <Icon className="size-4" /> {label}
                  </span>
                  <span className="conf-num tabular font-mono text-sm" data-value={confidence}>
                    {confidence}%
                  </span>
                </div>
                <p className="mt-4 flex-1 text-muted-foreground">{copy}</p>
                <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="conf-bar h-full origin-left rounded-full" style={{ width: `${confidence}%`, background: tone }} />
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Confidence</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
