import { ImageResponse } from "next/og";
import { getDispatch } from "@/lib/dispatches";
import { sectionLabel } from "@/lib/site";
import { isLocale, type Locale } from "@/lib/i18n";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MagiWire";

export default async function OgImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const d = await getDispatch(locale, slug);
  const title = (d?.title || "MagiWire").slice(0, 140);
  const section = d ? sectionLabel(d.section, locale).toUpperCase() : "DISPATCH";
  const region = d?.region ? sectionLabel(d.region, locale).toUpperCase() : "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#1a1916", color: "#edebe4", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 70 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 2 }}>Magi</div>
          <div style={{ display: "flex", background: "#edebe4", color: "#1a1916", fontSize: 22, fontWeight: 800, letterSpacing: 3, padding: "5px 13px" }}>WIRE</div>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 78 ? 50 : 62, fontWeight: 800, lineHeight: 1.08, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 25, fontWeight: 700, letterSpacing: 2 }}>
          <span style={{ display: "flex", color: "#d2400c" }}>{section}</span>
          {region ? <span style={{ display: "flex", color: "#1c6e68" }}>· {region}</span> : <span />}
        </div>
      </div>
    ),
    { ...size },
  );
}
