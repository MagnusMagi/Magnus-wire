"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { sectionLabel } from "@/lib/site";

type Saved = { slug: string; title: string; section: string; locale: string; ts: number };
const KEY = "wire:bookmarks";

export function ReadingList({ locale }: { locale: Locale }) {
  const [items, setItems] = useState<Saved[] | null>(null);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setItems([]); } }, []);
  const remove = (slug: string) => {
    const next = (items || []).filter((x) => x.slug !== slug);
    setItems(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };
  if (items === null) return <p className="font-mono text-ink-3 py-10">…</p>;
  if (!items.length) return <p className="font-mono text-ink-2 py-16">{t(locale, "readingListEmpty")}</p>;
  return (
    <ul className="m-0 p-0 list-none mt-6">
      {items.map((x) => (
        <li key={x.slug} className="flex items-baseline gap-4 py-3 border-b border-line/70">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-wire">{sectionLabel(x.section, locale)}</span>
            <h3 className="font-serif text-[18px] sm:text-[20px] leading-snug font-semibold tracking-tight m-0">
              <Link href={`/${x.locale}/dispatch/${x.slug}`} className="hover:text-signal transition-colors">{x.title}</Link>
            </h3>
          </div>
          <button type="button" onClick={() => remove(x.slug)} className="font-mono text-[10px] uppercase tracking-wide text-ink-3 hover:text-signal shrink-0">{t(locale, "remove")} ×</button>
        </li>
      ))}
    </ul>
  );
}
