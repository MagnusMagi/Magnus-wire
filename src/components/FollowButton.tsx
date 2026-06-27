"use client";
import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

const KEY = "wire:follows";
function read(): string[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }

export function FollowButton({ slug, locale }: { slug: string; locale: Locale }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(read().includes(slug)); }, [slug]);
  const toggle = () => {
    const cur = read();
    const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
    localStorage.setItem(KEY, JSON.stringify(next));
    setOn(next.includes(slug));
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={on}
      className={`font-mono text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 border transition-colors ${on ? "bg-wire text-paper border-wire" : "border-line text-ink-2 hover:border-wire hover:text-wire"}`}>
      {on ? `✓ ${t(locale, "following")}` : `+ ${t(locale, "follow")}`}
    </button>
  );
}
