"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SourceLink } from "@/components/SourceLink";
import { t, isLocale, type Locale } from "@/lib/i18n";

type Item = { slug: string; title: string; summary: string; time: string; section: string; sourceUrl: string | null; sourceName: string | null };

export default function FeedPage() {
  const p = useParams();
  const locale = (isLocale(String(p.locale)) ? String(p.locale) : "tr") as Locale;
  const [items, setItems] = useState<Item[]>([]);
  const [state, setState] = useState<"loading" | "empty" | "ready">("loading");

  useEffect(() => {
    let follows: string[] = [];
    try { follows = JSON.parse(localStorage.getItem("wire:follows") || "[]"); } catch {}
    if (!follows.length) { setState("empty"); return; }
    fetch(`/api/feed?locale=${locale}&sections=${encodeURIComponent(follows.join(","))}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setState(d.items?.length ? "ready" : "empty"); })
      .catch(() => setState("empty"));
  }, [locale]);

  return (
    <main className="mx-auto max-w-[1240px] px-6 pt-9 pb-18">
      <header className="border-b-2 border-ink pb-4 mb-5">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-wire">{t(locale, "feedKicker")}</span>
        <h1 className="font-serif text-[clamp(32px,1.8rem+2vw,48px)] font-black tracking-tight leading-none mt-2">{t(locale, "myFeed")}</h1>
      </header>

      {state === "loading" && <p className="font-mono text-ink-3 py-10">…</p>}

      {state === "empty" && (
        <div className="py-12 max-w-[560px]">
          <p className="font-serif text-[20px] text-ink leading-snug">{t(locale, "feedEmpty")}</p>
          <p className="font-mono text-[12.5px] text-ink-2 mt-3">{t(locale, "feedHint")}</p>
          <Link href={`/${locale}/etiketler`} className="inline-block mt-5 font-mono text-[11px] font-bold uppercase tracking-wide px-4 py-2 bg-ink text-paper hover:bg-wire transition-colors">
            {t(locale, "browseTopics")}
          </Link>
        </div>
      )}

      {state === "ready" && (
        <ul className="m-0 p-0 list-none max-w-[820px]">
          {items.map((d) => (
            <li key={d.slug} className="flex items-baseline gap-3 sm:gap-5 py-3.5 border-b border-line/70">
              <span className="font-mono text-[12px] text-ink-3 shrink-0 w-[42px] tabular-nums pt-[3px]">{d.time?.slice(0, 5)}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-[18px] sm:text-[20px] leading-snug font-semibold tracking-tight m-0">
                  <Link href={`/${locale}/dispatch/${d.slug}`} className="hover:text-signal transition-colors">{d.title}</Link>
                </h3>
                <SourceLink url={d.sourceUrl} name={d.sourceName} locale={locale} compact />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
