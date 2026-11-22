import Link from "next/link"
import { SignalMark } from "@/components/brand/logo"

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <SignalMark className="size-14 text-foreground" />
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.25em] text-teal">404 · No signal</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">We couldn&apos;t find that page.</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        <span className="font-bangla">এই পাতাটি পাওয়া যায়নি।</span> The link may be outdated.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="rounded-full border border-border px-5 py-2.5 text-sm hover:bg-muted">Home</Link>
        <Link href="/live" className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Open live map</Link>
      </div>
    </main>
  )
}
