import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B1220" }}>
        <svg width="132" height="132" viewBox="0 0 40 40" fill="none">
          <path d="M5.9 14.87A15 15 0 0 1 34.1 14.87" stroke="#579BFF" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M12.21 15.5A9 9 0 0 1 27.79 15.5" stroke="#20D6C2" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M20 20L20 33" stroke="#20D6C2" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2.5 3" />
          <circle cx="20" cy="20" r="4.4" fill="#20D6C2" />
          <circle cx="5.9" cy="14.87" r="2.2" fill="#579BFF" />
          <circle cx="34.1" cy="14.87" r="2.2" fill="#579BFF" />
          <circle cx="20" cy="35.4" r="2.5" fill="#F4F7FB" />
        </svg>
      </div>
    ),
    size,
  )
}
