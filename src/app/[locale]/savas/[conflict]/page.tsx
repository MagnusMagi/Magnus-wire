import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CatNav } from "@/components/CatNav";
import { Dispatch } from "@/components/Dispatch";
import { FollowButton } from "@/components/FollowButton";
import { dispatchesByConflict, agoLabel, latestTs } from "@/lib/dispatches";
import { CONFLICTS, CONFLICT_SLUGS, isConflictSlug, conflictLabel } from "@/lib/site";
import { LOCALES, t, isLocale, type Locale } from "@/lib/i18n";
import { SITE_URL, altLanguages } from "@/lib/seo";

export const revalidate = 1800;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => CONFLICT_SLUGS.map((conflict) => ({ locale, conflict })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; conflict: string }> }): Promise<Metadata> {
  const { locale: raw, conflict } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  if (!isConflictSlug(conflict)) return {};
  const label = conflictLabel(conflict, locale);
  return {
    title: `${label} — ${t(locale, "warTitle")}`,
    alternates: {
      canonical: `${SITE_URL}/${locale}/savas/${conflict}`,
      languages: altLanguages(`/savas/${conflict}`),
    },
  };
}

export default async function ConflictPage({ params }: { params: Promise<{ locale: string; conflict: string }> }) {
  const { locale: raw, conflict } = await params;
  const locale = (isLocale(raw) ? raw : "tr") as Locale;
  if (!isConflictSlug(conflict)) notFound();

  const list = await dispatchesByConflict(locale, conflict);
  const anchor = latestTs(list);
  const others = CONFLICTS.filter((c) => c.slug !== conflict);

  return (
    <>
      <CatNav locale={locale} active="savas" />
      <main className="mx-auto w-full max-w-[1240px] px-6 pt-9 pb-18">
        <header className="border-b-2 border-ink pb-4 mb-6">
          <Link href={`/${locale}/savas`} className="font-mono text-[11px] font-bold uppercase tracking-widest text-wire hover:underline">
            {t(locale, "warBack")}
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
            <h1 className="font-serif text-[clamp(30px,1.6rem+2vw,46px)] font-black tracking-tight leading-none min-w-0">
              {conflictLabel(conflict, locale)}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-wide text-paper bg-signal px-2 py-0.5">
                {list.length} {t(locale, "warCount")}
              </span>
              <FollowButton slug={`savas/${conflict}`} locale={locale} />
            </div>
          </div>
        </header>

        {list.length === 0 ? (
          <p className="font-mono text-ink-2 py-10">{t(locale, "warEmpty")}</p>
        ) : (
          <ul className="m-0 p-0 list-none max-w-[820px]">
            {list.map((d, i) => (
              <Dispatch key={d.slug} d={d} ago={agoLabel(d, anchor, locale)} index={i} locale={locale} />
            ))}
          </ul>
        )}

        {others.length > 0 && (
          <nav aria-label={t(locale, "warAllFronts")} className="mt-12 border-t border-line pt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-ink-3">{t(locale, "warAllFronts")}:</span>
            {others.map((c) => (
              <Link key={c.slug} href={`/${locale}/savas/${c.slug}`}
                className="font-mono text-[11px] font-bold uppercase tracking-wide border border-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors">
                {c.label[locale]}
              </Link>
            ))}
          </nav>
        )}
      </main>
    </>
  );
}
