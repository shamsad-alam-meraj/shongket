import { cn } from "@/lib/utils"

/** The Signal Core mark: a core node, radiating signal arcs, and a pin-like anchor node. */
export function SignalMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn("size-8", className)}>
      <path d="M5.9 14.87A15 15 0 0 1 34.1 14.87" stroke="var(--color-intel)" strokeWidth="2.2" strokeLinecap="round" className={animated ? "mark-arc" : undefined} />
      <path d="M12.21 15.5A9 9 0 0 1 27.79 15.5" stroke="var(--color-teal)" strokeWidth="2.2" strokeLinecap="round" className={animated ? "mark-arc" : undefined} />
      <path d="M20 20L20 33" stroke="var(--color-teal)" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="2.5 3" />
      <circle cx="20" cy="20" r="4.2" fill="var(--color-teal)" />
      <circle cx="5.9" cy="14.87" r="2.1" fill="var(--color-intel)" />
      <circle cx="34.1" cy="14.87" r="2.1" fill="var(--color-intel)" />
      <circle cx="20" cy="35.4" r="2.4" fill="currentColor" />
    </svg>
  )
}

export function Logo({ className, showBangla = true }: { className?: string; showBangla?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <SignalMark className="size-8 text-foreground" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-semibold tracking-[0.18em]">SHONGKET</span>
        {showBangla && (
          <span className="font-bangla text-[11px] text-muted-foreground tracking-wide mt-0.5">সংকেত</span>
        )}
      </span>
    </span>
  )
}
