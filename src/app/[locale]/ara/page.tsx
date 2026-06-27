import Link from "next/link";
import type { Metadata } from "next";
import { CatNav } from "@/components/CatNav";
import { SourceLink } from "@/components/SourceLink";
import { searchDispatches } from "@/lib/dispatches";
import { sectionLabel } from "@/lib/site";
import { t, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  return { title: t(locale, "searchTitle") };
}

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; tag?: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const tag = (sp.tag || "").trim();
  const term = tag ? `#${tag}` : q;
  const hasQuery = Boolean(q || tag);
  const results = hasQuery ? await searchDispatches(locale, { q, tag }) : [];

  return (
    <>
      <CatNav locale={locale} active="ara" />
      <main className="mx-auto max-w-[920px] px-6 pt-9 pb-20">
        <header className="border-b-2 border-ink pb-4 mb-1">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-signal">{t(locale, "searchTitle")}</span>
          <h1 className="font-serif font-black tracking-tight text-[clamp(28px,1.6rem+2vw,48px)] leading-[0.98] mt-1 break-words">{term || t(locale, "searchTitle")}</h1>
          {hasQuery && <p className="font-mono text-[12.5px] text-ink-3 mt-2.5">{results.length} {t(locale, "resultsFor")}</p>}
        </header>

        {hasQuery && results.length === 0 ? (
          <p className="font-mono text-ink-2 py-16">{t(locale, "noResults")}</p>
        ) : (
          <ul className="m-0 p-0 list-none mt-6">
            {results.map((d) => (
              <li key={d.slug} className="flex items-baseline gap-3 sm:gap-5 py-3 border-b border-line/70">
                <span className="font-mono text-[12px] text-ink-3 shrink-0 w-[42px] tabular-nums pt-[3px]">{d.time.slice(0, 5)}</span>
                <span className="hidden sm:block font-mono text-[10px] font-bold uppercase tracking-widest text-wire shrink-0 w-[84px] truncate pt-[5px]">{sectionLabel(d.section, locale)}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-[18px] sm:text-[20px] leading-snug font-semibold tracking-tight m-0">
                    <Link href={`/${locale}/dispatch/${d.slug}`} className="hover:text-signal transition-colors">{d.title}</Link>
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                    <span className="sm:hidden font-mono text-[10px] font-bold uppercase tracking-widest text-wire">{sectionLabel(d.section, locale)}</span>
                    <SourceLink url={d.sourceUrl} name={d.sourceName} locale={locale} compact />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
