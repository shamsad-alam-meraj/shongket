import type { Metadata } from "next"
import { Nav } from "@/components/site/nav"
import { Footer } from "@/components/site/footer"
import { RoutesPlanner } from "@/components/routes/routes-planner"
import { JsonLd } from "@/components/seo/json-ld"
import { ROUTES, SITE } from "@/lib/site"

export const metadata: Metadata = {
  title: ROUTES.title,
  description: ROUTES.description,
  alternates: { canonical: "/routes" },
  openGraph: {
    type: "website",
    url: "/routes",
    siteName: `${SITE.name} · ${SITE.nameBn}`,
    title: `${ROUTES.title} · ${SITE.name}`,
    description: ROUTES.description,
    locale: SITE.locale,
    alternateLocale: ["bn_BD"],
  },
  twitter: { card: "summary_large_image", title: `${ROUTES.title} · ${SITE.name}`, description: ROUTES.description },
}

export default function RoutesPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 overflow-x-clip">
        <RoutesPlanner />
      </main>
      <Footer />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: SITE.name, item: SITE.url },
              { "@type": "ListItem", position: 2, name: "Routes", item: `${SITE.url}/routes` },
            ],
          },
        ]}
      />
    </>
  )
}
