import { Nav } from "@/components/site/nav"
import { Footer } from "@/components/site/footer"
import { ScrollReveal } from "@/components/motion/scroll-reveal"
import { Hero } from "@/components/home/hero"
import { Ticker } from "@/components/home/ticker"
import { Question } from "@/components/home/question"
import { Platform } from "@/components/home/platform"
import { Verification } from "@/components/home/verification"
import { LivePreview } from "@/components/home/live-preview"
import { Modules } from "@/components/home/modules"
import { Voice } from "@/components/home/voice"
import { Developers } from "@/components/home/developers"
import { Roadmap } from "@/components/home/roadmap"
import { About } from "@/components/home/about"
import { JsonLd } from "@/components/seo/json-ld"
import { SITE } from "@/lib/site"

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1 overflow-x-clip">
        <Hero />
        <Ticker />
        <Question />
        <Platform />
        <Verification />
        <LivePreview />
        <Modules />
        <Voice />
        <Developers />
        <Roadmap />
        <About />
      </main>
      <Footer />
      <ScrollReveal />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${SITE.url}/#organization`,
            name: SITE.name,
            alternateName: SITE.nameBn,
            url: SITE.url,
            logo: { "@type": "ImageObject", url: `${SITE.url}/icons/icon-512.png`, width: 512, height: 512 },
            slogan: SITE.tagline,
            description: SITE.description,
            foundingLocation: { "@type": "Place", name: "Bangladesh" },
            areaServed: "Bangladesh",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${SITE.url}/#website`,
            name: SITE.name,
            alternateName: SITE.nameBn,
            url: SITE.url,
            description: SITE.description,
            inLanguage: ["en", "bn"],
            publisher: { "@id": `${SITE.url}/#organization` },
          },
        ]}
      />
    </>
  )
}
