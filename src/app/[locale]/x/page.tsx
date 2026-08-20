import type { Metadata } from "next";
import { CatNav } from "@/components/CatNav";
import { FollowButton } from "@/components/FollowButton";
import { XBoard } from "@/components/x/XBoard";
import { XMark } from "@/components/x/XMark";
import { getTweets } from "@/lib/tweets";
import { LOCALES, t, isLocale, type Locale } from "@/lib/i18n";
import { SITE_URL, altLanguages } from "@/lib/seo";

// Havuz 30 dakikada bir cron'la güncelleniyor (scripts/ingest-tweets.mjs) ve
// koşu sonunda revalidate tetikliyor; bu süre yalnız emniyet ağı.
export const revalidate = 900;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  return {
    title: t(locale, "xTitle"),
    description: t(locale, "xSub"),
    alternates: { canonical: `${SITE_URL}/${locale}/x`, languages: altLanguages("/x") },
  };
}

export default async function XPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  const tweets = await getTweets();

  return (
    <>
      <CatNav locale={locale} active="x" />
      <main className="mx-auto w-full max-w-[1240px] px-6 pt-9 pb-18">
        <header className="border-b-2 border-ink pb-4 mb-6">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-wire">
            {t(locale, "xKicker")}
          </span>
          <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
            <h1 className="font-serif text-[clamp(32px,1.8rem+2vw,48px)] font-black tracking-tight leading-none flex items-center gap-3">
              <XMark className="w-[0.72em] h-[0.72em] flex-none" />
              {t(locale, "xTitle")}
            </h1>
            <FollowButton slug="x" locale={locale} />
          </div>
          <p className="font-serif italic text-[17px] leading-[1.5] text-ink-2 mt-3 max-w-[640px]">
            {t(locale, "xSub")}
          </p>
        </header>

        <XBoard tweets={tweets} locale={locale} />

        <p className="font-mono text-[10.5px] text-ink-3 mt-10 pt-3 border-t border-line max-w-[720px]">
          {t(locale, "xDisclaimer")}
        </p>
      </main>
    </>
  );
}
