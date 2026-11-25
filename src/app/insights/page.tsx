import type { Metadata } from "next"
import { Nav } from "@/components/site/nav"
import { Footer } from "@/components/site/footer"
import { InsightsDashboard } from "@/components/insights/insights-dashboard"
import { JsonLd } from "@/components/seo/json-ld"
import { INSIGHTS, SITE } from "@/lib/site"

export const metadata: Metadata = {
  title: INSIGHTS.title,
  description: INSIGHTS.description,
  alternates: { canonical: "/insights" },
  openGraph: {
    type: "website",
    url: "/insights",
    siteName: `${SITE.name} · ${SITE.nameBn}`,
    title: `${INSIGHTS.title} · ${SITE.name}`,
    description: INSIGHTS.description,
    locale: SITE.locale,
    alternateLocale: ["bn_BD"],
  },
  twitter: { card: "summary_large_image", title: `${INSIGHTS.title} · ${SITE.name}`, description: INSIGHTS.description },
}

export default function InsightsPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 overflow-x-clip">
        <InsightsDashboard />
      </main>
      <Footer />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: SITE.name, item: SITE.url },
              { "@type": "ListItem", position: 2, name: "Insights", item: `${SITE.url}/insights` },
            ],
          },
        ]}
      />
    </>
  )
}
