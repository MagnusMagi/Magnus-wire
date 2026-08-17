import Link from "next/link";
import { LiveDate } from "./LiveDate";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { t, type Locale } from "@/lib/i18n";

export function Topbar({ locale }: { locale: Locale }) {
  return (
    <div className="bg-ink text-[#cdc9bd] text-xs font-bold uppercase tracking-wide sm:tracking-wider">
      <div className="mx-auto max-w-[1240px] px-6 h-8 flex items-center justify-between">
        <span className="hidden min-[375px]:block"><LiveDate locale={locale} /></span>
        <nav aria-label="links" className="flex items-center gap-1.5 sm:gap-3">
          <span className="flex items-center gap-1 sm:gap-2">
            <Link href={`/${locale}/bugun`} className="inline-flex items-center h-8 px-0.5 sm:px-1 hover:text-white font-bold text-signal-l">{t(locale, "todayTitle")}</Link>
            <span aria-hidden className="hidden sm:inline text-[#5a574e]">/</span>
            <Link href={`/${locale}/hakkimizda`} className="hidden sm:inline-flex items-center h-8 px-0.5 sm:px-1 hover:text-white">{t(locale, "about")}</Link>
            <span aria-hidden className="hidden sm:inline text-[#5a574e]">/</span>
            <a href={`/${locale}/rss.xml`} className="hidden sm:inline-flex items-center h-8 px-0.5 sm:px-1 hover:text-white">RSS</a>
            <span aria-hidden className="text-[#5a574e]">/</span>
            <Link href={`/${locale}/okuma-listesi`} className="inline-flex items-center h-8 px-0.5 sm:px-1 hover:text-white whitespace-nowrap">{t(locale, "readingList")}</Link>
          </span>
          <span aria-hidden className="text-[#5a574e]">·</span>
          <LocaleSwitcher locale={locale} />
        </nav>
      </div>
    </div>
  );
}
