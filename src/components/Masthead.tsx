import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";

export function Masthead({ locale }: { locale: Locale }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto max-w-[1240px] px-6 h-24 flex items-center justify-between">
        <Link href={`/${locale}`} aria-label="MagiWire" className="inline-flex items-baseline gap-3">
          <span className="font-serif text-[40px] font-black tracking-tight leading-none">Magi</span>
          <span className="font-mono text-sm font-bold tracking-[0.22em] text-paper bg-ink px-[9px] py-1 -translate-y-[6px]">WIRE</span>
        </Link>
        <form role="search" className="hidden sm:flex items-stretch" action={`/${locale}/ara`} method="get">
          <input type="search" name="q" placeholder={t(locale, "search")} aria-label="search"
            className="font-mono text-[13px] px-3.5 py-2 w-[210px] border border-line border-r-0 bg-transparent text-ink outline-none focus:border-ink" />
          <button type="submit" aria-label="search" className="grid place-items-center w-[38px] border border-ink bg-ink text-paper text-base hover:bg-signal hover:border-signal transition-colors">⌕</button>
        </form>
      </div>
    </header>
  );
}
