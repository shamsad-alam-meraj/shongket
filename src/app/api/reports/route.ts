import { addReport, voteReport } from "@/lib/live/reports-store"
import { REPORT_TYPES, type ReportType } from "@/lib/live/types"
import { clientIp, rateLimit } from "@/lib/live/rate-limit"

const tooMany = (retryAfter: number) =>
  Response.json({ error: "Too many requests — please wait a moment." }, { status: 429, headers: { "Retry-After": String(retryAfter) } })

export async function POST(request: Request) {
  const rl = rateLimit(`report:${clientIp(request)}`, 5, 10 * 60_000)
  if (!rl.ok) return tooMany(rl.retryAfter)
  const body = (await request.json().catch(() => null)) as
    | { type?: string; note?: string; lat?: number; lng?: number }
    | null
  const type = body?.type as ReportType
  if (!body || !REPORT_TYPES.some((t) => t.key === type)) return Response.json({ error: "invalid type" }, { status: 400 })
  const { lat, lng } = body
  if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return Response.json({ error: "invalid location" }, { status: 400 })
  const r = await addReport({ type, note: String(body.note ?? ""), lat, lng })
  return Response.json(r, { status: 201 })
}

export async function PATCH(request: Request) {
  const rl = rateLimit(`vote:${clientIp(request)}`, 60, 10 * 60_000)
  if (!rl.ok) return tooMany(rl.retryAfter)
  const body = (await request.json().catch(() => null)) as { id?: string; vote?: string; delta?: number } | null
  if (!body?.id || (body.vote !== "confirm" && body.vote !== "dispute")) return Response.json({ error: "invalid" }, { status: 400 })
  const r = await voteReport(body.id, body.vote, body.delta === -1 ? -1 : 1)
  if (!r) return Response.json({ error: "not found" }, { status: 404 })
  return Response.json(r)
}
