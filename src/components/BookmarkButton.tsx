"use client";
import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

type Saved = { slug: string; title: string; section: string; locale: string; ts: number };
const KEY = "wire:bookmarks";
const read = (): Saved[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const write = (l: Saved[]) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {} };

export function BookmarkButton({ slug, title, section, locale }: { slug: string; title: string; section: string; locale: Locale }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(read().some((x) => x.slug === slug)); }, [slug]);
  const toggle = () => {
    const list = read();
    if (list.some((x) => x.slug === slug)) { write(list.filter((x) => x.slug !== slug)); setSaved(false); }
    else { write([{ slug, title, section, locale, ts: Date.now() }, ...list].slice(0, 200)); setSaved(true); }
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={saved}
      className={`font-mono text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 border transition-colors ${saved ? "bg-signal text-white border-signal" : "border-line text-ink-2 hover:border-signal hover:text-signal"}`}>
      {saved ? `✓ ${t(locale, "bookmarked")}` : `+ ${t(locale, "bookmark")}`}
    </button>
  );
}
