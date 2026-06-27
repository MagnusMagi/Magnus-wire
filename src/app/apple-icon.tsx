import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Masthead logosunun aynısı: paper zemin üzerinde serif "Magnus" + ink kare
// içinde paper "WIRE" rozeti. Fraunces TTF Google Fonts'tan çekilir (başarısızsa
// varsayılan serif ile basılır).
async function fraunces(): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,900", {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:1.0)" },
      })
    ).text();
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?(?:truetype|opentype)['"]?\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

export default async function AppleIcon() {
  const font = await fraunces();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#edebe4",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            color: "#1a1916",
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: -1,
            lineHeight: 1,
            fontFamily: font ? "Fraunces" : "serif",
            display: "flex",
          }}
        >
          Magnus
        </div>
        <div
          style={{
            background: "#1a1916",
            color: "#edebe4",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: 6,
            padding: "6px 12px 8px 18px",
            display: "flex",
          }}
        >
          WIRE
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "Fraunces", data: font, weight: 900, style: "normal" }] : undefined,
    },
  );
}
