"use client"

import Link from "next/link"
import { useRef } from "react"
import { ArrowRight } from "lucide-react"
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap"
import { SignalMark } from "@/components/brand/logo"

export function About() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        ".giant-bn",
        { xPercent: 8 },
        { xPercent: -8, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } },
      )
      gsap.from(".about-mark", {
        rotate: -90, scale: 0.5, opacity: 0, duration: 1.4, ease: "expo.out",
        scrollTrigger: { trigger: ".about-mark", start: "top 85%" },
      })
    },
    { scope: root },
  )

  return (
    <section id="about" ref={root} className="relative scroll-mt-16 overflow-hidden border-t border-border py-28 sm:py-36">
      <p
        aria-hidden
        className="giant-bn pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-center font-bangla text-[clamp(8rem,28vw,26rem)] font-bold leading-none text-transparent [-webkit-text-stroke:1px_var(--border)]"
      >
        সংকেত
      </p>
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <SignalMark className="about-mark mx-auto size-16 text-foreground" />
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.25em] text-teal" data-reveal>
          Mission
        </p>
        <h2 className="mt-4 font-display text-[clamp(1.7rem,3.8vw,3rem)] font-semibold leading-[1.1] tracking-[-0.03em]" data-reveal>
          Make the world&apos;s changing conditions understandable and accessible to everyone —{" "}
          <span className="font-serif font-normal italic text-teal">starting with Bangladesh.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground" data-reveal>
          <span className="font-bangla">সংকেত</span> means signal, sign, indication. We&apos;re building a globally connected
          intelligence layer for places, communities, infrastructure and real-world events.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3" data-reveal>
          <Link href="/live" className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground glow-teal transition hover:brightness-110">
            Explore live signals <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a href="mailto:hello@shongket.com" className="inline-flex h-12 items-center rounded-full border border-border px-6 font-medium transition hover:bg-muted">
            Join the beta
          </a>
        </div>
      </div>
    </section>
  )
}
