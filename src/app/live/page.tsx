import type { Metadata } from "next"
import { LiveDashboard } from "@/components/live/live-dashboard"

export const metadata: Metadata = {
  title: "Live map",
  description: "What’s happening around you right now — street incidents, hazards, weather and air quality, verified and mapped.",
}

export default function LivePage() {
  return <LiveDashboard />
}
