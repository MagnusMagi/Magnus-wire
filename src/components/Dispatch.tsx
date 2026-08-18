import Link from "next/link";
import type { Dispatch as D } from "@/lib/dispatches";
import { sectionLabel } from "@/lib/site";
import { SourceLink } from "./SourceLink";
import type { Locale } from "@/lib/i18n";

export function Dispatch({ d, ago, index, locale }: { d: D; ago: string; index: number; locale: Locale }) {
  const hhmm = d.time.slice(0, 5);
  return (
    <li className="grid grid-cols-[60px_minmax(0,1fr)] sm:grid-cols-[76px_minmax(0,1fr)] gap-3 sm:gap-[22px] py-[22px] wire-printin border-b border-dotted border-line last:border-0"
        style={{ animationDelay: `${60 + index * 80}ms` }}>
      <div className="text-right pt-1 font-mono text-xs text-ink-2 whitespace-nowrap">
        {hhmm}<span className="block text-[10px] text-ink-3 mt-0.5">{ago}</span>
      </div>
      <div className="relative pl-[26px] border-l border-line">
        <span className={`absolute -left-[5px] top-[6px] w-[9px] h-[9px] rounded-full border-2 ${d.live ? "bg-signal border-signal wire-pulse" : "bg-paper border-wire"}`} aria-hidden />
        <span className={`font-mono text-[11px] font-bold tracking-widest uppercase ${d.live ? "text-signal" : "text-wire"}`}>
          {sectionLabel(d.section, locale)}{d.region ? ` · ${sectionLabel(d.region, locale)}` : ""}
        </span>
        {/* ⚠️ `break-words` ŞART: sütun minmax(0,1fr) ile küçülebiliyor ama
            kırılamayan tek bir uzun token (paket adı, uzun URL — teknoloji
            haberlerinde sık) yine de kutuyu aşıyor. Ölçüldü 2026-08-18:
            "Microsoft.FeatureManagement.AspNetCore" 320px ekranda başlığı
            327px'e çıkarıp viewport dışına taşırıyordu; html'deki
            `overflow-x: clip` bunu gizlediği için gözle de fark edilmiyordu. */}
        <h2 className="font-serif text-[23px] leading-tight font-semibold tracking-tight my-[6px] break-words">
          <Link href={`/${locale}/dispatch/${d.slug}`} className="hover:text-signal">{d.title}</Link>
        </h2>
        <p className="text-ink-2 text-[13.5px] m-0 max-w-[60ch]">{d.summary}</p>
        <SourceLink url={d.sourceUrl} name={d.sourceName} locale={locale} compact />
      </div>
    </li>
  );
}
