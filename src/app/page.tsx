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
    </>
  )
}
