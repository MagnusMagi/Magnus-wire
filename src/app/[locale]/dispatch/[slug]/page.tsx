import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CatNav } from "@/components/CatNav";
import { ArticleImage } from "@/components/ArticleImage";
import { mdxComponents } from "@/components/mdx";
import { getDispatch, getDispatches } from "@/lib/dispatches";
import { sectionLabel } from "@/lib/site";
import { SourceLink } from "@/components/SourceLink";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ViewBeacon } from "@/components/ViewBeacon";
import { BookmarkButton } from "@/components/BookmarkButton";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ShareButtons } from "@/components/ShareButtons";
import { LOCALES, t, isLocale, type Locale } from "@/lib/i18n";
import { altLanguages, SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const list = await getDispatches("tr");
  return LOCALES.flatMap((locale) => list.map((d) => ({ locale, slug: d.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const d = await getDispatch(locale, slug);
  if (!d) return {};
  return { title: d.title, description: d.summary, alternates: { canonical: `${SITE_URL}/${locale}/dispatch/${slug}`, languages: altLanguages(`/dispatch/${slug}`) }, openGraph: { title: d.title, description: d.summary, type: "article" } };
}

export default async function DispatchPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const d = await getDispatch(locale, slug);
  if (!d) notFound();

  const all = await getDispatches(locale);
  const idx = all.findIndex((x) => x.slug === d.slug);
  const newer = idx > 0 ? all[idx - 1] : null;
  const older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
  const related = all
    .filter((x) => x.slug !== d.slug)
    .map((x) => ({ x, score: x.tags.filter((tg) => d.tags.includes(tg)).length * 10 + (x.section === d.section ? 1 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.x);
  const initials = sectionLabel(d.section, locale).slice(0, 2).toUpperCase();
  const pageUrl = `https://news.magnusmagi.com/${locale}/dispatch/${d.slug}`;
  let srcHost = "";
  try { if (d.sourceUrl) srcHost = new URL(d.sourceUrl).hostname.replace(/^www\./, ""); } catch {}
  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: d.title,
    description: d.summary,
    ...(d.hero ? { image: [d.hero] } : {}),
    datePublished: d.publishedAt,
    dateModified: d.publishedAt,
    author: [{ "@type": "Organization", name: "Magnus Wire" }],
    publisher: { "@type": "Organization", name: "Magnus Wire" },
    articleSection: sectionLabel(d.section, locale),
    inLanguage: locale,
    mainEntityOfPage: pageUrl,
  };

  return (
    <>
      <ReadingProgress />
      <ViewBeacon slug={d.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <CatNav locale={locale} active={d.section} />
      <main className="mx-auto max-w-[1240px] px-6 pt-7 pb-18">
        <nav aria-label="crumb" className="max-w-[760px] mx-auto mb-5 font-mono text-[11.5px] tracking-wide text-ink-3 uppercase">
          <Link href={`/${locale}`} className="text-wire">{t(locale, "feed")}</Link>
          <span className="mx-[7px] text-line">›</span>
          <Link href={`/${locale}/${d.section}`} className="text-wire">{sectionLabel(d.section, locale)}</Link>
          <span className="mx-[7px] text-line">›</span>
          <span className="text-ink-2">{d.slug}</span>
        </nav>

        <article>
          <header className="max-w-[760px] mx-auto">
            <div className="flex items-center gap-3 mb-3.5 text-xs tracking-wide text-ink-2">
              {d.live && (
                <span className="inline-flex items-center gap-2 bg-signal text-white text-[11px] font-bold tracking-widest uppercase px-2.5 py-1">
                  <span className="w-[7px] h-[7px] rounded-full bg-white wire-pulse" /> {t(locale, "live")}
                </span>
              )}
              <span>{d.time} · {sectionLabel(d.section, locale).toUpperCase()}{d.region ? ` · ${sectionLabel(d.region, locale).toUpperCase()}` : ""}</span>
            </div>
            <h1 className="font-serif font-black tracking-tight leading-[1.05] text-[clamp(30px,1.6rem+2vw,50px)] mb-4">{d.title}</h1>
            <p className="font-serif italic font-medium text-[19px] leading-[1.5] text-ink-2 mb-6">{d.summary}</p>
            <div className="flex items-center gap-3 py-3.5 border-y border-line">
              <span className="w-[38px] h-[38px] grid place-items-center bg-ink text-paper font-mono text-xs font-bold" aria-hidden>{initials}</span>
              <div className="flex flex-col leading-tight">
                <span className="text-[13.5px] font-bold">{d.author}</span>
                <span className="font-mono text-[11.5px] text-ink-3">{d.time} · <span className="text-wire">{d.readMinutes} {t(locale, "readMin")}</span></span>
              </div>
              <ShareButtons url={pageUrl} title={d.title} copyLabel={t(locale, "copyLink")} copiedLabel={t(locale, "copied")} />
            </div>
            <div className="flex items-center gap-2.5 mt-3.5 font-mono text-[11px] uppercase tracking-wide text-ink-3">
              <span>{t(locale, "readIn")}</span>
              {LOCALES.map((lc) => (
                <Link key={lc} href={`/${lc}/dispatch/${d.slug}`} className={lc === locale ? "text-signal font-bold" : "text-wire hover:text-signal"}>{lc.toUpperCase()}</Link>
              ))}
              <span className="ml-auto"><BookmarkButton slug={d.slug} title={d.title} section={d.section} locale={locale} /></span>
            </div>
          </header>

          <figure className="max-w-[920px] mx-auto my-7">
            <ArticleImage hero={d.hero} slug={d.slug} alt={d.title} ratio="aspect-[16/9]" />
            <figcaption className="font-mono text-[11.5px] text-ink-3 mt-2 break-words">{"Foto: "}{(() => { try { return d.hero ? new URL(d.hero).hostname.replace(/^www\./, "") : "Magnus Wire"; } catch { return "Magnus Wire"; } })()}</figcaption>
          </figure>

          <div className="max-w-[680px] mx-auto mb-3"><AudioPlayer slug={d.slug} locale={locale} /></div>

          <div className="wire-prose max-w-[680px] mx-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdxComponents}>{d.body}</ReactMarkdown>
            {d.keyFacts.length > 0 && (
              <aside className="mt-9 border-l-[3px] border-signal bg-panel/60 pl-5 pr-4 py-5">
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-signal m-0 mb-3.5 flex items-center gap-2">
                  <span className="w-[7px] h-[7px] rounded-full bg-signal" aria-hidden />{t(locale, "keyFactsLabel")}
                </h2>
                <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
                  {d.keyFacts.map((f, i) => (
                    <li key={i} className="flex gap-3 text-[15px] leading-[1.5] text-ink-2">
                      <span className="font-mono text-xs font-bold text-wire shrink-0 mt-[3px]" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
            <div className="mt-8"><SourceLink url={d.sourceUrl} name={d.sourceName} locale={locale} /></div>
            <p className="font-mono text-[11px] text-ink-3 mt-3 flex items-start gap-1.5"><span className="text-wire shrink-0" aria-hidden>⚙</span><span>{t(locale, "aiNote")}</span></p>
            {srcHost && (<Link href={`/${locale}/kaynak/${srcHost}`} className="inline-block mt-2.5 font-mono text-[11px] font-bold text-wire hover:text-signal uppercase tracking-wide">{t(locale, "sourceMore")}: {srcHost} →</Link>)}
            <div className="flex flex-wrap items-center gap-2 mt-9 pt-5 border-t border-line">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-3 mr-1">{t(locale, "tagsLabel")}</span>
              {d.tags.map((tg) => (
                <Link key={tg} href={`/${locale}/ara?tag=${encodeURIComponent(tg)}`} className="font-mono text-xs px-[11px] py-[5px] border border-line bg-panel text-ink-2 hover:border-signal hover:text-signal transition-colors before:content-['#'] before:text-wire">{tg}</Link>
              ))}
            </div>
          </div>
        </article>

        {(older || newer) && (
          <nav aria-label="prev-next" className="max-w-[920px] mx-auto mt-12 grid grid-cols-2 gap-5 border-t border-line pt-5">
            {older ? (
              <Link href={`/${locale}/dispatch/${older.slug}`} className="group flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">‹ {t(locale, "prevDispatch")}</span>
                <span className="font-serif text-[15px] font-semibold leading-tight group-hover:text-signal line-clamp-2">{older.title}</span>
              </Link>
            ) : <span />}
            {newer ? (
              <Link href={`/${locale}/dispatch/${newer.slug}`} className="group flex flex-col gap-1 text-right items-end">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">{t(locale, "nextDispatch")} ›</span>
                <span className="font-serif text-[15px] font-semibold leading-tight group-hover:text-signal line-clamp-2">{newer.title}</span>
              </Link>
            ) : <span />}
          </nav>
        )}
        <section aria-label="related" className="max-w-[920px] mx-auto mt-14">
          <div className="flex items-baseline justify-between border-t-2 border-ink pt-2.5 mb-4.5">
            <h2 className="font-mono text-[13px] font-bold uppercase tracking-widest m-0">{t(locale, "related")}</h2>
            <Link href={`/${locale}`} className="text-xs text-wire font-bold">{t(locale, "relatedMore")}</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-7">
            {related.map((r) => (
              <article key={r.slug}>
                <Link href={`/${locale}/dispatch/${r.slug}`} className="block mb-3"><ArticleImage hero={r.hero} slug={r.slug} alt={r.title} /></Link>
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-wire">{sectionLabel(r.section, locale)}</span>
                <h3 className="font-serif text-[19px] leading-tight font-semibold tracking-tight mt-1.5">
                  <Link href={`/${locale}/dispatch/${r.slug}`} className="hover:text-signal">{r.title}</Link>
                </h3>
                <SourceLink url={r.sourceUrl} name={r.sourceName} locale={locale} compact />
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
