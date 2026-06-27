import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { allPages } from "content-collections";
import { MDXContent } from "@content-collections/mdx/react";
import { CatNav } from "@/components/CatNav";
import { Dispatch } from "@/components/Dispatch";
import { mdxComponents } from "@/components/mdx";
import { ContactForm } from "@/components/ContactForm";
import { dispatchesBySection, dispatchesByRegion, agoLabel, latestTs } from "@/lib/dispatches";
import { TOPIC_SLUGS, REGION_SLUGS, sectionLabel } from "@/lib/site";
import { LOCALES, t, isLocale, type Locale } from "@/lib/i18n";

export const revalidate = 3600;

export function generateStaticParams() {
  const slugs = [...TOPIC_SLUGS, ...REGION_SLUGS, ...allPages.map((p) => p.slug)];
  return LOCALES.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  if (TOPIC_SLUGS.includes(slug) || REGION_SLUGS.includes(slug)) {
    return { title: sectionLabel(slug, locale) };
  }
  const page = allPages.find((p) => p.slug === slug);
  if (page) return { title: page.title, description: page.summary };
  return {};
}

export default async function SlugPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const isTopic = TOPIC_SLUGS.includes(slug);
  const isRegion = REGION_SLUGS.includes(slug);

  // Kategori (konu veya bölge)
  if (isTopic || isRegion) {
    const list = isTopic ? await dispatchesBySection(locale, slug) : await dispatchesByRegion(locale, slug);
    const anchor = latestTs(list);
    return (
      <>
        <CatNav locale={locale} active={slug} />
        <main className="mx-auto max-w-[1240px] px-6 pt-9 pb-18">
          <header className="border-b-2 border-ink pb-4 mb-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-wire">
              {t(locale, isRegion ? "regionWord" : "sectionWord")}
            </span>
            <h1 className="font-serif text-[clamp(32px,1.8rem+2vw,48px)] font-black tracking-tight leading-none mt-2">
              {sectionLabel(slug, locale)}
            </h1>
          </header>
          {list.length === 0 ? (
            <p className="font-mono text-ink-2 py-10">{t(locale, "emptySection")}</p>
          ) : (
            <ul className="m-0 p-0 list-none max-w-[820px]">
              {list.map((d, i) => (
                <Dispatch key={d.slug} d={d} ago={agoLabel(d, anchor, locale)} index={i} locale={locale} />
              ))}
            </ul>
          )}
        </main>
      </>
    );
  }

  // Kurumsal içerik (MDX, tr)
  const page = allPages.find((p) => p.slug === slug);
  if (!page) notFound();
  return (
    <>
      <CatNav locale={locale} active="" />
      <main className="mx-auto max-w-[1240px] px-6 pt-7 pb-18">
        <nav aria-label="crumb" className="max-w-[760px] mx-auto mb-5 font-mono text-[11.5px] tracking-wide text-ink-3 uppercase">
          <Link href={`/${locale}`} className="text-wire">{t(locale, "feed")}</Link>
          <span className="mx-[7px] text-line">›</span>
          <span className="text-ink-2">{page.title}</span>
        </nav>
        <header className="max-w-[760px] mx-auto">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-signal">{page.kicker}</span>
          <h1 className="font-serif font-black tracking-tight leading-[1.05] text-[clamp(30px,1.6rem+2vw,50px)] my-3.5">{page.title}</h1>
          <p className="font-serif italic font-medium text-[19px] leading-[1.5] text-ink-2 mb-6">{page.summary}</p>
        </header>
        <div className="wire-prose max-w-[680px] mx-auto">
          {page.updated && <p className="font-mono text-[11.5px] text-ink-3 mb-6">{page.updated}</p>}
          <MDXContent code={page.body} components={mdxComponents} />
          {slug === "iletisim" && <ContactForm />}
        </div>
      </main>
    </>
  );
}
