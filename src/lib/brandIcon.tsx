import { ImageResponse } from "next/og";

// Marka ikonunun tek kaynağı. apple-icon ve manifest'in 192/512/maskable
// ikonları buradan üretiliyor — üç ayrı yerde kopyalanmasın diye.
//
// ⚠️ next/og (Satori) SVG RENDER ETMEZ; düz metin div'leri render eder.
// Bu yüzden logo SVG olarak değil, div kompozisyonu olarak kuruluyor.

export const BRAND = { paper: "#edebe4", ink: "#1a1916" } as const;

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

/**
 * @param px    kare kenar uzunluğu
 * @param scale logonun kapladığı oran. Maskable ikonlarda Android ikonu daire/
 *              yuvarlak kareye kırptığı için içerik merkezdeki %80'lik güvenli
 *              alanda kalmalı → 0.62 gibi küçük bir değer verilir.
 */
export async function brandIcon(px: number, scale = 0.82): Promise<ImageResponse> {
  const font = await fraunces();
  const unit = px * scale;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BRAND.paper,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: unit * 0.07,
        }}
      >
        <div
          style={{
            color: BRAND.ink,
            fontSize: unit * 0.3,
            fontWeight: 900,
            letterSpacing: -unit * 0.007,
            lineHeight: 1,
            fontFamily: font ? "Fraunces" : "serif",
            display: "flex",
          }}
        >
          Magnus
        </div>
        <div
          style={{
            background: BRAND.ink,
            color: BRAND.paper,
            fontSize: unit * 0.175,
            fontWeight: 800,
            letterSpacing: unit * 0.04,
            padding: `${unit * 0.04}px ${unit * 0.08}px ${unit * 0.055}px ${unit * 0.12}px`,
            display: "flex",
          }}
        >
          WIRE
        </div>
      </div>
    ),
    {
      width: px,
      height: px,
      fonts: font ? [{ name: "Fraunces", data: font, weight: 900, style: "normal" }] : undefined,
    },
  );
}
