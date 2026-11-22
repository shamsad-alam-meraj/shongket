import type { Metadata, Viewport } from "next"
import { Unbounded, Sora, Martian_Mono, Instrument_Serif, Anek_Bangla } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { MotionGuard } from "@/components/motion/motion-guard"
import { SITE } from "@/lib/site"
import "./globals.css"

const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], display: "swap" })
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], display: "swap" })
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin"], display: "swap" })
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
})
const anekBangla = Anek_Bangla({ variable: "--font-anek-bangla", subsets: ["bengali", "latin"], display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["Bangladesh", "Dhaka", "live map", "traffic", "hartal", "flood", "air quality", "earthquake", "সংকেত", "real-world intelligence"],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    locale: "en_US",
    alternateLocale: ["bn_BD"],
  },
  twitter: { card: "summary_large_image", title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: SITE.themeColor },
    { media: "(prefers-color-scheme: light)", color: "#F4F7FB" },
  ],
  width: "device-width",
  initialScale: 1,
}

// Dark-first: apply the stored theme (or dark) before paint, and mark JS as available.
const themeScript = `(function(){try{var t=localStorage.getItem('shongket-theme');var d=document.documentElement;d.classList.add('js');if(t!=='light'){d.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${unbounded.variable} ${sora.variable} ${martian.variable} ${instrument.variable} ${anekBangla.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <MotionGuard />
      </body>
    </html>
  )
}
