"use client"

import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap"

/**
 * Animate-on-scroll for any element with `data-reveal`.
 * Variants: data-reveal="up" (default) | "scale" | "left" | "right" | "fade"
 * Optional data-reveal-delay="0.2"
 *
 * Guarantees: every element ends fully visible — whether you scroll down to it, jump past it
 * (anchor link / reload mid-page), or scroll back up to it. It animates once and then stays put.
 */
export function ScrollReveal() {
  useGSAP(() => {
    const els = gsap.utils.toArray<HTMLElement>("[data-reveal]")
    if (prefersReducedMotion()) {
      gsap.set(els, { opacity: 1, clearProps: "transform" })
      return
    }

    const from = (el: HTMLElement): gsap.TweenVars => {
      switch (el.dataset.reveal) {
        case "scale": return { scale: 0.94, y: 24 }
        case "left": return { x: -40 }
        case "right": return { x: 40 }
        case "fade": return {}
        default: return { y: 40 }
      }
    }

    const revealed = new WeakSet<HTMLElement>()
    const reveal = (batch: Element[], instant = false) => {
      const fresh = (batch as HTMLElement[]).filter((el) => !revealed.has(el))
      if (!fresh.length) return
      fresh.forEach((el) => revealed.add(el))
      gsap.to(fresh, {
        opacity: 1, x: 0, y: 0, scale: 1,
        duration: instant ? 0.4 : 1,
        ease: "expo.out",
        stagger: instant ? 0 : 0.08,
        delay: (_i: number, t: HTMLElement) => (instant ? 0 : Number(t.dataset.revealDelay ?? 0)),
        overwrite: true,
        clearProps: "transform",
      })
    }

    els.forEach((el) => gsap.set(el, { ...from(el), opacity: 0 }))

    ScrollTrigger.batch(els, {
      start: "top 90%",
      end: "bottom top",
      onEnter: (b) => reveal(b),
      onEnterBack: (b) => reveal(b, true),
      onLeave: (b) => reveal(b, true), // jumped past it
    })

    // Positions shift once web fonts + images settle; recompute so triggers line up.
    const refresh = () => ScrollTrigger.refresh()
    document.fonts?.ready.then(refresh)
    window.addEventListener("load", refresh)

    // Anything already above the viewport (e.g. reload mid-page) should just be visible.
    requestAnimationFrame(() => {
      reveal(els.filter((el) => el.getBoundingClientRect().bottom < 0), true)
    })

    return () => window.removeEventListener("load", refresh)
  })
  return null
}
