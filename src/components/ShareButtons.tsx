"use client";
import { useState } from "react";

const cls = "w-8 h-8 grid place-items-center border border-line text-[12px] font-bold text-ink-2 hover:bg-signal hover:text-white hover:border-signal transition-colors";

export function ShareButtons({ url, title, copyLabel, copiedLabel }: { url: string; title: string; copyLabel: string; copiedLabel: string; }) {
  const [copied, setCopied] = useState(false);
  const e = encodeURIComponent;
  const x = `https://twitter.com/intent/tweet?text=${e(title)}&url=${e(url)}`;
  const wa = `https://wa.me/?text=${e(title + " — " + url)}`;
  const tg = `https://t.me/share/url?url=${e(url)}&text=${e(title)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  return (
    <div className="ml-auto flex gap-1.5" aria-label="share">
      <a href={x} target="_blank" rel="noopener noreferrer" className={cls} aria-label="X (Twitter)">X</a>
      <a href={wa} target="_blank" rel="noopener noreferrer" className={cls} aria-label="WhatsApp">WA</a>
      <a href={tg} target="_blank" rel="noopener noreferrer" className={cls} aria-label="Telegram">TG</a>
      <button type="button" onClick={copy} className={cls} aria-label={copied ? copiedLabel : copyLabel} title={copied ? copiedLabel : copyLabel}>{copied ? "✓" : "⧉"}</button>
    </div>
  );
}
