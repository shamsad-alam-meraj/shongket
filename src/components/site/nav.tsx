"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { ThemeToggle } from "./theme-toggle"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/live", label: "Live" },
  { href: "/insights", label: "Insights" },
  { href: "/#platform", label: "Platform" },
  { href: "/#verification", label: "Verification" },
  { href: "/#modules", label: "Modules" },
  { href: "/#developers", label: "Developers" },
  { href: "/#about", label: "About" },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "glass border-b border-border" : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="SHONGKET home">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/live"
            className="hidden h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-110 sm:inline-flex"
          >
            Open live map <ArrowUpRight className="size-4" />
          </Link>
          <button
            className="inline-flex size-9 items-center justify-center rounded-full border border-border lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="glass border-t border-border lg:hidden">
          <ul className="mx-auto flex max-w-7xl flex-col px-4 py-3">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block py-3 text-base">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
