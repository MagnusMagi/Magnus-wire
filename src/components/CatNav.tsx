import Link from "next/link";
import { TOPICS, REGIONS } from "@/lib/site";
import { t, type Locale } from "@/lib/i18n";

export function CatNav({ locale, active = "akis" }: { locale: Locale; active?: string }) {
  const item = (slug: string, label: string) => {
    const isActive = slug === active;
    const href = slug === "akis" ? `/${locale}` : `/${locale}/${slug}`;
    return (
      <li key={slug} className="flex-none">
        <Link href={href}
          className={`block px-[15px] py-3 text-xs font-bold tracking-wider uppercase whitespace-nowrap border-b-[3px] -mb-[2px] transition-colors ${
            isActive ? "text-ink border-signal" : "text-ink-2 border-transparent hover:text-ink hover:border-signal"
          }`}>{label}</Link>
      </li>
    );
  };
  return (
    <nav aria-label="sections" className="border-b-2 border-ink sticky top-0 z-30 bg-paper">
      {/* Kaydırma kutusu padding'i İÇERİDE — sağa kaydırınca son öğe (ABD) kırpılmaz.
          Her öğe flex-none; sona ek boşluk için trailing spacer. */}
      <ul className="mx-auto max-w-[1240px] flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6">
        {item("akis", t(locale, "feed"))}
        {TOPICS.map((s) => item(s.slug, s.label[locale]))}
        <li aria-hidden className="flex-none px-2 text-line">|</li>
        {REGIONS.map((s) => item(s.slug, s.label[locale]))}
        <li aria-hidden className="flex-none w-3" />
      </ul>
    </nav>
  );
}
