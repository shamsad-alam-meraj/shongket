"use client"

import { Moon, Sun } from "lucide-react"
import { useSyncExternalStore } from "react"

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => obs.disconnect()
}
const getSnapshot = () => document.documentElement.classList.contains("dark")
const getServerSnapshot = () => true

export function useIsDark() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function ThemeToggle() {
  const dark = useIsDark()

  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem("shongket-theme", next ? "dark" : "light")
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
