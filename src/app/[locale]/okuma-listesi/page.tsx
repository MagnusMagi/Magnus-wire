import type { Metadata } from "next";
import { CatNav } from "@/components/CatNav";
import { ReadingList } from "@/components/ReadingList";
import { LOCALES, isLocale, t, type Locale } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false } };
export function generateStaticParams() { return LOCALES.map((locale) => ({ locale })); }

export default async function ReadingListPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  return (
    <>
      <CatNav locale={locale} active="okuma-listesi" />
      <main className="mx-auto max-w-[920px] px-6 pt-9 pb-20">
        <header className="border-b-2 border-ink pb-4 mb-1">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-signal">{t(locale, "feed")}</span>
          <h1 className="font-serif font-black tracking-tight text-[clamp(34px,2rem+2vw,56px)] leading-[0.95] mt-1">{t(locale, "readingList")}</h1>
        </header>
        <ReadingList locale={locale} />
      </main>
    </>
  );
}
