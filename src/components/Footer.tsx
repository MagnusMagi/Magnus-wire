import Link from "next/link";
import { FOOTER_LINKS } from "@/lib/site";
import { t, type Locale } from "@/lib/i18n";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PushButton } from "@/components/PushButton";
import { SiteLogoutButton } from "@/components/SiteLogoutButton";

export function Footer({ locale }: { locale: Locale }) {
  // py-1: bağlantılar 16px yüksekliğindeydi, mobilde dokunma hedefi olarak küçüktü
  const linkCls = "inline-block py-1 text-xs text-ink-2 uppercase tracking-wide hover:text-signal transition-colors";
  const colLabel = "font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-3 mb-1";
  return (
    <footer className="border-t-2 border-ink bg-paper mt-auto">
      {/* Günlük tel — bülten bandı */}
      <div className="border-b border-line bg-panel/30">
        <div className="mx-auto max-w-[1240px] px-6 py-12 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 items-start">
          <div>
            <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-wire">
              <span className="w-[6px] h-[6px] rounded-full bg-wire wire-pulse" /> {t(locale, "newsletterKicker")}
            </span>
            <h2 className="font-serif text-[clamp(28px,1.6rem+1.5vw,40px)] font-black tracking-tight leading-[1.05] mt-3 mb-2">
              {t(locale, "newsletterTitle")}
            </h2>
            <p className="font-mono text-[13px] text-ink-2 leading-relaxed mb-5 max-w-md">{t(locale, "newsletterSub")}</p>
            <NewsletterForm locale={locale} />
            <p className="font-mono text-[11px] text-ink-3 mt-2.5">
              {t(locale, "newsletterPrivacy")}{" "}
              <Link href={`/${locale}/gizlilik`} className="text-wire hover:text-ink underline-offset-2 hover:underline">{t(locale, "privacy")}</Link>
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PushButton locale={locale} />
              <a href={`/${locale}/rss.xml`} className="font-mono text-[11px] font-bold uppercase tracking-wide px-3 py-2 border border-line text-ink-2 hover:border-wire hover:text-wire transition-colors">
                {t(locale, "rssBtn")}
              </a>
            </div>
          </div>

          {/* Nasıl çalışır panosu */}
          <aside className="border border-line bg-paper p-5 sm:p-6">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">{t(locale, "footerHow")}</span>
            <p className="font-mono text-[12.5px] text-ink-2 leading-relaxed mt-2.5">
              <span className="text-wire">●</span> {t(locale, "aiNote")}
            </p>
            <Link href={`/${locale}/hakkimizda`} className="inline-block mt-3 font-mono text-[11px] font-bold uppercase tracking-wide text-wire hover:text-ink transition-colors">
              {t(locale, "about2")}
            </Link>
          </aside>
        </div>
      </div>

      {/* Bağlantı sütunları */}
      <div className="mx-auto max-w-[1240px] px-6 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Link href={`/${locale}`} aria-label="MagiWire" className="font-serif text-[22px] font-black tracking-tight inline-flex items-baseline gap-2">
            Magi <span className="font-mono text-[11px] font-bold tracking-[0.22em] text-paper bg-ink px-2 py-0.5">WIRE</span>
          </Link>
          <p className="font-mono text-[12px] text-ink-2 leading-relaxed mt-3 max-w-[260px]">{t(locale, "followBlurb")}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mt-3">TR · EN · ET</p>
        </div>

        <nav aria-label={t(locale, "footerLegal")} className="flex flex-col gap-2">
          <span className={colLabel}>{t(locale, "footerLegal")}</span>
          {FOOTER_LINKS.map((l) => (
            <Link key={l.slug} href={`/${locale}/${l.slug}`} className={linkCls}>{t(locale, l.key)}</Link>
          ))}
        </nav>

        <nav aria-label={t(locale, "footerExplore")} className="flex flex-col gap-2">
          <span className={colLabel}>{t(locale, "footerExplore")}</span>
          <Link href={`/${locale}/etiketler`} className={linkCls}>{t(locale, "tagsLabel")}</Link>
          <Link href={`/${locale}/akis`} className={linkCls}>{t(locale, "myFeed")}</Link>
          <Link href={`/${locale}/hikayeler`} className={linkCls}>{t(locale, "storiesTitle")}</Link>
        </nav>
      </div>

      {/* Alt bar */}
      <div className="border-t border-line">
        <div className="mx-auto max-w-[1240px] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-ink-3">{t(locale, "copy")}</span>
          <span className="inline-flex items-center gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 inline-flex items-center gap-1.5">
              <span className="text-wire">●</span> {t(locale, "footerSourcesNote")}
            </span>
            <SiteLogoutButton label={t(locale, "siteLogout")} />
          </span>
        </div>
      </div>
    </footer>
  );
}
