"use client"

import { useEffect } from "react"
import Link from "next/link"
import { SignalMark } from "@/components/brand/logo"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <SignalMark className="size-14 text-foreground" />
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.25em] text-status-significant">Signal interrupted</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Something went wrong on our side.</h1>
      <p className="mt-3 max-w-md text-muted-foreground">Please try again. If it keeps happening, the live feeds may be temporarily unavailable.</p>
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Try again</button>
        <Link href="/" className="rounded-full border border-border px-5 py-2.5 text-sm hover:bg-muted">Home</Link>
      </div>
      {error.digest && <p className="mt-6 font-mono text-[10px] text-muted-foreground">ref {error.digest}</p>}
    </main>
  )
}
