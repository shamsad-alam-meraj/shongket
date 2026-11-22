"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type GeoStatus = "idle" | "prompting" | "granted" | "denied" | "unavailable" | "unsupported"
export type GeoState = { status: GeoStatus; coords: { lat: number; lng: number } | null; accuracy: number | null; error?: string }

/**
 * Browser geolocation with live updates (watchPosition).
 * `autoRequest` asks immediately — the browser shows its own permission prompt.
 */
export function useGeolocation(autoRequest = false) {
  const [state, setState] = useState<GeoState>({ status: "idle", coords: null, accuracy: null })
  const watchId = useRef<number | null>(null)

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "unsupported" }))
      return
    }
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    setState((s) => ({ ...s, status: s.coords ? s.status : "prompting" }))
    watchId.current = navigator.geolocation.watchPosition(
      (pos) =>
        setState({
          status: "granted",
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
        }),
      (err) =>
        setState((s) => ({
          ...s,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
          error: err.message,
        })),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    )
  }, [])

  useEffect(() => {
    if (autoRequest) {
      // Defer to after paint so the page is visible behind the browser's prompt.
      const t = setTimeout(request, 400)
      return () => clearTimeout(t)
    }
    // Not auto-requesting: still start silently if permission was granted earlier.
    let cancelled = false
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (!cancelled && p.state === "granted") request()
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [autoRequest, request])

  useEffect(
    () => () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    },
    [],
  )

  return { ...state, request }
}
