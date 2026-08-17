"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_NAME, isLocale, type Locale } from "@/lib/i18n";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname() || "/";
  const segs = pathname.split("/");
  const swap = (loc: Locale) => {
    const s = [...segs];
    if (isLocale(s[1] || "")) s[1] = loc; else s.splice(1, 0, loc);
    return s.join("/") || `/${loc}`;
  };
  return (
    <span className="flex items-center gap-1.5">
      {LOCALES.map((loc) => (
        <Link
          key={loc}
          href={swap(loc)}
          aria-current={loc === locale ? "true" : undefined}
          // 14x18px'lik dokunma hedefi mobilde isabet ettirilemiyordu (WCAG 2.2 asgari
          // 24x24). Şerit yüksekliğini (32px) ve yatay dolguyu alıyor.
          className={`inline-flex items-center justify-center h-8 min-w-[26px] ${
            loc === locale ? "text-signal font-bold" : "text-[#cdc9bd] hover:text-white"
          }`}
        >
          {LOCALE_NAME[loc]}
        </Link>
      ))}
    </span>
  );
}
