import Link from "next/link";
import type { Metadata } from "next";
import { CatNav } from "@/components/CatNav";
import { Dispatch } from "@/components/Dispatch";
import { conflictSummary, dispatchesByConflict, agoLabel, latestTs } from "@/lib/dispatches";
import { CONFLICTS } from "@/lib/site";
import { LOCALES, t, isLocale, type Locale } from "@/lib/i18n";
import { SITE_URL, altLanguages } from "@/lib/seo";

export const revalidate = 1800;
export function generateStaticParams() { return LOCALES.map((locale) => ({ locale })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  return {
    title: t(locale, "warTitle"),
    description: t(locale, "warSub"),
    alternates: { canonical: `${SITE_URL}/${locale}/savas`, languages: altLanguages("/savas") },
  };
}

export default async function WarHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;

  // Tek sorgu tüm cepheleri özetler; ayrıca en yeni teller ortak listede.
  const summary = await conflictSummary(locale);
  const lists = await Promise.all(CONFLICTS.map((c) => dispatchesByConflict(locale, c.slug, 12)));
  const latest = lists.flat().sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 20);
  const anchor = latestTs(latest);

  return (
    <>
      <CatNav locale={locale} active="savas" />
      <main className="mx-auto w-full max-w-[1240px] px-6 pt-9 pb-18">
        <header className="border-b-2 border-ink pb-4 mb-6">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-signal">{t(locale, "warKicker")}</span>
          <h1 className="font-serif text-[clamp(32px,1.8rem+2vw,48px)] font-black tracking-tight leading-none mt-2">{t(locale, "warTitle")}</h1>
          <p className="font-mono text-[12.5px] text-ink-2 mt-3 max-w-xl">{t(locale, "warSub")}</p>
        </header>

        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-wire border-b border-line pb-2 mb-4">
          {t(locale, "warAllFronts")}
        </h2>
        {/* ⚠️ grid-cols-1 tabanı ŞART — yalnız md:grid-cols-2 yazılırsa mobilde
            grid sütun tanımı almaz, örtük `auto` sütun max-content'e şişer ve
            html'deki `overflow-x: clip` yüzünden içerik sessizce kırpılır. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {CONFLICTS.map((c) => {
            const s = summary[c.slug];
            return (
              <Link key={c.slug} href={`/${locale}/savas/${c.slug}`}
                className="group block min-w-0 border-2 border-ink bg-panel/40 p-5 hover:bg-panel transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wire">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-serif text-[22px] font-black tracking-tight leading-none min-w-0 truncate">{c.label[locale]}</h3>
                  <span className="flex-none font-mono text-[10.5px] font-bold uppercase tracking-wide text-paper bg-signal px-2 py-0.5">
                    {s?.count ?? 0} {t(locale, "warCount")}
                  </span>
                </div>
                {s?.latest ? (
                  <p className="font-serif text-[15px] leading-snug mt-3 text-ink-2 line-clamp-3">{s.latest.title}</p>
                ) : (
                  <p className="font-mono text-[12px] text-ink-3 mt-3">{t(locale, "warEmpty")}</p>
                )}
                <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wide text-wire mt-4 group-hover:underline">
                  {t(locale, "warOpen")}
                </span>
              </Link>
            );
          })}
        </div>

        {latest.length > 0 && (
          <>
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-wire border-b border-line pb-2 mb-4">
              {t(locale, "warLatest")}
            </h2>
            <ul className="m-0 p-0 list-none max-w-[820px]">
              {latest.map((d, i) => (
                <Dispatch key={d.slug} d={d} ago={agoLabel(d, anchor, locale)} index={i} locale={locale} />
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
