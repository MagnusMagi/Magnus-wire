import Link from "next/link";
import { NEWS_TOPICS, REGIONS, DASHBOARDS, EXTRA_PANELS } from "@/lib/site";
import { t, type Locale } from "@/lib/i18n";

/**
 * İki katmanlı bölüm navigasyonu.
 *
 * Tek satırda 19 konu + 5 bölge + 3 pano = 27 öğe ~1900px ediyordu; 1240px'lik
 * kapsayıcıda yarısı ekran dışında kalıyordu. Bölgeleri topbar'a taşımak ise
 * onları 11.5px düz metin bağlantı yığınına çevirdi — navigasyon gibi
 * okunmuyordu. Çözüm: iki katman, her katman etiketli.
 *
 *   Üst satır  → haber kategorileri (birincil, kalın, alt-çizgi vurgulu)
 *   Alt satır  → BÖLGE ve PANO grupları (ikincil, etiketli, panel zemin)
 */
export function CatNav({ locale, active = "akis" }: { locale: Locale; active?: string }) {
  const topic = (slug: string, label: string) => {
    const isActive = slug === active;
    const href = slug === "akis" ? `/${locale}` : `/${locale}/${slug}`;
    return (
      <li key={slug} className="flex-none">
        <Link
          href={href}
          aria-current={isActive ? "page" : undefined}
          className={`block px-[10px] py-3 text-xs font-bold tracking-wider uppercase whitespace-nowrap border-b-[3px] -mb-[2px] transition-colors ${
            isActive ? "text-ink border-signal" : "text-ink-2 border-transparent hover:text-ink hover:border-signal"
          }`}
        >
          {label}
        </Link>
      </li>
    );
  };

  const chip = (slug: string, label: string) => {
    const isActive = slug === active;
    return (
      <li key={slug} className="flex-none">
        <Link
          href={`/${locale}/${slug}`}
          aria-current={isActive ? "page" : undefined}
          className={`block px-2 py-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap border transition-colors ${
            isActive
              ? "border-signal text-signal font-bold"
              : "border-line text-ink-2 hover:border-ink hover:text-ink"
          }`}
        >
          {label}
        </Link>
      </li>
    );
  };

  // Grup başlığı: alt satırın "bağlantı çorbası" gibi okunmasını engelliyor.
  const groupLabel = (text: string) => (
    <li aria-hidden className="flex-none text-xs font-bold uppercase tracking-wider text-wire pr-0.5">
      {text}
    </li>
  );

  return (
    <nav aria-label="sections" className="sticky top-0 z-30 bg-paper border-b-2 border-ink">
      {/* Üst katman: haber kategorileri.

          ⚠️ `pb-[2px] -mb-[2px]` süs değil, iki kusuru birden kapatıyor.
          `overflow-x: auto` diğer ekseni de `auto`'ya hesaplatır (bir eksen
          `visible` değilse öteki `visible` kalamaz), yani bu ray İKİ eksende
          birden scroll container. Bağlantıların `-mb-[2px]`'i 3px'lik aktif
          çizgiyi content box'ın 2px dışına taşıyordu:

            • scrollHeight 43 / clientHeight 41 → parmakla 2px DİKEY kaydırma.
              Fareyle görünmez; telefonda ilk hissedilen şey ve kullanıcı
              tam bunu bildirdi.
            • overflow padding box'ta kırptığı için aktif çizginin 3px'inin
              yalnız 1px'i boyanıyordu — her sayfada, masaüstünde de.

          Padding çizgiyi padding box'ın İÇİNE alır, negatif margin dış
          yüksekliği korur: nav 82px, main üst kenarı 242px — önce/sonra aynı.
          Aynı hata MagnusGeo nav'ında 13px olarak yaşandı; oradaki çare de
          buydu. Bekçi: e2e/nav.spec.ts. */}
      <ul className="mx-auto max-w-[1240px] flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6 pb-[2px] -mb-[2px]">
        {topic("akis", t(locale, "feed"))}
        {NEWS_TOPICS.map((s) => topic(s.slug, s.label[locale]))}
        <li aria-hidden className="flex-none w-3" />
      </ul>

      {/* Alt katman: bölgeler + canlı panolar. Panel zemin ve ince üst çizgi
          iki katmanı görsel olarak ayırıyor. */}
      <div className="border-t border-line bg-panel/70">
        <ul className="mx-auto max-w-[1240px] flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6 py-1.5">
          {groupLabel(t(locale, "regionsLabel"))}
          {REGIONS.map((r) => chip(r.slug, r.label[locale]))}
          <li aria-hidden className="flex-none w-2" />
          {groupLabel(t(locale, "panelsLabel"))}
          {[...DASHBOARDS, ...EXTRA_PANELS].map((d) => chip(d.slug, d.label[locale]))}
          <li aria-hidden className="flex-none w-3" />
        </ul>
      </div>
    </nav>
  );
}
