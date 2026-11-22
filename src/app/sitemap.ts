import type { MetadataRoute } from "next"
import { SITE } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: "weekly", priority: 1, images: [`${SITE.url}/opengraph-image`] },
    { url: `${SITE.url}/live`, changeFrequency: "always", priority: 0.9, images: [`${SITE.url}/live/opengraph-image`] },
  ]
}
