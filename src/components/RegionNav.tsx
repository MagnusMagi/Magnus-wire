"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { REGIONS } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

/**
 * Bölge bağlantıları (Türkiye, Estonya, Avrupa, ABD, Dünya).
 *
 * Eskiden CatNav'ın sonundaydı; konu sayısı 11'den 19'a çıkınca yatay kaydırma
 * çubuğunda ekran dışına itildiler ve pratikte görünmez oldular. Topbar'a
 * taşındılar — burada sabit ve her sayfada görünürler.
 *
 * Aktif bölge pathname'den okunuyor (Topbar sunucu bileşeni ve aktif slug'ı
 * bilmiyor; LocaleSwitcher de aynı deseni kullanıyor).
 */
export function RegionNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() || "/";
  const active = pathname.split("/")[2] ?? "";

  return (
    <nav
      aria-label="regions"
      className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {REGIONS.map((r) => {
        const isActive = r.slug === active;
        return (
          <Link
            key={r.slug}
            href={`/${locale}/${r.slug}`}
            aria-current={isActive ? "page" : undefined}
            className={`whitespace-nowrap ${isActive ? "text-signal font-bold" : "hover:text-white"}`}
          >
            {r.label[locale]}
          </Link>
        );
      })}
    </nav>
  );
}
