/**
 * Shared renderer for social share images (Open Graph / X cards).
 * 1200×630 PNG — the size Facebook, LinkedIn, X (summary_large_image), WhatsApp, Slack,
 * Discord and Telegram all display without cropping the important parts.
 * Rendered at build time with the brand fonts (OFL). Bangla text is embedded as pre-shaped PNGs.
 */
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = "image/png"

const C = {
  midnight: "#0B1220",
  slate: "#142238",
  teal: "#20D6C2",
  blue: "#579BFF",
  white: "#F4F7FB",
  steel: "#A3B2C7",
  minor: "#F5C84B",
  significant: "#FF9447",
  critical: "#FF5468",
}

const fontDir = join(process.cwd(), "src/assets/og-fonts")
const textDir = join(process.cwd(), "src/assets/og-text")

// Bangla phrases pre-shaped by scripts/render-og-text.mjs (Satori can't shape Bangla itself).
type BnKey = "brand" | "tagline" | "bangla" | "fire" | "hartal" | "rally" | "blockade" | "jam" | "flood" | "air"
const bnManifest = JSON.parse(await readFile(join(textDir, "manifest.json"), "utf8")) as Record<BnKey, { width: number; height: number }>
const bnSrc = Object.fromEntries(
  await Promise.all(
    (Object.keys(bnManifest) as BnKey[]).map(async (k) => [
      k,
      `data:image/png;base64,${(await readFile(join(textDir, `${k}.png`))).toString("base64")}`,
    ]),
  ),
) as Record<BnKey, string>

function Bn({ k, scale = 1 }: { k: BnKey; scale?: number }) {
  const m = bnManifest[k]
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={bnSrc[k]} width={m.width * scale} height={m.height * scale} alt="" />
}

// Read once at module scope (predictable input) so the images can be prerendered at build time.
const [unbounded, sora, soraSemi, mono] = await Promise.all([
  readFile(join(fontDir, "Unbounded-Bold.ttf")),
  readFile(join(fontDir, "Sora-Regular.ttf")),
  readFile(join(fontDir, "Sora-SemiBold.ttf")),
  readFile(join(fontDir, "MartianMono-Regular.ttf")),
])

const FONTS = [
  { name: "Unbounded", data: unbounded, weight: 700 as const, style: "normal" as const },
  { name: "Sora", data: sora, weight: 400 as const, style: "normal" as const },
  { name: "Sora", data: soraSemi, weight: 600 as const, style: "normal" as const },
  { name: "Martian Mono", data: mono, weight: 400 as const, style: "normal" as const },
]

export function ogFonts() {
  return FONTS
}

function Mark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M5.9 14.87A15 15 0 0 1 34.1 14.87" stroke={C.blue} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12.21 15.5A9 9 0 0 1 27.79 15.5" stroke={C.teal} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 20L20 33" stroke={C.teal} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2.5 3" />
      <circle cx="20" cy="20" r="4.4" fill={C.teal} />
      <circle cx="5.9" cy="14.87" r="2.2" fill={C.blue} />
      <circle cx="34.1" cy="14.87" r="2.2" fill={C.blue} />
      <circle cx="20" cy="35.4" r="2.5" fill={C.white} />
    </svg>
  )
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <Mark size={58} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "Unbounded", fontSize: 30, letterSpacing: 7, color: C.white }}>SHONGKET</div>
        <div style={{ display: "flex", marginTop: 8 }}>
          <Bn k="brand" />
        </div>
      </div>
    </div>
  )
}

