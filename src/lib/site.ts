function resolveSiteUrl() {
  // 1. Explicit canonical URL (set this in production)
  if (process.env.SITE_URL) return process.env.SITE_URL
  // 2. Vercel system env (production domain, then this deployment) — keeps OG/canonical URLs absolute
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

export const SITE = {
  name: "SHONGKET",
  nameBn: "সংকেত",
  tagline: "Understand the world around you.",
  /** ≤ 60 chars — what search results show as the headline */
  title: "SHONGKET — Live local signals & alerts in Bangladesh",
  /** ≤ 160 chars — what search results and link previews show */
  description:
    "Live, verified local signals for Bangladesh — fires, hartals, rallies, blockades, traffic, floods, weather and air quality on one calm, map-first platform.",
  url: resolveSiteUrl().replace(/\/$/, ""),
  themeColor: "#0B1220",
  locale: "en_US",
  keywords: [
    "SHONGKET", "সংকেত", "Bangladesh live map", "Dhaka live map", "Dhaka traffic", "Dhaka traffic jam today",
    "hartal today", "আজকের হরতাল", "যানজট", "মিছিল", "অবরোধ", "আগুন", "Dhaka fire", "Bangladesh flood",
    "Dhaka air quality", "AQI Dhaka", "earthquake Bangladesh", "real-world intelligence", "local alerts Bangladesh",
  ],
}

export const LIVE = {
  title: "Live map — what's happening near you",
  description:
    "Fires, hartals, rallies, blockades, traffic jams, floods, weather and air quality near you — verified, mapped and updated live. Bangla & English.",
}

export const INSIGHTS = {
  title: "Insights — trends, risk and impact near you",
  description:
    "Air quality, heat, rain, river flow, earthquakes and street incidents near you — 7-day trends, transparent risk scores and what they mean, in Bangla & English.",
}
