/* eslint-disable @next/next/no-img-element */
import { t, type Locale } from "@/lib/i18n";

function domain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function SourceLink({
  url, name, locale, compact = false,
}: {
  url: string | null; name: string | null; locale: Locale; compact?: boolean;
}) {
  if (!url) return null;
  const host = domain(url);
  const fav = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  const label = name || host;

  if (compact) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] text-ink-3 hover:text-signal transition-colors mt-2">
        <img src={fav} alt="" width={14} height={14} className="rounded-[2px] grayscale opacity-80" />
        <span>{t(locale, "viaSource")} {host} ↗</span>
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="group inline-flex items-center gap-3 border border-line bg-panel px-3.5 py-2.5 hover:border-signal transition-colors">
      <img src={fav} alt="" width={20} height={20} className="rounded-[3px]" />
      <span className="flex flex-col leading-tight">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-2">{t(locale, "source")}</span>
        <span className="text-[13.5px] font-bold">{label}</span>
        <span className="font-mono text-[10.5px] text-wire">{host}</span>
      </span>
      <span className="ml-2 text-wire group-hover:text-signal text-lg">↗</span>
    </a>
  );
}
