import Link from "next/link"
import { Bell, Building2, Code2, Map, Radio, Route, Sparkles, Users } from "lucide-react"

type Module = { name: string; icon: typeof Bell; desc: string; beta?: boolean; href?: string; live?: boolean }

const MODULES: Module[] = [
  { name: "Live", icon: Radio, desc: "Live incidents, disruptions and local conditions.", beta: true },
  { name: "Map", icon: Map, desc: "Interactive geographic intelligence.", beta: true },
  { name: "Community", icon: Users, desc: "Citizen reporting, evidence and verification.", beta: true },
  { name: "Alerts", icon: Bell, desc: "Personalised location-based notifications.", beta: true },
  { name: "Insights", icon: Sparkles, desc: "AI-assisted trends, risk and impact analysis.", href: "/insights", live: true },
  { name: "Services", icon: Building2, desc: "Hospitals, pharmacies, shelters, utilities.", href: "/services", live: true },
  { name: "Routes", icon: Route, desc: "Route disruption and mobility intelligence.", href: "/routes", live: true },
  { name: "API", icon: Code2, desc: "REST APIs, webhooks and developer SDKs." },
]

export function Modules() {
  return (
    <section id="modules" className="scroll-mt-16 border-t border-border py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal" data-reveal>
              One platform · modular by design
            </p>
            <h2 className="mt-4 font-display text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]" data-reveal>
              Built to expand, <span className="font-serif font-normal italic text-teal">module by module.</span>
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground" data-reveal>
            The first release brings Live, Map, Community and Alerts together in one web app. The rest follow once
            signal collection and verification are dependable.
          </p>
        </div>

        <div data-reveal="scale" className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map(({ name, icon: Icon, desc, beta, href, live }) => {
            const cls = "group relative flex min-h-56 flex-col justify-between bg-background p-6 transition-colors hover:bg-surface"
            const body = (
              <>
              <div className="flex items-start justify-between">
                <Icon className="size-6 text-muted-foreground transition-colors group-hover:text-teal" />
                <span
                  className={
                    beta || live
                      ? "rounded-full bg-teal/12 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-teal"
                      : "rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                  }
                >
                  {live ? "Live now" : beta ? "First release" : "Next"}
                </span>
              </div>
              <div>
                <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">SHONGKET</p>
                <h3 className="mt-1 font-display text-xl font-semibold">{name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
                {href && <span className="mt-3 inline-block text-sm text-teal">Open {name} →</span>}
              </div>
              <span className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 bg-teal transition-transform duration-500 group-hover:scale-x-100" />
              </>
            )
            return href ? (
              <Link key={name} href={href} className={cls}>{body}</Link>
            ) : (
              <div key={name} className={cls}>{body}</div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
