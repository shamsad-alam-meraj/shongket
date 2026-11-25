/**
 * AI-written briefing (optional). Enabled only when ANTHROPIC_API_KEY is set.
 *
 * Claude receives ONLY the computed numbers (risk scores, readings, trend changes, incident counts)
 * — never the user's coordinates or any personal data — and turns them into a short, calm,
 * bilingual briefing. It is told not to add facts beyond the numbers. If the call fails, is refused
 * or the key is missing, the page falls back to the deterministic rule-based briefing.
 */
import Anthropic from "@anthropic-ai/sdk"
import type { Briefing, Impact, IncidentPulse, Risk, Trend } from "./types"

export const MODEL = "claude-opus-5-5"

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY)

let client: Anthropic | null = null
const getClient = () => (client ??= new Anthropic({ timeout: 25_000, maxRetries: 1 }))

const SYSTEM = `You write the daily "Insights" briefing for SHONGKET (সংকেত), a calm, non-alarmist local-intelligence service for Bangladesh.
You receive computed risk scores (0–100), readings, trend changes and news-incident counts for one place.
Rules:
- Use only the facts in the data. Never invent events, places, numbers or causes.
- Calm, plain, practical tone. No hype, no fear words, no emojis.
- English: headline ≤ 12 words; summary 2–3 sentences.
- Bangla: natural, fluent Bangla (not a word-for-word translation), Bangla digits.
- actions: 0–3 short practical steps that follow directly from the raised risks; none if everything is low.
- If every score is below 25, say conditions look ordinary.`

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    headlineBn: { type: "string" },
    summary: { type: "string" },
    summaryBn: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: { en: { type: "string" }, bn: { type: "string" } },
        required: ["en", "bn"],
        additionalProperties: false,
      },
    },
  },
  required: ["headline", "headlineBn", "summary", "summaryBn", "actions"],
  additionalProperties: false,
} as const

export async function aiBriefing(input: {
  place: string
  overall: { score: number; level: string }
  risks: Risk[]
  trends: Trend[]
  pulse: IncidentPulse
  impacts: Impact[]
}): Promise<Briefing> {
  const data = {
    place: input.place,
    overall: input.overall,
    risks: input.risks.map((r) => ({ area: r.label, score: r.score, level: r.level, reading: r.reading, drivers: r.drivers })),
    trends: input.trends.map((t) => ({ metric: t.label, unit: t.unit, next_days_vs_past_week_pct: t.change.pct, direction: t.change.direction })),
    incidents_24h: {
      clusters: input.pulse.total,
      by_type: input.pulse.byType.map((t) => ({ type: t.label, clusters: t.clusters, outlets: t.outlets })),
      top_areas: input.pulse.byArea.map((a) => a.name),
      community_reports: input.pulse.communityReports,
    },
    rule_based_impacts: input.impacts.map((i) => ({ area: i.label, level: i.level, note: i.text })),
  }

  const res = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: `Today's computed data:\n${JSON.stringify(data)}` }],
  })

  if (res.stop_reason === "refusal") throw new Error("briefing refused")
  if (res.stop_reason === "max_tokens") throw new Error("briefing truncated")
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("")
  const parsed = JSON.parse(text) as Omit<Briefing, "mode" | "model">
  return { ...parsed, actions: parsed.actions.slice(0, 3), mode: "ai", model: res.model }
}
