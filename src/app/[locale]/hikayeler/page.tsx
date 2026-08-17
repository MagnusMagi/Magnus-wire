import Link from "next/link";
import type { Metadata } from "next";
import { CatNav } from "@/components/CatNav";
import { SourceLink } from "@/components/SourceLink";
import { getStories } from "@/lib/clusters";
import { sectionLabel, sectionHref } from "@/lib/site";
import { LOCALES, t, isLocale, type Locale } from "@/lib/i18n";
import { altLanguages } from "@/lib/seo";

export const revalidate = 1800;
export function generateStaticParams() { return LOCALES.map((locale) => ({ locale })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  return { title: t(locale, "storiesTitle"), alternates: { languages: altLanguages("/hikayeler") } };
}

export default async function StoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const stories = await getStories(locale);

  return (
    <>
      <CatNav locale={locale} active="" />
      <main className="mx-auto max-w-[1240px] px-6 pt-9 pb-18">
        <header className="border-b-2 border-ink pb-4 mb-6">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-signal">{t(locale, "storiesKicker")}</span>
          <h1 className="font-serif text-[clamp(32px,1.8rem+2vw,48px)] font-black tracking-tight leading-none mt-2">{t(locale, "storiesTitle")}</h1>
          <p className="font-mono text-[12.5px] text-ink-2 mt-3 max-w-xl">{t(locale, "storiesSub")}</p>
        </header>

        {stories.length === 0 ? (
          <p className="font-mono text-ink-2 py-10">{t(locale, "storiesEmpty")}</p>
        ) : (
          <div className="grid gap-x-10 gap-y-12 md:grid-cols-2">
            {stories.map((s) => (
              <section key={s.key} className="min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[10.5px] font-bold uppercase tracking-wide text-paper bg-signal px-2 py-0.5">{s.items.length} {t(locale, "updates")}</span>
                  <Link href={sectionHref(locale, s.section)} className="font-mono text-[11px] uppercase tracking-wide text-ink-3 hover:text-wire">{sectionLabel(s.section, locale)}</Link>
                </div>
                <ol className="relative m-0 p-0 list-none border-l border-line ml-2">
                  {s.items.map((d, i) => (
                    <li key={d.slug} className="relative pl-5 pb-5 last:pb-0">
                      <span className={`absolute -left-[5px] top-[6px] w-[9px] h-[9px] rounded-full ${i === 0 ? "bg-signal" : "bg-line"}`} aria-hidden />
                      <span className="font-mono text-[11px] text-ink-3 tabular-nums">{d.date} · {d.time.slice(0, 5)}</span>
                      <h3 className={`font-serif leading-snug tracking-tight m-0 mt-0.5 ${i === 0 ? "text-[19px] font-bold" : "text-[16px] font-semibold"}`}>
                        <Link href={`/${locale}/dispatch/${d.slug}`} className="hover:text-signal transition-colors">{d.title}</Link>
                      </h3>
                      <SourceLink url={d.sourceUrl} name={d.sourceName} locale={locale} compact />
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
