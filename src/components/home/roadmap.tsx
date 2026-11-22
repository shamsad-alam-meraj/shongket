"use client"

import { useRef } from "react"
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap"

const STAGES = [
  { label: "Bangladesh", bn: "বাংলাদেশ", note: "Dhaka-first beta. Bangla & English from day one." },
  { label: "South Asia", bn: "দক্ষিণ এশিয়া", note: "Regional localisation and partner integrations." },
  { label: "Global", bn: "বিশ্ব", note: "A connected intelligence layer for places everywhere." },
]

const PHASES = [
  "Domain, trademark & handle screening",
  "Logo, typography, colour tokens & guidelines",
  "Website & app design system",
  "Bangladesh-first product beta",
  "Public launch & community growth",
  "Global localisation & integrations",
]

export function Roadmap() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from(".route-path", {
        drawSVG: "0%",
        ease: "none",
        scrollTrigger: { trigger: ".route-wrap", start: "top 75%", end: "bottom 55%", scrub: 0.6 },
      })
      gsap.from(".route-node", {
        scale: 0,
        transformOrigin: "center",
        stagger: 0.25,
        ease: "back.out(2)",
        scrollTrigger: { trigger: ".route-wrap", start: "top 70%" },
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} className="border-t border-border py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal" data-reveal>
          Expansion
        </p>
        <h2 className="mt-4 max-w-3xl font-display text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]" data-reveal>
          Bangladesh first. <span className="font-serif font-normal italic text-teal">Built for the world.</span>
        </h2>

        <div className="route-wrap relative mt-16">
          <svg viewBox="0 0 1000 120" className="hidden h-28 w-full md:block" preserveAspectRatio="none" aria-hidden>
            <path d="M80 60 C 250 0, 330 120, 500 60 S 760 0, 920 60" fill="none" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="4 8" />
            <path className="route-path" d="M80 60 C 250 0, 330 120, 500 60 S 760 0, 920 60" fill="none" stroke="var(--color-teal)" strokeWidth="2.5" strokeLinecap="round" />
            {[80, 500, 920].map((x) => (
              <g key={x} className="route-node">
                <circle cx={x} cy="60" r="12" fill="var(--color-background)" stroke="var(--color-teal)" strokeWidth="2" />
                <circle cx={x} cy="60" r="5" fill="var(--color-teal)" />
              </g>
            ))}
          </svg>
          <div className="grid gap-8 md:grid-cols-3 md:gap-6">
            {STAGES.map((s, i) => (
              <div key={s.label} className={i === 1 ? "md:text-center" : i === 2 ? "md:text-right" : ""} data-reveal data-reveal-delay={String(i * 0.1)}>
                <p className="font-mono text-xs text-muted-foreground">0{i + 1}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{s.label}</p>
                <p className="font-bangla text-muted-foreground">{s.bn}</p>
                <p className={`mt-3 max-w-xs text-sm text-muted-foreground ${i === 1 ? "md:mx-auto" : i === 2 ? "md:ml-auto" : ""}`}>{s.note}</p>
              </div>
            ))}
          </div>
        </div>

        <ol className="mt-20 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PHASES.map((p, i) => (
            <li key={p} className="flex items-start gap-4 rounded-2xl border border-border p-5" data-reveal data-reveal-delay={String((i % 3) * 0.06)}>
              <span className="font-mono text-sm text-teal">P{i + 1}</span>
              <span className="text-sm">{p}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
