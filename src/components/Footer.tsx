import Link from "next/link";
import { FOOTER_LINKS } from "@/lib/site";
import { t, type Locale } from "@/lib/i18n";

export function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="border-t-2 border-ink bg-paper mt-auto">
      <div className="mx-auto max-w-[1240px] px-6 py-7 flex flex-wrap items-center gap-6">
        <div className="font-serif text-[22px] font-black tracking-tight">
          Magnus <span className="font-mono text-[11px] font-bold tracking-[0.22em] text-paper bg-ink px-2 py-0.5">WIRE</span>
        </div>
        <nav aria-label="footer" className="flex flex-wrap gap-[18px] flex-1">
          {FOOTER_LINKS.map((l) => (
            <Link key={l.slug} href={`/${locale}/${l.slug}`} className="text-xs text-ink-2 uppercase tracking-wide hover:text-signal">
              {t(locale, l.key)}
            </Link>
          ))}
        </nav>
        <span className="text-[11.5px] text-ink-3">{t(locale, "copy")}</span>
      </div>
    </footer>
  );
}
