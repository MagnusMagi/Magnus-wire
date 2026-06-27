import Link from "next/link";
import { TOPICS, REGIONS } from "@/lib/site";
import { t, type Locale } from "@/lib/i18n";

export function CatNav({ locale, active = "akis" }: { locale: Locale; active?: string }) {
  const item = (slug: string, label: string) => {
    const isActive = slug === active;
    const href = slug === "akis" ? `/${locale}` : `/${locale}/${slug}`;
    return (
      <li key={slug}>
        <Link href={href}
          className={`block px-[15px] py-3 text-xs font-bold tracking-wider uppercase whitespace-nowrap border-b-[3px] -mb-[2px] transition-colors ${
            isActive ? "text-ink border-signal" : "text-ink-2 border-transparent hover:text-ink hover:border-signal"
          }`}>{label}</Link>
      </li>
    );
  };
  return (
    <nav aria-label="sections" className="border-b-2 border-ink sticky top-0 z-30 bg-paper">
      <div className="mx-auto max-w-[1240px] px-6">
        <ul className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden items-center">
          {item("akis", t(locale, "feed"))}
          {TOPICS.map((s) => item(s.slug, s.label[locale]))}
          <li aria-hidden className="px-2 text-line">|</li>
          {REGIONS.map((s) => item(s.slug, s.label[locale]))}
        </ul>
      </div>
    </nav>
  );
}
