"use client"

import { useRef } from "react"
import { gsap, SplitText, useGSAP, prefersReducedMotion } from "@/lib/gsap"

/** The platform's central question, revealed word by word as you scroll. */
export function Question() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const split = SplitText.create(".q-text", { type: "words" })
      gsap.fromTo(
        split.words,
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: "none",
          scrollTrigger: { trigger: ".q-text", start: "top 80%", end: "bottom 45%", scrub: true },
        },
      )
      return () => split.revert()
    },
    { scope: root },
  )

  return (
    <section ref={root} className="mx-auto max-w-6xl px-4 py-28 sm:px-6 sm:py-40">
      <p className="mb-8 font-mono text-xs uppercase tracking-[0.25em] text-teal" data-reveal>
        The central question
      </p>
      <h2 className="q-text font-display text-[clamp(1.8rem,4.6vw,3.9rem)] font-medium leading-[1.12] tracking-[-0.03em]">
        What is happening around me, what does it mean, and how might it affect me?
      </h2>
      <p className="mt-10 max-w-2xl text-lg text-muted-foreground" data-reveal>
        SHONGKET turns scattered local signals into reliable, actionable understanding — so communities,
        organisations and developers can act on what&apos;s real, not what&apos;s rumoured.
      </p>
    </section>
  )
}
