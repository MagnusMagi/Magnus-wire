import Link from "next/link";
import { CatNav } from "@/components/CatNav";
import { Dispatch } from "@/components/Dispatch";
import { SignalPanel, MostReadPanel, FollowPanel } from "@/components/Rail";
import { DispatchCover } from "@/components/DispatchCover";
import { SourceLink } from "@/components/SourceLink";
import { getDispatches, agoLabel, latestTs } from "@/lib/dispatches";
import { sectionLabel } from "@/lib/site";
import type { Metadata } from "next";
import { t, isLocale, type Locale } from "@/lib/i18n";
import { altLanguages, SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  return { alternates: { canonical: `${SITE_URL}/${locale}`, languages: altLanguages("") } };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const all = await getDispatches(locale);
  const lead = all[0];
  const feed = all.slice(1);
  const anchor = latestTs(all);

  return (
    <>
      <CatNav locale={locale} active="akis" />
      <main className="mx-auto max-w-[1240px] px-6 grid grid-cols-1 lg:grid-cols-[1fr_312px] gap-12 pt-9 pb-18">
        <div>
          {!lead ? (
            <p className="font-mono text-ink-2 py-16">{t(locale, "emptyFeed")}</p>
          ) : (
            <>
              <article className="pb-7 border-b-2 border-ink mb-2">
                <div className="flex items-center gap-3 mb-3.5 text-xs tracking-wide text-ink-2">
                  {lead.live && (
                    <span className="inline-flex items-center gap-2 bg-signal text-white text-[11px] font-bold tracking-widest uppercase px-2.5 py-1">
                      <span className="w-[7px] h-[7px] rounded-full bg-white wire-pulse" /> {t(locale, "live")}
                    </span>
                  )}
                  <span>{lead.time} · {sectionLabel(lead.section, locale).toUpperCase()}{lead.region ? ` · ${sectionLabel(lead.region, locale).toUpperCase()}` : ""}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-7 items-start">
                  <div>
                    <h1 className="font-serif font-black tracking-tight leading-[1.04] text-[clamp(34px,2rem+1.8vw,52px)] mb-4">
                      <Link href={`/${locale}/dispatch/${lead.slug}`} className="wire-underline hover:text-ink">{lead.title}</Link>
                    </h1>
                    <p className="text-ink-2 text-[15px] mb-3.5 max-w-[52ch]">{lead.summary}</p>
                    <span className="block text-[11.5px] text-ink-3 tracking-wide">
                      {lead.author} · {t(locale, "updated")} {agoLabel(lead, anchor, locale)} · {lead.tags.length} {t(locale, "tagsCount")}
                    </span>
                    <div><SourceLink url={lead.sourceUrl} name={lead.sourceName} locale={locale} compact /></div>
                  </div>
                  <Link href={`/${locale}/dispatch/${lead.slug}`} aria-hidden tabIndex={-1}>
                    <DispatchCover slug={lead.slug} section={lead.section} locale={locale} />
                  </Link>
                </div>
              </article>

              <div className="flex items-baseline justify-between mt-7 mb-1.5">
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] flex items-center gap-2 m-0">
                  <span className="text-signal">▌</span> {t(locale, "liveFeed")}
                </h2>
                <Link href={`/${locale}/arsiv`} className="text-xs text-wire font-bold">{t(locale, "archive")}</Link>
              </div>
              <ul className="m-0 p-0 list-none">
                {feed.map((d, i) => (
                  <Dispatch key={d.slug} d={d} ago={agoLabel(d, anchor, locale)} index={i} locale={locale} />
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-[30px]">
          <SignalPanel locale={locale} />
          <MostReadPanel locale={locale} />
          <FollowPanel locale={locale} />
        </aside>
      </main>
    </>
  );
}
