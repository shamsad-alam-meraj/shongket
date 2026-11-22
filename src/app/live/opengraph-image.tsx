import { ImageResponse } from "next/og"
import { LiveOg, OG_CONTENT_TYPE, OG_SIZE, ogFonts } from "@/lib/og"

export const alt = "SHONGKET Live — fires, hartals, rallies, blockades, traffic jams, floods and air quality near you."
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return new ImageResponse(<LiveOg />, { ...OG_SIZE, fonts: ogFonts() })
}
