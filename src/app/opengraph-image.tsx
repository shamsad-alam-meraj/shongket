import { ImageResponse } from "next/og"

export const alt = "SHONGKET — Understand the world around you."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: 72, background: "#0B1220", color: "#F4F7FB",
          backgroundImage: "radial-gradient(circle at 78% 30%, rgba(32,214,194,0.28), transparent 45%), radial-gradient(circle at 10% 100%, rgba(87,155,255,0.22), transparent 40%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 40 40" fill="none">
            <path d="M5.9 14.87A15 15 0 0 1 34.1 14.87" stroke="#579BFF" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M12.21 15.5A9 9 0 0 1 27.79 15.5" stroke="#20D6C2" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M20 20L20 33" stroke="#20D6C2" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2.5 3" />
            <circle cx="20" cy="20" r="4.4" fill="#20D6C2" />
            <circle cx="5.9" cy="14.87" r="2.2" fill="#579BFF" />
            <circle cx="34.1" cy="14.87" r="2.2" fill="#579BFF" />
            <circle cx="20" cy="35.4" r="2.5" fill="#F4F7FB" />
          </svg>
          <div style={{ fontSize: 34, letterSpacing: 8, fontWeight: 700 }}>SHONGKET</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, letterSpacing: 6, color: "#20D6C2", textTransform: "uppercase" }}>Real-world intelligence</div>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.02, marginTop: 18, letterSpacing: -2 }}>Understand the world around you.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#A3B2C7" }}>
          <span>Live signals · Verified · Mapped</span>
          <span>Bangladesh-born · Built for the world</span>
        </div>
      </div>
    ),
    size,
  )
}
