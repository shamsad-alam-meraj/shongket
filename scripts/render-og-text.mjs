// Pre-renders the Bangla phrases used in social share images.
// The OG renderer (Satori) can't shape Bangla (vowel signs end up misplaced), so we shape
// with Pango/HarfBuzz via sharp and embed transparent PNGs. Output is committed.
// Run after changing any phrase:  node scripts/render-og-text.mjs
import sharp from "sharp"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const FONT = "src/assets/og-fonts/AnekBangla-SemiBold.ttf"
const OUT = "src/assets/og-text"
const SCALE = 2 // render at 2× for crisp edges, displayed at 1×

const PHRASES = [
  { key: "brand", text: "সংকেত", px: 22, color: "#A3B2C7" },
  { key: "tagline", text: "আপনার চারপাশের পৃথিবীকে বুঝুন।", px: 32, color: "#A3B2C7" },
  { key: "bangla", text: "বাংলা", px: 21, color: "#F4F7FB" },
  { key: "fire", text: "আগুন", px: 23, color: "#F4F7FB" },
  { key: "hartal", text: "হরতাল", px: 23, color: "#F4F7FB" },
  { key: "rally", text: "মিছিল", px: 23, color: "#F4F7FB" },
  { key: "blockade", text: "অবরোধ", px: 23, color: "#F4F7FB" },
  { key: "jam", text: "যানজট", px: 23, color: "#F4F7FB" },
  { key: "flood", text: "বন্যা", px: 23, color: "#F4F7FB" },
  { key: "air", text: "বায়ুর মান", px: 23, color: "#F4F7FB" },
]

mkdirSync(OUT, { recursive: true })
const manifest = {}
for (const p of PHRASES) {
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${p.color}">${p.text}</span>`,
      font: `Anek Bangla SemiBold ${p.px * SCALE}`,
      fontfile: FONT,
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true })
  writeFileSync(join(OUT, `${p.key}.png`), data)
  manifest[p.key] = { width: Math.round(info.width / SCALE), height: Math.round(info.height / SCALE) }
  console.log(`${p.key.padEnd(9)} ${p.text}  →  ${manifest[p.key].width}×${manifest[p.key].height}`)
}
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n")
