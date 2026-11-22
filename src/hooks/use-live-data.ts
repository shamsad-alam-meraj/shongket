"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { haversineKm, type LiveResponse, type ServicesResponse } from "@/lib/live/types"

type Pt = { lat: number; lng: number }

// De-duplicate identical in-flight requests across components (e.g. ticker + preview on the homepage)
const inflight = new Map<string, Promise<unknown>>()
function getJson<T>(url: string): Promise<T> {
  const hit = inflight.get(url)
  if (hit) return hit as Promise<T>
  const p = fetch(url, { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<T>
    })
    .finally(() => setTimeout(() => inflight.delete(url), 1000))
  inflight.set(url, p)
  return p
}

/** Re-anchor only when the user has moved meaningfully, so GPS jitter doesn't refetch. */
function useStablePoint(p: Pt | null, thresholdKm: number) {
  const [stable, setStable] = useState<Pt | null>(p)
  const last = useRef<Pt | null>(p)
  useEffect(() => {
    if (!p) return
    if (!last.current || haversineKm(last.current, p) > thresholdKm) {
      last.current = p
      setStable(p)
    }
  }, [p, thresholdKm])
  return stable
}

export function useLiveSignals(point: Pt | null, refreshMs = 120_000) {
  const anchor = useStablePoint(point, 0.3)
  const [data, setData] = useState<LiveResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!anchor) return
    setLoading(true)
    try {
      const d = await getJson<LiveResponse>(`/api/signals?lat=${anchor.lat.toFixed(5)}&lng=${anchor.lng.toFixed(5)}`)
      setData(d)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [anchor])

  useEffect(() => {
    const first = setTimeout(load, 0) // async kick-off (keeps setState out of the effect body)
    const t = setInterval(load, refreshMs)
    const onVisible = () => document.visibilityState === "visible" && load()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearTimeout(first)
      clearInterval(t)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [load, refreshMs])

  return { data, error, loading, reload: load }
}

export function useServices(point: Pt | null, enabled = true) {
  const anchor = useStablePoint(point, 0.5)
  const [data, setData] = useState<ServicesResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!anchor || !enabled) return
    setLoading(true)
    try {
      setData(await getJson<ServicesResponse>(`/api/services?lat=${anchor.lat.toFixed(4)}&lng=${anchor.lng.toFixed(4)}`))
    } catch {
      setData({ services: [], source: "OpenStreetMap (unavailable)", ok: false, generatedAt: new Date().toISOString() })
    } finally {
      setLoading(false)
    }
  }, [anchor, enabled])

  useEffect(() => {
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [load])

  return { data, loading, reload: load }
}

/**
 * Re-render periodically so "x min ago" labels stay current.
 * Returns `undefined` until mounted — reading the clock during prerender is non-deterministic.
 */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState<number | undefined>(undefined)
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0)
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [intervalMs])
  return now
}
