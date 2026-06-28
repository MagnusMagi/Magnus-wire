import Link from "next/link";
import type { Metadata } from "next";
import { CatNav } from "@/components/CatNav";
import { SourceLink } from "@/components/SourceLink";
import { getDispatches } from "@/lib/dispatches";
import { TOPICS, REGIONS, sectionLabel } from "@/lib/site";
import { LOCALES, isLocale, t, type Locale } from "@/lib/i18n";

export const revalidate = 1800;
export function generateStaticParams() { return LOCALES.map((locale) => ({ locale })); }
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  return { title: t(locale, "todayTitle") };
}

export default async function TodayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const all = await getDispatches(locale, 120);
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const today = all.filter((d) => Date.parse(d.publishedAt) >= cutoff);
  const order = [...TOPICS, ...REGIONS].map((s) => s.slug);
  const groups = order
    .map((slug) => ({ slug, items: today.filter((d) => d.section === slug) }))
    .filter((g) => g.items.length);

  return (
    <>
      <CatNav locale={locale} active="bugun" />
      <main className="mx-auto max-w-[920px] px-6 pt-9 pb-20">
        <header className="border-b-2 border-ink pb-4 mb-2">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-signal">{t(locale, "todaySub")}</span>
          <h1 className="font-serif font-black tracking-tight text-[clamp(38px,2.2rem+2vw,64px)] leading-[0.92] mt-1">{t(locale, "todayTitle")}</h1>
          <p className="font-mono text-[12.5px] text-ink-3 mt-2.5">{today.length} {t(locale, "dispatchWord")} · {groups.length} {t(locale, "sectionWord").toLowerCase()}</p>
        </header>

        {today.length === 0 ? (
          <p className="font-mono text-ink-2 py-16">{t(locale, "emptySection")}</p>
        ) : (
          <div className="mt-7 flex flex-col gap-9">
            {groups.map((g) => (
              <section key={g.slug}>
                <h2 className="font-mono text-[12px] font-bold uppercase tracking-widest text-ink-2 py-1.5 border-b border-line mb-1">
                  <span className="text-wire mr-2">▸</span>{sectionLabel(g.slug, locale)} <span className="text-ink-3">· {g.items.length}</span>
                </h2>
                <ul className="m-0 p-0 list-none">
                  {g.items.map((d) => (
                    <li key={d.slug} className="flex items-baseline gap-3 sm:gap-5 py-3 border-b border-line/70">
                      <span className="font-mono text-[12px] text-ink-3 shrink-0 w-[42px] tabular-nums pt-[3px]">{d.time.slice(0, 5)}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif text-[18px] sm:text-[20px] leading-snug font-semibold tracking-tight m-0">
                          <Link href={`/${locale}/dispatch/${d.slug}`} className="hover:text-signal transition-colors">{d.title}</Link>
                        </h3>
                        <SourceLink url={d.sourceUrl} name={d.sourceName} locale={locale} compact />
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
