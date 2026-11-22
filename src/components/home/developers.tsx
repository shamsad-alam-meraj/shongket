"use client"

import { useRef, useState } from "react"
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"

const AUDIENCES = [
  { key: "users", label: "General users", line: "Know what's happening around you.", detail: "Save the places you care about — home, work, school — and get calm, relevant updates." },
  { key: "community", label: "Communities", line: "Your community. Your signals.", detail: "Report what you see, add evidence, and help confirm or dispute what others report." },
  { key: "dev", label: "Developers", line: "Build with real-world intelligence.", detail: "Query verified signals by location, subscribe to webhooks, and ship with typed SDKs." },
  { key: "org", label: "Organisations", line: "Understand location-based risk and change.", detail: "Monitor sites, routes and service areas from one dashboard." },
  { key: "global", label: "Global partners", line: "Intelligence connected to the real world.", detail: "Integrate data feeds and extend coverage across regions." },
]

const CODE = [
  { t: "c", s: "# Signals within 2 km of a point" },
  { t: "k", s: "GET /v1/signals?near=23.7461,90.3742&radius=2km" },
  { t: "p", s: "" },
  { t: "p", s: "{" },
  { t: "p", s: '  "id": "SG-2481",' },
  { t: "p", s: '  "category": "waterlogging",' },
  { t: "p", s: '  "status": "significant",' },
  { t: "p", s: '  "verification": "confirmed",' },
  { t: "n", s: '  "confidence": 0.92,' },
  { t: "n", s: '  "sources": 14,' },
  { t: "p", s: '  "updated_at": "2026-11-22T14:03:11+06:00"' },
  { t: "p", s: "}" },
]

export function Developers() {
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState("dev")
  const current = AUDIENCES.find((a) => a.key === active)!

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from(".code-line", {
        opacity: 0,
        x: -12,
        stagger: 0.07,
        duration: 0.5,
        scrollTrigger: { trigger: ".code-block", start: "top 75%" },
      })
    },
    { scope: root },
  )

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from(".aud-copy > *", { y: 16, opacity: 0, stagger: 0.06, duration: 0.6 })
    },
    { scope: root, dependencies: [active] },
  )

  return (
    <section id="developers" ref={root} className="scroll-mt-16 border-t border-border py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal" data-reveal>
            For everyone who needs to know
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]" data-reveal>
            Infrastructure, not just an app.
          </h2>

          <div className="mt-8 flex flex-wrap gap-2" role="tablist" data-reveal>
            {AUDIENCES.map((a) => (
              <button
                key={a.key}
                role="tab"
                aria-selected={a.key === active}
                onClick={() => setActive(a.key)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  a.key === active ? "border-teal bg-teal/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="aud-copy mt-8 min-h-32" key={active}>
            <p className="font-display text-2xl font-semibold">{current.line}</p>
            <p className="mt-3 max-w-md text-muted-foreground">{current.detail}</p>
          </div>
        </div>

        <div className="code-block min-w-0 overflow-hidden rounded-2xl border border-border bg-[#070d18] text-[#d7e1ee] shadow-2xl" data-reveal="right">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="font-mono text-[11px] text-[#a3b2c7]">SHONGKET API · v1 (preview)</span>
            <span className="rounded-full bg-[#20d6c2]/15 px-2 py-0.5 font-mono text-[10px] text-[#20d6c2]">200 OK</span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-6">
            {CODE.map((l, i) => (
              <div key={i} className="code-line whitespace-pre">
                <span className="mr-4 inline-block w-5 select-none text-right text-white/25">{i + 1}</span>
                <span
                  className={cn(
                    l.t === "c" && "text-[#7d8aa0]",
                    l.t === "k" && "text-[#20d6c2]",
                    l.t === "n" && "text-[#579bff]",
                  )}
                >
                  {l.s}
                </span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </section>
  )
}
