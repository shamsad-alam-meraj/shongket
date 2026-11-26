import Link from "next/link"
import { Logo } from "@/components/brand/logo"

const COLS = [
  { title: "Platform", links: [["Live", "/live"], ["Map", "/live"], ["Insights", "/insights"], ["Services", "/services"], ["Routes", "/routes"], ["Community", "/#modules"], ["Alerts", "/#modules"]] },
  { title: "Build", links: [["Developers", "/#developers"], ["API (preview)", "/#developers"], ["Status scale", "/#verification"]] },
  { title: "Company", links: [["About", "/#about"], ["Mission", "/#about"], ["Transparency", "/#verification"]] },
]

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-5 max-w-xs text-sm text-muted-foreground">Understand the world around you.</p>
          <p className="mt-1 font-bangla text-sm text-muted-foreground">আপনার চারপাশের পৃথিবীকে বুঝুন।</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm transition-colors hover:text-teal">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground sm:px-6">
          <span>Bangladesh-born · Built for the world</span>
          <span>
            Developed by{" "}
            <a
              href="https://shamsad.vercel.app/"
              target="_blank"
              rel="noopener"
              className="text-foreground underline-offset-4 transition-colors hover:text-teal hover:underline"
            >
              Shamsad Alam Meraj
            </a>
          </span>
          <span>© 2026 SHONGKET</span>
        </div>
      </div>
    </footer>
  )
}
