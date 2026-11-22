"use client"

import { useRef } from "react"
import { BellRing, Layers, Radar, ScanSearch } from "lucide-react"
import { gsap, useGSAP } from "@/lib/gsap"

const STEPS = [
  {
    n: "01",
    icon: Radar,
    title: "Collect signals",
    bn: "সংকেত সংগ্রহ",
    body: "Community reports, photos, partner feeds, weather data and public infrastructure sources flow into one stream.",
    chips: ["Citizen reports", "Partner feeds", "Weather", "Open data"],
  },
  {
    n: "02",
    icon: ScanSearch,
    title: "Verify with care",
    bn: "যাচাই",
    body: "AI-assisted cross-checking compares independent sources, location, time and history to produce a confidence score — never a verdict.",
    chips: ["Multi-source", "Confidence score", "Human review", "Dispute handling"],
  },
  {
    n: "03",
    icon: Layers,
    title: "Understand context",
    bn: "প্রেক্ষাপট বোঝা",
    body: "Each signal is placed on the map with its likely impact area, related signals, and how conditions are trending.",
    chips: ["Impact radius", "Related signals", "Trends", "Expiry"],
  },
  {
    n: "04",
    icon: BellRing,
    title: "Act on it",
    bn: "পদক্ষেপ",
    body: "Calm, personalised alerts for the places you care about — and APIs for teams building on real-world intelligence.",
    chips: ["Alerts", "Saved places", "Routes", "REST & webhooks"],
  },
]

export function Platform() {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const el = track.current!
        const distance = () => el.scrollWidth - window.innerWidth + 48
        const scroll = gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: ".platform-pin",
            pin: true,
            scrub: 0.8,
            start: "top top",
            end: () => `+=${distance()}`,
            invalidateOnRefresh: true,
          },
        })
        gsap.to(".platform-progress", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: ".platform-pin", start: "top top", end: () => `+=${distance()}`, scrub: true },
        })
        gsap.utils.toArray<HTMLElement>(".platform-card").forEach((card) => {
          gsap.from(card.querySelectorAll(".card-anim"), {
            y: 40,
            opacity: 0,
            stagger: 0.08,
            scrollTrigger: { trigger: card, containerAnimation: scroll, start: "left 85%", once: true },
          })
        })
      })
      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".platform-card").forEach((card) => {
          gsap.from(card, { y: 50, opacity: 0, scrollTrigger: { trigger: card, start: "top 88%" } })
        })
      })
    },
    { scope: root },
  )

  return (
    <section id="platform" ref={root} className="relative scroll-mt-16">
      <div className="platform-pin flex flex-col justify-center overflow-hidden py-24 lg:h-[100svh] lg:py-0">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal">How SHONGKET works</p>
              <h2 className="mt-4 max-w-2xl font-display text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
                From scattered signals to{" "}
                <span className="font-serif font-normal italic text-intel">clear understanding.</span>
              </h2>
            </div>
            <div className="hidden w-56 lg:block">
              <div className="h-px w-full bg-border">
                <div className="platform-progress h-px origin-left scale-x-0 bg-teal" />
              </div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Scroll to explore</p>
            </div>
          </div>
        </div>

        <div
          ref={track}
          className="mt-12 flex flex-col gap-5 px-4 sm:px-6 lg:w-max lg:flex-row lg:gap-6 lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:pr-12"
        >
          {STEPS.map(({ n, icon: Icon, title, bn, body, chips }) => (
            <article
              key={n}
              className="platform-card group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-surface p-7 sm:p-9 lg:h-[56vh] lg:min-h-[420px] lg:w-[min(34rem,42vw)]"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[radial-gradient(closest-side,rgb(87_155_255/0.18),transparent)] transition-transform duration-700 group-hover:scale-125" />
              <div className="card-anim flex items-center justify-between">
                <span className="font-mono text-sm text-muted-foreground">{n}</span>
                <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-border bg-background/60">
                  <Icon className="size-5 text-teal" />
                </span>
              </div>
              <div className="mt-10">
                <h3 className="card-anim font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
                <p className="card-anim mt-1 font-bangla text-muted-foreground">{bn}</p>
                <p className="card-anim mt-5 max-w-md leading-relaxed text-muted-foreground">{body}</p>
                <ul className="card-anim mt-6 flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <li key={c} className="rounded-full border border-border px-3 py-1 font-mono text-[11px] text-muted-foreground">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
