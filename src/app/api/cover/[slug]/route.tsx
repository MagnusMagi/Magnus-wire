import { ImageResponse } from "next/og";
import { getDispatch } from "@/lib/dispatches";
import { sectionLabel } from "@/lib/site";

export const runtime = "nodejs";
// Kapak yalnız slug + bölümden türer, yani içerik değişmedikçe değişmez.
export const revalidate = 86400;

// Sosyal paylaşım kapağı. Sayfadaki kapak satır içi SVG (DispatchCover) ama
// WhatsApp/X/Facebook tarayıcıları SVG'yi güvenilir biçimde işlemez — bu rota
// aynı görsel dili PNG olarak üretir. Üçüncü taraf fotoğrafı YOK.
const ACCENTS: Record<string, string> = {
  gundem: "#b93809", finans: "#1c6e68", "yapay-zeka": "#4c3a8f", yazilim: "#14524d",
  donanim: "#8a5a12", girisim: "#0f6a3c", bilim: "#2a5ea8", uzay: "#3b2f6b",
  kripto: "#8a6a0f", siber: "#96201f", savunma: "#4a4a3c", otomobil: "#7a3b1e",
  oyun: "#6b2a6b", spor: "#155e35", kultur: "#8a3a5a", tasarim: "#2f5d5a",
  yasam: "#6d5a2a",
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getDispatch("tr", slug);
  if (!d) return new Response("not found", { status: 404 });

  const accent = ACCENTS[d.section] ?? "#1c6e68";
  const label = sectionLabel(d.section, "tr").toUpperCase();

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: "#edebe4", color: "#1a1916", padding: 64, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ background: accent, color: "#edebe4", padding: "10px 20px",
            fontSize: 26, fontWeight: 700, letterSpacing: 3 }}>{label}</div>
          <div style={{ height: 3, flex: 1, background: "#1a1916", opacity: 0.85 }} />
        </div>
        {/* Başlık kırpılır: Satori'de satır sayısını sınırlamanın güvenilir yolu bu */}
        <div style={{ display: "flex", fontSize: 58, fontWeight: 700, lineHeight: 1.15, maxWidth: 1000 }}>
          {d.title.slice(0, 120)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, opacity: 0.55 }}>MAGIWIRE</div>
          <div style={{ display: "flex", width: 26, height: 26, background: accent }} />
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
