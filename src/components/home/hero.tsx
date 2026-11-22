"use client"

import Link from "next/link"
import { useRef } from "react"
import { ArrowRight, Radio, ShieldCheck, Sparkles, Users } from "lucide-react"
import { gsap, SplitText, useGSAP, prefersReducedMotion } from "@/lib/gsap"
import { RadarVisual } from "./radar-visual"

export function Hero() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        gsap.set("[data-hero]", { opacity: 1 })
        return
      }
      const split = SplitText.create(".hero-title", { type: "words,chars", mask: "words" })
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } })
      tl.set("[data-hero]", { opacity: 1 })
        .fromTo(".hero-eyebrow", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 })
        .fromTo(split.chars, { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.012 }, "<0.1")
        .fromTo(".hero-sub", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 }, "-=0.7")
        .fromTo(".hero-cta > *", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.7 }, "-=0.6")
        .fromTo(".hero-pill", { y: 12, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.6 }, "-=0.5")
        .fromTo(".hero-radar-inner", { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.6 }, 0.2)

      // Scroll parallax — explicit fromTo so scrolling back always restores the exact
      // resting state (a plain .to() would capture the pre-intro hidden state as its start).
      const st = { trigger: root.current, start: "top top", end: "bottom top", scrub: true }
      gsap.fromTo(".hero-parallax", { yPercent: 0 }, { yPercent: -12, ease: "none", immediateRender: false, scrollTrigger: st })
      gsap.fromTo(".hero-radar", { yPercent: 0, scale: 1 }, { yPercent: 14, scale: 1.08, ease: "none", immediateRender: false, scrollTrigger: st })
      return () => split.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="relative isolate overflow-hidden pt-28 pb-20 sm:pt-36 lg:min-h-[100svh] lg:pb-28">
      <div className="bg-grid absolute inset-0 -z-20 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="absolute -top-40 left-1/2 -z-10 h-[620px] w-[980px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(32_214_194/0.16),transparent)]" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="hero-copy opacity-0" data-hero>
          <div className="hero-parallax">
          <p className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="relative flex size-2">
              <span className="signal-ping absolute inset-0 rounded-full bg-teal" />
              <span className="relative size-2 rounded-full bg-teal" />
            </span>
            Real-world intelligence
          </p>

          <h1 className="hero-title mt-6 font-display text-[clamp(2.4rem,6.2vw,5.2rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
            The world is constantly changing.{" "}
            <span className="font-serif text-[1.12em] font-normal italic tracking-normal text-teal">Stay aware.</span>
          </h1>

          <p className="hero-sub mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Discover what&apos;s happening around you. Understand local signals. Make better-informed decisions.
            <span className="mt-2 block font-bangla text-base text-muted-foreground/80">
              আপনার চারপাশের পৃথিবীকে বুঝুন।
            </span>
          </p>

          <div className="hero-cta mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/live"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground glow-teal transition hover:brightness-110"
            >
              Explore live signals
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#platform"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-border px-6 font-medium transition hover:bg-muted"
            >
              How it works
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-2">
            {[
              { icon: Radio, label: "Live intelligence" },
              { icon: Users, label: "Community-powered" },
              { icon: Sparkles, label: "AI-assisted" },
              { icon: ShieldCheck, label: "Verified, not alarmist" },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="hero-pill inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground"
              >
                <Icon className="size-3.5 text-teal" /> {label}
              </li>
            ))}
          </ul>
          </div>
        </div>

        <div className="hero-radar relative mx-auto w-full max-w-[560px] opacity-0" data-hero>
          <div className="hero-radar-inner">
            <RadarVisual />
          </div>
        </div>
      </div>
    </section>
  )
}
