import { DispatchCover } from "./DispatchCover";
import { t, type Locale } from "@/lib/i18n";
import type { HeroCredit } from "@/lib/dispatches";

// Temsili görsel + ZORUNLU atıf.
//
// ⚠️ Kredi süs değil, LİSANS ŞARTI: kullandığımız CC-BY / CC-BY-SA görselleri
// fotoğrafçı adı, lisans ve kaynak bağlantısı olmadan yayımlamak lisansı ihlal
// eder. Bu yüzden kredi bileşenin ayrılmaz parçası — görsel varsa kredi de var.
// Eski sürümde kredi CDN alan adını yazıyordu ("Foto: cdn.futurecdn.net"), yani
// atıf gibi görünen ama hiçbir hak sahibini göstermeyen bir satırdı.
//
// ⚠️ "Temsili" ibaresi de zorunlu: fotoğraf haberin kendisinden DEĞİL, bölüme
// göre seçilmiş jenerik bir sahne. Okuyucu onu olayın fotoğrafı sanmamalı.
//
// Görsel yoksa (hassas haber ya da uygun lisanslı sonuç bulunamadı) üretilmiş
// kapağa düşülür — sayfa hiçbir zaman boş kalmaz.
// ⚠️ İki kaynak lisansı FARKLI biçimde yazıyor: Openverse kısa kod veriyor
// ("by-sa", "cc0"), Wikimedia insan-okur etiket ("CC BY-SA 4.0", "Public
// domain"). Başına koşulsuz "CC" eklemek Wikimedia'da "CC CC BY-SA 4.0"
// üretiyordu. Zaten okunur olanı olduğu gibi bırak, kısa kodu genişlet.
function licenseLabel(license: string): string {
  const l = String(license || "").trim();
  if (!l) return "";
  if (/\s/.test(l) || /^public domain$/i.test(l)) return l;   // Wikimedia etiketi
  if (l.toLowerCase() === "cc0") return "CC0";
  if (l.toLowerCase() === "pdm") return "Public domain";
  return `CC ${l.toUpperCase()}`;                              // by → CC BY
}

export function DispatchPhoto({
  hero, heroCredit, slug, section, locale, title, ratio = "aspect-[4/3]",
}: {
  hero?: string | null; heroCredit?: HeroCredit | null;
  slug: string; section: string; locale: Locale; title?: string; ratio?: string;
}) {
  if (!hero) return <DispatchCover slug={slug} section={section} locale={locale} title={title} ratio={ratio} />;

  const c = heroCredit;
  return (
    <figure className="m-0">
      <div className={`${ratio} overflow-hidden border border-line bg-panel`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/img?u=${encodeURIComponent(hero)}`}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
      <figcaption className="font-mono text-[10.5px] text-ink-3 mt-1.5 leading-snug break-words">
        <span className="uppercase tracking-wide text-ink-2">{t(locale, "photoIllustrative")}</span>
        {c && (
          <>
            {" · "}
            {c.sourceUrl ? (
              <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-wire underline-offset-2 hover:underline">
                {c.creator}
              </a>
            ) : c.creator}
            {c.licenseUrl && (
              <>
                {" · "}
                <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer nofollow license" className="hover:text-wire underline-offset-2 hover:underline">
                  {licenseLabel(c.license)}
                </a>
              </>
            )}
          </>
        )}
      </figcaption>
    </figure>
  );
}
