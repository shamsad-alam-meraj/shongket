/** Shared shapes for the Insights module (server analysis ↔ client page). */

export type RiskLevel = "low" | "moderate" | "elevated" | "high"

export type RiskKey = "air" | "heat" | "rain" | "river" | "seismic" | "civic"

export type Risk = {
  key: RiskKey
  label: string
  labelBn: string
  /** 0–100, null when the source was unavailable */
  score: number | null
  level: RiskLevel | null
  /** one-line headline of the current reading */
  reading: string
  /** plain-language reasons behind the score */
  drivers: string[]
  source: string
}

/** One point of a daily series; `forecast` marks model output (today onward). */
export type DayPoint = { date: string; value: number | null; forecast: boolean }

export type Trend = {
  key: "aqi" | "feels" | "rain" | "river"
  label: string
  labelBn: string
  unit: string
  /** direction of the coming days vs the past week */
  change: { pct: number | null; direction: "up" | "down" | "flat" | null }
  points: DayPoint[]
  source: string
}

export type IncidentPulse = {
  /** headline clusters in the last 24 h within reach of the location */
  total: number
  byType: { key: string; label: string; labelBn: string; clusters: number; outlets: number }[]
  byArea: { name: string; nameBn: string; clusters: number }[]
  /** headlines per hour, index 0 = the hour ending now, 23 = 23–24 h ago */
  hourly: number[]
  communityReports: number
  /** clusters carried by a single outlet (shown, but not counted in any score) */
  unverified: number
  ok: boolean
}

export type Impact = {
  area: "mobility" | "health" | "outdoor" | "property" | "power"
  label: string
  labelBn: string
  level: RiskLevel
  text: string
  textBn: string
}

export type Briefing = {
  headline: string
  headlineBn: string
  summary: string
  summaryBn: string
  actions: { en: string; bn: string }[]
  /** "ai" = written by Claude from the numbers below; "rules" = deterministic template */
  mode: "ai" | "rules"
  model?: string
}

export type InsightsResponse = {
  location: { lat: number; lng: number; place: string; placeBn?: string }
  generatedAt: string
  overall: { score: number; level: RiskLevel }
  risks: Risk[]
  trends: Trend[]
  pulse: IncidentPulse
  impacts: Impact[]
  briefing: Briefing
  sources: { name: string; ok: boolean; error?: string }[]
}

export const LEVEL_META: Record<RiskLevel, { label: string; labelBn: string; color: string }> = {
  low: { label: "Low", labelBn: "কম", color: "var(--color-status-normal)" },
  moderate: { label: "Moderate", labelBn: "মাঝারি", color: "var(--color-status-minor)" },
  elevated: { label: "Elevated", labelBn: "বাড়তি", color: "var(--color-status-significant)" },
  high: { label: "High", labelBn: "উচ্চ", color: "var(--color-status-critical)" },
}

export const levelOf = (score: number): RiskLevel =>
  score >= 75 ? "high" : score >= 50 ? "elevated" : score >= 25 ? "moderate" : "low"
