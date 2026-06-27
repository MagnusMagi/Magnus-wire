import Link from "next/link";
import type { Metadata } from "next";
import { CatNav } from "@/components/CatNav";
import { dispatchesBySourceHost } from "@/lib/dispatches";
import { sectionLabel } from "@/lib/site";
import { isLocale, t, type Locale } from "@/lib/i18n";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; host: string }> }): Promise<Metadata> {
  const { locale: raw, host } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  return { title: `${decodeURIComponent(host)} — ${t(locale, "source")}`, robots: { index: false } };
}

export default async function SourcePage({ params }: { params: Promise<{ locale: string; host: string }> }) {
  const { locale: raw, host: rawHost } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const host = decodeURIComponent(rawHost);
  const items = await dispatchesBySourceHost(locale, host, 60);
  return (
    <>
      <CatNav locale={locale} active="kaynak" />
      <main className="mx-auto max-w-[920px] px-6 pt-9 pb-20">
        <header className="border-b-2 border-ink pb-4 mb-1 flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`} alt="" width={30} height={30} className="rounded-[3px]" />
          <div className="min-w-0">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-signal">{t(locale, "source")}</span>
            <h1 className="font-serif font-black tracking-tight text-[clamp(26px,1.5rem+2vw,44px)] leading-none mt-0.5 break-words">{host}</h1>
          </div>
        </header>
        <p className="font-mono text-[12.5px] text-ink-3 mt-2.5 mb-6">{items.length} {t(locale, "resultsFor")}</p>
        {items.length === 0 ? <p className="font-mono text-ink-2 py-16">{t(locale, "noResults")}</p> : (
          <ul className="m-0 p-0 list-none">
            {items.map((d) => (
              <li key={d.slug} className="flex items-baseline gap-3 sm:gap-5 py-3 border-b border-line/70">
                <span className="font-mono text-[12px] text-ink-3 shrink-0 w-[42px] tabular-nums pt-[3px]">{d.time.slice(0, 5)}</span>
                <span className="hidden sm:block font-mono text-[10px] font-bold uppercase tracking-widest text-wire shrink-0 w-[84px] truncate pt-[5px]">{sectionLabel(d.section, locale)}</span>
                <h3 className="min-w-0 flex-1 font-serif text-[18px] sm:text-[20px] leading-snug font-semibold tracking-tight m-0">
                  <Link href={`/${locale}/dispatch/${d.slug}`} className="hover:text-signal transition-colors">{d.title}</Link>
                </h3>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
