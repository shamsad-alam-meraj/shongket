"use client"

import { useEffect } from "react"
import { gsap } from "@/lib/gsap"

/**
 * Content must never depend on the animation loop.
 *
 * GSAP/ScrollTrigger run on requestAnimationFrame, which browsers pause or throttle in
 * background tabs, low-power mode, some embedded webviews, or during long main-thread stalls.
 * If that happens after an element was set to its hidden "from" state, it would stay invisible.
 *
 * This guard runs on a plain timer. Any animated element that has been on (or above) the screen
 * for longer than GRACE_MS while still hidden is snapped to its final, visible state.
 * In a healthy browser every entrance animation has finished long before that, so it never fires.
 */
const GRACE_MS = 3000

const RULES: { selector: string; final: gsap.TweenVars }[] = [
  {
    selector:
      "[data-reveal], .card-anim, .hero-eyebrow, .hero-sub, .hero-cta > *, .hero-pill, .hero-radar-inner, .code-line, .aud-copy > *, .dash-in, .detail-card > *",
    final: { opacity: 1, x: 0, y: 0, scale: 1 },
  },
  { selector: "[data-hero]", final: { opacity: 1 } },
  { selector: ".hero-title div", final: { yPercent: 0 } },
  { selector: ".conf-bar, .detail-bar", final: { scaleX: 1 } },
  { selector: ".scale-seg", final: { scaleY: 1 } },
  { selector: ".route-node, .about-mark", final: { scale: 1, rotate: 0, opacity: 1 } },
]

function isHidden(el: HTMLElement) {
  const cs = getComputedStyle(el)
  if (parseFloat(cs.opacity) < 0.99) return true
  // translated/scaled away (e.g. SplitText chars pushed below their mask, bars at scale 0)
  const t = cs.transform
  if (t && t !== "none") {
    const m = new DOMMatrixReadOnly(t)
    if (Math.abs(m.m42) > 2 || Math.abs(m.m41) > 2 || m.a < 0.98 || m.d < 0.98) return true
  }
  return false
}

function onOrAboveScreen(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return false
  return r.top < window.innerHeight && r.left < window.innerWidth && r.right > 0
}

export function MotionGuard() {
  useEffect(() => {
    const since = new WeakMap<HTMLElement, number>()
    const tick = () => {
      const now = performance.now()
      for (const { selector, final } of RULES) {
        document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
          if (!onOrAboveScreen(el) || !isHidden(el)) {
            since.delete(el)
            return
          }
          const first = since.get(el)
          if (first == null) since.set(el, now)
          else if (now - first > GRACE_MS) {
            gsap.killTweensOf(el)
            gsap.set(el, final)
            since.delete(el)
          }
        })
      }
    }
    const id = window.setInterval(tick, 700)
    return () => window.clearInterval(id)
  }, [])
  return null
}
