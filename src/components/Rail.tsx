import Link from "next/link";
import { getDispatches, getMostRead } from "@/lib/dispatches";
import { t, type Locale } from "@/lib/i18n";

function PanelHead({ children, news = false }: { children: React.ReactNode; news?: boolean }) {
  return (
    <h2 className={`font-mono text-xs font-bold uppercase tracking-widest mb-3 pb-[9px] border-b-2 flex items-center gap-2 ${news ? "border-[#38352d] text-paper" : "border-ink"}`}>
      {children}
    </h2>
  );
}

export async function SignalPanel({ locale }: { locale: Locale }) {
  const latest = await getDispatches(locale, 4);
  return (
    <section>
      <PanelHead><span className="w-2 h-2 rounded-full bg-signal wire-pulse" /> {t(locale, "signal")}</PanelHead>
      <ul className="m-0 p-0 list-none">
        {latest.map((d) => (
          <li key={d.slug} className="grid grid-cols-[52px_1fr] gap-3 py-[11px] border-b border-dotted border-line text-[13px] text-ink-2">
            <time className="text-wire font-bold text-xs">{d.time.slice(0, 5)}</time>
            <Link href={`/${locale}/dispatch/${d.slug}`} className="hover:text-signal">{d.summary}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function MostReadPanel({ locale }: { locale: Locale }) {
  const top = await getMostRead(locale, 5);
  return (
    <section>
      <PanelHead><span className="text-signal">★</span> {t(locale, "mostRead")}</PanelHead>
      <ol className="m-0 p-0 list-none [counter-reset:r]">
        {top.map((d) => (
          <li key={d.slug} className="grid grid-cols-[26px_1fr] gap-[13px] py-3 border-b border-dotted border-line last:border-0 text-[13.5px] leading-snug [counter-increment:r]">
            <span className="font-mono text-xs font-bold text-wire pt-0.5 before:content-[counter(r,decimal-leading-zero)]" />
            <Link href={`/${locale}/dispatch/${d.slug}`} className="hover:text-signal">{d.title}</Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FollowPanel({ locale }: { locale: Locale }) {
  return (
    <section className="bg-ink text-paper p-[18px]">
      <PanelHead news>{t(locale, "follow")}</PanelHead>
      <p className="text-[13px] text-[#c7c3b7] mb-[14px]">{t(locale, "followBlurb")}</p>
      <div className="flex flex-col gap-2">
        <a href={`/${locale}/rss.xml`} className="font-mono text-xs font-bold tracking-wide uppercase px-3.5 py-2.5 border border-signal bg-signal text-white hover:bg-signal-d transition-colors text-center">
          {t(locale, "rssBtn")}
        </a>
        <Link href={`/${locale}/hakkimizda`} className="font-mono text-[11px] text-[#c7c3b7] hover:text-paper text-center">
          {t(locale, "about2")}
        </Link>
      </div>
    </section>
  );
}
