import Link from "next/link";
import type { Metadata } from "next";
import { CatNav } from "@/components/CatNav";
import { SourceLink } from "@/components/SourceLink";
import { getDispatches, type Dispatch } from "@/lib/dispatches";
import { sectionLabel } from "@/lib/site";
import { LOCALES, t, isLocale, type Locale } from "@/lib/i18n";

export const revalidate = 3600;
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  return { title: t(locale, "archiveTitle") };
}

export default async function ArchivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const all = await getDispatches(locale, 120);

  // Tarihe göre grupla (akış zaten en yeni → eski sıralı)
  const groups: { date: string; items: Dispatch[] }[] = [];
  for (const d of all) {
    const g = groups.find((x) => x.date === d.date);
    if (g) g.items.push(d);
    else groups.push({ date: d.date, items: [d] });
  }

  return (
    <>
      <CatNav locale={locale} active="arsiv" />
      <main className="mx-auto max-w-[920px] px-6 pt-9 pb-20">
        <header className="border-b-2 border-ink pb-4 mb-1">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-signal">{t(locale, "feed")}</span>
          <h1 className="font-serif font-black tracking-tight text-[clamp(34px,2rem+2vw,56px)] leading-[0.95] mt-1">{t(locale, "archiveTitle")}</h1>
          <p className="font-mono text-[12.5px] text-ink-3 mt-2.5">{all.length} {t(locale, "archiveSub")}</p>
        </header>

        {all.length === 0 ? (
          <p className="font-mono text-ink-2 py-16">{t(locale, "emptyFeed")}</p>
        ) : (
          <div className="mt-8 flex flex-col gap-9">
            {groups.map((g) => (
              <section key={g.date}>
                <h2 className="font-mono text-[12px] font-bold uppercase tracking-widest text-ink-2 py-1.5 border-b border-line mb-1">
                  <span className="text-wire mr-2">▸</span>{g.date}
                </h2>
                <ul className="m-0 p-0 list-none">
                  {g.items.map((d) => (
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
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
