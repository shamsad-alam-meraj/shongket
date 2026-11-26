import type { MetadataRoute } from "next"
import { SITE } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: "weekly", priority: 1, images: [`${SITE.url}/opengraph-image`] },
    { url: `${SITE.url}/live`, changeFrequency: "always", priority: 0.9, images: [`${SITE.url}/live/opengraph-image`] },
    { url: `${SITE.url}/insights`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE.url}/services`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE.url}/routes`, changeFrequency: "hourly", priority: 0.8 },
  ]
}
