import type { MetadataRoute } from "next"
import { SITE } from "@/lib/site"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE.name} — ${SITE.nameBn}`,
    short_name: SITE.name,
    description: SITE.description,
    lang: "en",
    start_url: "/live",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: SITE.themeColor,
    theme_color: SITE.themeColor,
    categories: ["news", "navigation", "weather", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