/** Radar with status-coloured nodes (decorative, right side). */
function Radar({ size = 470 }: { size?: number }) {
  const nodes: [number, number, string][] = [
    [150, 245, C.significant], [300, 130, C.teal], [110, 160, C.minor], [265, 330, C.critical],
    [235, 205, C.teal], [190, 60, C.blue], [330, 270, C.teal],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 400 400">
      <defs>
        <radialGradient id="g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.teal} stopOpacity="0.22" />
          <stop offset="100%" stopColor={C.teal} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="196" fill="url(#g)" />
      {[60, 110, 160, 196].map((r) => (
        <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={C.steel} strokeOpacity="0.22" strokeWidth="1.5" />
      ))}
      <line x1="4" y1="200" x2="396" y2="200" stroke={C.steel} strokeOpacity="0.16" />
      <line x1="200" y1="4" x2="200" y2="396" stroke={C.steel} strokeOpacity="0.16" />
      <path d="M200 200 L 396 200 A196 196 0 0 0 338.6 61.4 Z" fill={C.teal} fillOpacity="0.16" />
      <path d="M30 300 C 110 250, 150 330, 230 280 S 340 220, 380 250" fill="none" stroke={C.blue} strokeOpacity="0.45" strokeWidth="7" strokeLinecap="round" />
      {nodes.map(([x, y, c], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="18" fill={c} fillOpacity="0.18" />
          <circle cx={x} cy={y} r="8" fill={c} stroke={C.midnight} strokeWidth="4" />
        </g>
      ))}
    </svg>
  )
}

const frame = {
  width: "100%",
  height: "100%",
  display: "flex",
  position: "relative" as const,
  background: C.midnight,
  backgroundImage:
    "radial-gradient(circle at 82% 38%, rgba(32,214,194,0.20), transparent 42%), radial-gradient(circle at 0% 100%, rgba(87,155,255,0.20), transparent 45%)",
  color: C.white,
  fontFamily: "Sora",
}

function Grid() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        backgroundImage:
          "linear-gradient(rgba(163,178,199,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(163,178,199,0.07) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
      }}
    />
  )
}

export function HomeOg() {
  return (
    <div style={frame}>
      <Grid />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 60px 72px", width: 720 }}>
        <Brand />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Martian Mono", fontSize: 19, letterSpacing: 5, color: C.teal }}>REAL-WORLD INTELLIGENCE</div>
          <div style={{ fontFamily: "Unbounded", fontSize: 62, lineHeight: 1.08, marginTop: 20, letterSpacing: -1.5 }}>
            Understand the world around you.
          </div>
          <div style={{ display: "flex", marginTop: 22 }}>
            <Bn k="tagline" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["Live signals", "Verified", "Map-first", "bilingual"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 999,
                border: "1.5px solid rgba(163,178,199,0.28)",
                fontSize: 20,
                color: C.white,
              }}
            >
              {t === "bilingual" ? (
                <>
                  <Bn k="bangla" />
                  <div style={{ display: "flex" }}>+ English</div>
                </>
              ) : (
                t
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", position: "absolute", right: 30, top: 80 }}>
        <Radar size={470} />
      </div>
    </div>
  )
}

const INCIDENTS: [BnKey, string, string][] = [
  ["fire", "Fire", C.critical],
  ["hartal", "Hartal", C.significant],
  ["rally", "Rally", C.minor],
  ["blockade", "Blockade", C.significant],
  ["jam", "Traffic jam", C.minor],
  ["flood", "Flood", C.blue],
  ["air", "Air quality", C.teal],
]

export function LiveOg() {
  return (
    <div style={frame}>
      <Grid />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px 60px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Brand />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 22px",
              borderRadius: 999,
              background: "rgba(32,214,194,0.14)",
              color: C.teal,
              fontFamily: "Martian Mono",
              fontSize: 20,
              letterSpacing: 3,
            }}
          >
            <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, background: C.teal }} />
            LIVE MAP
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Unbounded", fontSize: 60, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 980 }}>
            What&apos;s happening around you — right now.
          </div>
          <div style={{ fontSize: 27, color: C.steel, marginTop: 18, maxWidth: 960 }}>
            Verified local signals from news, official hazard feeds, weather & community reports.
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {INCIDENTS.map(([bn, en, c]) => (
            <div
              key={en}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 18px",
                borderRadius: 999,
                background: "rgba(20,34,56,0.9)",
                border: "1.5px solid rgba(163,178,199,0.22)",
              }}
            >
              <div style={{ display: "flex", width: 12, height: 12, borderRadius: 999, background: c }} />
              <Bn k={bn} />
              <div style={{ fontSize: 19, color: C.steel }}>{en}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
