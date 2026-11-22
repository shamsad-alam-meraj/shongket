import type { Metadata } from "next"
import { LiveDashboard } from "@/components/live/live-dashboard"
import { JsonLd } from "@/components/seo/json-ld"
import { LIVE, SITE } from "@/lib/site"

export const metadata: Metadata = {
  title: LIVE.title,
  description: LIVE.description,
  alternates: { canonical: "/live" },
  openGraph: {
    type: "website",
    url: "/live",
    siteName: `${SITE.name} · ${SITE.nameBn}`,
    title: `${LIVE.title} · ${SITE.name}`,
    description: LIVE.description,
    locale: SITE.locale,
    alternateLocale: ["bn_BD"],
  },
  twitter: { card: "summary_large_image", title: `${LIVE.title} · ${SITE.name}`, description: LIVE.description },
}

export default function LivePage() {
  return (
    <>
      <h1 className="sr-only">
        {SITE.name} Live — {LIVE.description}
      </h1>
      <LiveDashboard />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "@id": `${SITE.url}/live#app`,
            name: `${SITE.name} Live`,
            alternateName: "সংকেত লাইভ",
            url: `${SITE.url}/live`,
            description: LIVE.description,
            applicationCategory: "TravelApplication",
            operatingSystem: "Any (web browser)",
            inLanguage: ["en", "bn"],
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            publisher: { "@id": `${SITE.url}/#organization` },
            image: `${SITE.url}/live/opengraph-image`,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: SITE.name, item: SITE.url },
              { "@type": "ListItem", position: 2, name: "Live map", item: `${SITE.url}/live` },
            ],
          },
        ]}
      />
    </>
  )
}
