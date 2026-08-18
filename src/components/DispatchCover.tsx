import { sectionLabel } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

// Üretilmiş kapak. Üçüncü taraf fotoğrafı YOK — ne telif riski ne de dış istek.
//
// Neden: hero görselleri yayıncı CDN'lerinden alınıp /api/img üzerinden KENDİ
// alan adımızdan kopya olarak servis ediliyordu. Ölçüm 2026-08-18: 272 görselin
// 11'i URL'sinde adı geçen ajans işi (Getty), kalan 261'inin lisansı ise
// bilinmiyordu — yayıncı CDN'i lisansı göstermez. Ayrıca kredi satırı gerçek
// hak sahibini değil CDN alan adını yazıyordu ("Foto: cdn.mos.cms.futurecdn.net"),
// yani atıf da yanlıştı. Bu bileşen sorunu kaynağında bitirir.
//
// Tamamı satır içi SVG: ağ isteği, önbellek katmanı ve yükleme hatası yok.
// Desen slug'dan DETERMİNİSTİK üretilir — aynı haber her zaman aynı kapağı alır
// (build'ler ve sunucular arasında da), ama liste sayfasında kartlar birbirinin
// kopyası görünmez.

// Bölüm rengi SABİT: okuyucu zamanla bölümü renginden tanısın. Değerler
// globals.css token'larının hex karşılığı — SVG içinde var() güvenilir değil.
const INK = "#1a1916";
const PAPER = "#edebe4";
const PANEL = "#e4e1d8";
const ACCENTS: Record<string, string> = {
  gundem: "#b93809", finans: "#1c6e68", "yapay-zeka": "#4c3a8f", yazilim: "#14524d",
  donanim: "#8a5a12", girisim: "#0f6a3c", bilim: "#2a5ea8", uzay: "#3b2f6b",
  kripto: "#8a6a0f", siber: "#96201f", savunma: "#4a4a3c", otomobil: "#7a3b1e",
  oyun: "#6b2a6b", spor: "#155e35", kultur: "#8a3a5a", tasarim: "#2f5d5a",
  yasam: "#6d5a2a",
};

// FNV-1a: kısa, bağımlılıksız, platformdan bağımsız. Math.random KULLANILMAZ —
// kapak her render'da değişirse SSG çıktısı da değişir.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function DispatchCover({
  slug, section, locale, ratio = "aspect-[4/3]", label,
}: {
  slug: string; section: string; locale: Locale; ratio?: string; label?: string;
}) {
  const h = hash(slug);
  const accent = ACCENTS[section] ?? "#1c6e68";
  const text = label ?? sectionLabel(section, locale);

  // Telgraf/tel çağrışımı: yükseklikleri slug'dan türeyen dikey çubuk dizisi.
  const bars = Array.from({ length: 28 }, (_, i) => {
    const v = (hash(`${slug}:${i}`) % 1000) / 1000;
    return 12 + v * 76;                        // 12..88 (yüzde)
  });
  const rot = (h % 4) * 90;                     // desen yönü 4 varyant
  const dense = (h >> 5) % 3;                   // çizgi sıklığı 3 varyant

  return (
    <div className={`${ratio} overflow-hidden border border-line bg-panel relative`} aria-hidden>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
        <defs>
          <pattern id={`g-${h}`} width={6 + dense * 4} height={6 + dense * 4}
            patternUnits="userSpaceOnUse" patternTransform={`rotate(${rot})`}>
            <line x1="0" y1="0" x2="0" y2={6 + dense * 4} stroke={INK} strokeWidth="0.6" opacity="0.14" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill={PAPER} />
        <rect width="400" height="300" fill={`url(#g-${h})`} />
        {/* Sinyal çubukları — alt kenarda oturur, kapağı "canlı tel" hissine bağlar */}
        <g>
          {bars.map((b, i) => (
            <rect key={i} x={8 + i * 14} y={300 - (b * 1.7)} width="7" height={b * 1.7}
              fill={i % 5 === 0 ? accent : INK} opacity={i % 5 === 0 ? 0.9 : 0.13} />
          ))}
        </g>
        {/* Aksan bandı + bölüm etiketi */}
        <rect x="0" y="30" width="132" height="34" fill={accent} />
        <text x="14" y="53" fill={PAPER} fontFamily="ui-monospace, monospace"
          fontSize="15" fontWeight="700" letterSpacing="2.2">
          {text.toUpperCase().slice(0, 11)}
        </text>
        <rect x="0" y="76" width="400" height="1.6" fill={INK} opacity="0.85" />
        <text x="14" y="286" fill={INK} fontFamily="ui-monospace, monospace"
          fontSize="11" fontWeight="700" letterSpacing="3" opacity="0.5">
          MAGIWIRE
        </text>
        <rect x="360" y="24" width="26" height="26" fill="none" stroke={INK} strokeWidth="1.4" opacity="0.5" />
        <circle cx="373" cy="37" r="5" fill={accent} />
        <rect x="0" y="0" width="400" height="300" fill="none" stroke={PANEL} strokeWidth="0" />
      </svg>
    </div>
  );
}
