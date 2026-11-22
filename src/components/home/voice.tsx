import { ArrowRight } from "lucide-react"

const PAIRS = [
  ["Danger everywhere!", "A disruption has been reported nearby."],
  ["AI says this area is unsafe.", "Recent reports indicate increased disruption."],
  ["100% verified!", "Confirmed by multiple independent sources."],
  ["The city is blocked.", "A road closure has been reported on this segment."],
]

export function Voice() {
  return (
    <section className="border-t border-border bg-surface/30 py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal" data-reveal>
            Voice
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]" data-reveal>
            Precise. Calm. <span className="font-serif font-normal italic text-intel">Useful.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg text-muted-foreground" data-reveal>
            When we talk about floods, accidents and closures, words matter. SHONGKET informs — it never alarms.
          </p>
        </div>
        <ul className="divide-y divide-border border-y border-border">
          {PAIRS.map(([avoid, prefer], i) => (
            <li key={avoid} className="grid items-center gap-3 py-6 sm:grid-cols-[1fr_auto_1.3fr] sm:gap-6" data-reveal data-reveal-delay={String(i * 0.05)}>
              <p className="text-muted-foreground line-through decoration-status-critical/60 decoration-2">{avoid}</p>
              <ArrowRight className="hidden size-4 text-muted-foreground sm:block" />
              <p className="text-lg font-medium">{prefer}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
