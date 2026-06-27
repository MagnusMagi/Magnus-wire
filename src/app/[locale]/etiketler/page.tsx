import Link from "next/link";
import type { Metadata } from "next";
import { CatNav } from "@/components/CatNav";
import { getTrendingTags } from "@/lib/dispatches";
import { LOCALES, isLocale, t, type Locale } from "@/lib/i18n";

export const revalidate = 3600;
export function generateStaticParams() { return LOCALES.map((locale) => ({ locale })); }
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  return { title: t(locale, "tagsLabel") };
}

export default async function TagsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const tags = await getTrendingTags(60);
  const max = tags[0]?.count || 1;
  const min = tags[tags.length - 1]?.count || 1;
  const size = (c: number) => 13 + Math.round(((c - min) / Math.max(1, max - min)) * 26);
  return (
    <>
      <CatNav locale={locale} active="etiketler" />
      <main className="mx-auto max-w-[920px] px-6 pt-9 pb-20">
        <header className="border-b-2 border-ink pb-4 mb-6">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-signal">{t(locale, "tagsTrending")}</span>
          <h1 className="font-serif font-black tracking-tight text-[clamp(34px,2rem+2vw,56px)] leading-[0.95] mt-1">{t(locale, "tagsLabel")}</h1>
        </header>
        {tags.length === 0 ? <p className="font-mono text-ink-2 py-16">—</p> : (
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3">
            {tags.map((x) => (
              <Link key={x.tag} href={`/${locale}/ara?tag=${encodeURIComponent(x.tag)}`}
                className="font-mono font-bold text-ink-2 hover:text-signal transition-colors before:content-['#'] before:text-wire before:mr-0.5 leading-none"
                style={{ fontSize: `${size(x.count)}px` }} title={`${x.count}`}>{x.tag}<sup className="text-[10px] text-ink-3 font-normal ml-0.5">{x.count}</sup></Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
