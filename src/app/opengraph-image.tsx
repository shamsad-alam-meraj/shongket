import { ImageResponse } from "next/og"
import { HomeOg, OG_CONTENT_TYPE, OG_SIZE, ogFonts } from "@/lib/og"

export const alt = "SHONGKET — Understand the world around you. Live, verified local signals for Bangladesh."
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return new ImageResponse(<HomeOg />, { ...OG_SIZE, fonts: ogFonts() })
}
