import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Masthead rozeti: siyah (ink) kare içinde paper "WIRE".
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#1a1916", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#edebe4", fontSize: 44, fontWeight: 800, letterSpacing: 3, display: "flex" }}>WIRE</div>
      </div>
    ),
    { ...size },
  );
}
