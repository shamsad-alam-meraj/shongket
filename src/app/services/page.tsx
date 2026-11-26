import type { Metadata } from "next"
import { Nav } from "@/components/site/nav"
import { Footer } from "@/components/site/footer"
import { ServicesDirectory } from "@/components/services/services-directory"
import { JsonLd } from "@/components/seo/json-ld"
import { SERVICES, SITE } from "@/lib/site"

export const metadata: Metadata = {
  title: SERVICES.title,
  description: SERVICES.description,
  alternates: { canonical: "/services" },
  openGraph: {
    type: "website",
    url: "/services",
    siteName: `${SITE.name} · ${SITE.nameBn}`,
    title: `${SERVICES.title} · ${SITE.name}`,
    description: SERVICES.description,
    locale: SITE.locale,
    alternateLocale: ["bn_BD"],
  },
  twitter: { card: "summary_large_image", title: `${SERVICES.title} · ${SITE.name}`, description: SERVICES.description },
}

export default function ServicesPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 overflow-x-clip">
        <ServicesDirectory />
      </main>
      <Footer />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: SITE.name, item: SITE.url },
              { "@type": "ListItem", position: 2, name: "Services", item: `${SITE.url}/services` },
            ],
          },
        ]}
      />
    </>
  )
}
