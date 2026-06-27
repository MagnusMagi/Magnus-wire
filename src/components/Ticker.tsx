import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";

export function Ticker({ items, locale }: { items: { title: string; slug: string }[]; locale: Locale }) {
  const list = items.length ? [...items, ...items] : [];
  return (
    <div className="wire-ticker bg-ink border-t border-[#2a2823] text-paper overflow-hidden flex items-stretch text-xs tracking-wide">
      <span className="flex-none flex items-center gap-2 bg-signal text-white px-3.5 font-bold uppercase tracking-widest whitespace-nowrap">
        <span className="w-[7px] h-[7px] rounded-full bg-white wire-pulse" />
        {t(locale, "breaking")}
      </span>
      <div className="overflow-hidden relative flex-1 flex items-center">
        <div className="wire-marquee inline-flex whitespace-nowrap py-[7px]">
          {list.map((it, i) => (
            <Link key={i} href={`/${locale}/dispatch/${it.slug}`} className="px-[26px] relative hover:text-signal transition-colors">
              <span className="text-signal mr-3.5">▸</span>{it.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
