import { LiveDate } from "./LiveDate";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { t, type Locale } from "@/lib/i18n";

export function Topbar({ locale }: { locale: Locale }) {
  return (
    <div className="bg-ink text-[#cdc9bd] text-[11.5px] tracking-wide">
      <div className="mx-auto max-w-[1240px] px-6 h-8 flex items-center justify-between">
        <LiveDate locale={locale} />
        <nav aria-label="links" className="flex items-center gap-3">
          <span className="flex items-center gap-2">
            <a href={`/${locale}/hakkimizda`} className="hover:text-white">{t(locale, "about")}</a>
            <span className="text-[#5a574e]">/</span>
            <a href={`/${locale}/rss.xml`} className="hover:text-white">RSS</a>
          </span>
          <span className="text-[#5a574e]">·</span>
          <LocaleSwitcher locale={locale} />
        </nav>
      </div>
    </div>
  );
}
