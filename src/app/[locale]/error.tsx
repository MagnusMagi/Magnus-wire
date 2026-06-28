"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const seg = usePathname().split("/")[1] || "tr";
  const locale = (isLocale(seg) ? seg : "tr") as Locale;
  return (
    <main className="mx-auto max-w-[680px] px-6 py-24 text-center">
      <div className="font-mono text-[13px] font-bold uppercase tracking-[0.3em] text-signal mb-4">{t(locale, "errKicker")}</div>
      <h1 className="font-serif font-black text-[clamp(36px,7vw,68px)] leading-none mb-5">{t(locale, "errTitle")}</h1>
      <p className="text-ink-2 text-[15px] mb-8">{t(locale, "errBody")}</p>
      <div className="flex gap-3 justify-center">
        <button type="button" onClick={reset} className="font-mono text-xs font-bold uppercase tracking-widest px-5 py-3 bg-ink text-paper hover:bg-signal transition-colors">{t(locale, "errRetry")}</button>
        <Link href={`/${locale}`} className="font-mono text-xs font-bold uppercase tracking-widest px-5 py-3 border border-ink hover:border-signal hover:text-signal transition-colors">{t(locale, "errBack")}</Link>
      </div>
    </main>
  );
}
