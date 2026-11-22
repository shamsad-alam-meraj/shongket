"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, LocateFixed, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { REPORT_TYPES, type ReportType } from "@/lib/live/types"

type Props = {
  open: boolean
  onClose: () => void
  coords: { lat: number; lng: number } | null
  onRequestLocation: () => void
  onSubmitted: (id: string) => void
  bangla: boolean
}

export function ReportDialog({ open, onClose, coords, onRequestLocation, onSubmitted, bangla }: Props) {
  const [type, setType] = useState<ReportType | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    dialog.current?.querySelector<HTMLElement>("button")?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const submit = async () => {
    if (!type || !coords) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, note: note.trim(), lat: coords.lat, lng: coords.lng }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? "Could not submit")
      setType(null)
      setNote("")
      onClose()
      onSubmitted(body.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-border bg-background p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="report-title" className={cn("font-display text-lg font-semibold", bangla && "font-bangla")}>
            {bangla ? "কী দেখছেন জানান" : "Report what you see"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports appear as <span className="text-foreground">unverified</span> until three people nearby confirm them.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              aria-pressed={type === t.key}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition",
                type === t.key ? "border-teal bg-teal/10" : "border-border hover:bg-muted",
                bangla && "font-bangla",
              )}
            >
              {bangla ? t.labelBn : t.label}
            </button>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="text-xs text-muted-foreground">Details (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 280))}
            rows={3}
            placeholder="e.g. Water knee-deep near the main intersection"
            className="mt-1 w-full resize-none rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-intel"
          />
          <span className="block text-right font-mono text-[10px] text-muted-foreground">{note.length}/280</span>
        </label>

        <div className="mt-2 rounded-xl border border-border p-3 text-sm">
          {coords ? (
            <p className="font-mono text-xs text-muted-foreground">
              Location: {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}° (your current position)
            </p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Reports need your current location.</p>
              <button onClick={onRequestLocation} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">
                <LocateFixed className="size-3.5" /> Allow
              </button>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <button
          onClick={submit}
          disabled={!type || !coords || busy}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Submit report
        </button>
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Don’t include personal information. For emergencies call 999.
        </p>
      </div>
    </div>
  )
}
