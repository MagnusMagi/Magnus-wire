"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";

export default function NotFound() {
  const seg = usePathname().split("/")[1] || "tr";
  const locale = (isLocale(seg) ? seg : "tr") as Locale;
  return (
    <main className="mx-auto max-w-[680px] px-6 py-24 text-center">
      <div className="font-mono text-[13px] font-bold uppercase tracking-[0.3em] text-signal mb-4">{t(locale, "nfKicker")}</div>
      <h1 className="font-serif font-black text-[clamp(40px,8vw,80px)] leading-none mb-5">{t(locale, "nfTitle")}</h1>
      <p className="text-ink-2 text-[15px] mb-8 max-w-[46ch] mx-auto">{t(locale, "nfBody")}</p>
      <Link href={`/${locale}`} className="inline-block font-mono text-xs font-bold uppercase tracking-widest px-5 py-3 bg-ink text-paper hover:bg-signal transition-colors">{t(locale, "nfBack")}</Link>
    </main>
  );
}
