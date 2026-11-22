// Generates raster icons from src/app/icon.svg: favicon.ico (16/32/48), PWA + maskable PNGs.
// Output is committed. Run after changing the logo:  node scripts/render-icons.mjs
import sharp from "sharp"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"

const svg = readFileSync("src/app/icon.svg")
mkdirSync("public/icons", { recursive: true })

for (const size of [192, 512]) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(`public/icons/icon-${size}.png`)
}

// Maskable: logo inside the 80% safe zone on a solid background (Android adaptive icons)
const inner = await sharp(svg, { density: 512 }).resize(360, 360).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0B1220" } })
  .composite([{ input: inner, left: 76, top: 76 }])
  .png()
  .toFile("public/icons/maskable-512.png")

// favicon.ico containing PNG-encoded 16, 32 and 48 px images
const sizes = [16, 32, 48]
const pngs = await Promise.all(sizes.map((s) => sharp(svg, { density: 384 }).resize(s, s).png().toBuffer()))
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = 6 + 16 * sizes.length
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(sizes[i], 0)
  e.writeUInt8(sizes[i], 1)
  e.writeUInt8(0, 2)
  e.writeUInt8(0, 3)
  e.writeUInt16LE(1, 4)
  e.writeUInt16LE(32, 6)
  e.writeUInt32LE(png.length, 8)
  e.writeUInt32LE(offset, 12)
  offset += png.length
  return e
})
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...entries, ...pngs]))
console.log("icons: public/icons/{icon-192,icon-512,maskable-512}.png, src/app/favicon.ico")
