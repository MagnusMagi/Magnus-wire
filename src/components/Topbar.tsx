import Link from "next/link";
import { LiveDate } from "./LiveDate";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { t, type Locale } from "@/lib/i18n";

export function Topbar({ locale }: { locale: Locale }) {
  return (
    <div className="bg-ink text-[#cdc9bd] text-[11.5px] tracking-wide">
      <div className="mx-auto max-w-[1240px] px-6 h-8 flex items-center justify-between">
        <span className="hidden min-[360px]:block"><LiveDate locale={locale} /></span>
        <nav aria-label="links" className="flex items-center gap-3">
          <span className="flex items-center gap-2">
            <Link href={`/${locale}/bugun`} className="hover:text-white font-bold text-signal">{t(locale, "todayTitle")}</Link>
            <span className="hidden sm:inline text-[#5a574e]">/</span>
            <Link href={`/${locale}/hakkimizda`} className="hidden sm:inline hover:text-white">{t(locale, "about")}</Link>
            <span className="hidden sm:inline text-[#5a574e]">/</span>
            <a href={`/${locale}/rss.xml`} className="hidden sm:inline hover:text-white">RSS</a>
            <span className="text-[#5a574e]">/</span>
            <Link href={`/${locale}/okuma-listesi`} className="hover:text-white whitespace-nowrap">{t(locale, "readingList")}</Link>
          </span>
          <span className="text-[#5a574e]">·</span>
          <LocaleSwitcher locale={locale} />
        </nav>
      </div>
    </div>
  );
}
