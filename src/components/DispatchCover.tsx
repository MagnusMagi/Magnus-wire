import { sectionLabel } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

// Üretilmiş tipografik kapak. Üçüncü taraf fotoğrafı yok → telif riski yok,
// dış istek yok, yükleme hatası yok. Uygun lisanslı fotoğraf bulunamadığında
// ve hassas haberlerde kullanılır (bkz DispatchPhoto).
//
// ⚠️ HTML/CSS, SVG DEĞİL. İlk sürüm SVG'ydi ve bu yüzden kapakta HABERİN
// BAŞLIĞI YOKTU: SVG <text> satır kaydırmaz, uzun başlığı kutuya sığdırmanın
// güvenilir yolu yok. Tipografik bir kapağın tipografisi olmayınca geriye
// yalnız bölüm etiketi ve dekor kalıyordu — her haber birbirinin aynısı
// görünüyordu. HTML'de başlık gerçek fontla (Fraunces) akıyor ve kırpılıyor.
//
// ⚠️ Ölçüler `cqw` (container query) biriminde: aynı bileşen 4/3 kartta da
// 16/9 manşette de kullanılıyor ve `vw` tabanlı ölçek kart boyutundan bağımsız
// olduğu için küçük kartta devasa, büyük manşette minik yazı üretiyordu.

const ACCENTS: Record<string, string> = {
  gundem: "#b93809", finans: "#1c6e68", "yapay-zeka": "#4c3a8f", yazilim: "#14524d",
  donanim: "#8a5a12", girisim: "#0f6a3c", bilim: "#2a5ea8", uzay: "#3b2f6b",
  kripto: "#8a6a0f", siber: "#96201f", savunma: "#4a4a3c", otomobil: "#7a3b1e",
  oyun: "#6b2a6b", spor: "#155e35", kultur: "#8a3a5a", tasarim: "#2f5d5a",
  yasam: "#6d5a2a",
};

// FNV-1a. Math.random KULLANILMAZ: kapak her render'da değişirse SSG çıktısı
// da değişir ve sayfa durduk yere yeniden yazılır.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function DispatchCover({
  slug, section, locale, title, ratio = "aspect-[4/3]",
}: {
  slug: string; section: string; locale: Locale; title?: string; ratio?: string;
}) {
  const h = hash(slug);
  const accent = ACCENTS[section] ?? "#1c6e68";
  const label = sectionLabel(section, locale);
  const variant = h % 3;

  // ⚠️ `>>>` ŞART, `>>` DEĞİL. hash() işaretsiz döndürüyor ama `>>` işaretli
  // kaydırma yapıyor: 2^31 üstü değerlerde sonuç negatif oluyor, negatif % 4
  // negatif kalıyor ve dizi indeksi `undefined` veriyor. Ölçüldü 2026-08-19:
  // 302 slug'ın 92'sinde açı `undefined` çıkıyordu → CSS
  // `repeating-linear-gradient(undefined deg, ...)` geçersiz → o kapaklarda
  // DOKU HİÇ ÇIKMIYORDU. Aralık da 5-8 yerine 2-8 aralığına kayıyordu.
  const angle = [12, 45, 78, 155][(h >>> 3) % 4];
  const gap = 5 + ((h >>> 6) % 4);

  // İki katmanlı yüzey: ince tarama çizgileri + geniş aralıklı ikinci tarama.
  // Tek katman düz bir tarama gibi duruyordu; ikincisi kağıt/baskı hissi veriyor.
  const texture: React.CSSProperties = {
    backgroundImage:
      `repeating-linear-gradient(${angle}deg, rgba(26,25,22,.13) 0 1px, transparent 1px ${gap}px),`
      + `repeating-linear-gradient(${angle + 90}deg, rgba(26,25,22,.06) 0 1px, transparent 1px ${gap * 3}px)`,
  };

  // Uzun başlık küçülür: sabit ölçekte 4 satırı aşan başlıklar kırpılıp
  // yarım cümle bırakıyordu. Kırpma yerine önce puntoyu düşür.
  const len = (title || "").length;
  const titleSize = len > 88 ? 5.9 : len > 62 ? 6.7 : len > 40 ? 7.4 : 8.4;

  return (
    <div
      className={`${ratio} relative overflow-hidden border border-line bg-paper`}
      style={{ containerType: "inline-size" }}
    >
      <div className="absolute inset-0" style={texture} aria-hidden />

      {/* Aksan alanı: varyanta göre üstte bant, solda kolon ya da arkada damga */}
      {variant === 0 && <div className="absolute inset-x-0 top-0" style={{ height: "34cqw", background: accent, opacity: 0.14 }} aria-hidden />}
      {variant === 1 && <div className="absolute inset-y-0 left-0" style={{ width: "30cqw", background: accent, opacity: 0.16 }} aria-hidden />}
      {variant === 2 && (
        // Damga SAĞ ALTTAN sol-üste taşındı: sağ altta alt bilgi şeridi
        // (MAGIWIRE + sinyal çubukları) var ve harf onların üstüne binip
        // kazara bir çakışma gibi duruyordu.
        <span aria-hidden className="absolute font-serif font-black leading-none select-none"
          style={{ left: "-4cqw", top: "-10cqw", fontSize: "62cqw", color: accent, opacity: 0.11 }}>
          {label.slice(0, 1).toUpperCase()}
        </span>
      )}

      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: "5.5cqw" }}>
        <div className="flex items-start justify-between" style={{ gap: "2cqw" }}>
          <span className="font-mono font-bold uppercase text-paper"
            style={{ background: accent, padding: "1.4cqw 2.6cqw", fontSize: "3.6cqw", letterSpacing: "0.14em" }}>
            {label}
          </span>
          <span aria-hidden style={{ width: "3.4cqw", height: "3.4cqw", background: accent, marginTop: "0.6cqw" }} />
        </div>

        {title && (
          <h3 className="font-serif font-black tracking-tight text-ink"
            style={{
              fontSize: `${titleSize}cqw`, lineHeight: 1.06, margin: 0,
              display: "-webkit-box", WebkitBoxOrient: "vertical",
              WebkitLineClamp: 4, overflow: "hidden",
              // Kırılamayan uzun token (paket adı, URL) kutuyu taşırmasın —
              // aynı hata Rail/Dispatch'te de yaşandı.
              overflowWrap: "anywhere",
            }}>
            {title}
          </h3>
        )}

        <div className="flex items-end justify-between" style={{ gap: "2cqw" }}>
          <span className="font-mono uppercase text-ink-3"
            style={{ fontSize: "2.9cqw", letterSpacing: "0.3em" }}>MAGIWIRE</span>
          <span aria-hidden className="flex items-end" style={{ gap: "0.7cqw", height: "6cqw" }}>
            {Array.from({ length: 7 }, (_, i) => {
              const v = (hash(`${slug}:${i}`) % 100) / 100;
              return <span key={i} style={{ width: "1.2cqw", height: `${18 + v * 82}%`, background: i % 3 === 0 ? accent : "#1a1916", opacity: i % 3 === 0 ? 0.85 : 0.22 }} />;
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
