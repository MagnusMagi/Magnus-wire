"use client";
import { useRef, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export function AudioPlayer({ slug, locale }: { slug: string; locale: Locale }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const ref = useRef<HTMLAudioElement | null>(null);
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (state === "idle") {
      setState("loading");
      a.src = `/api/tts?slug=${encodeURIComponent(slug)}&locale=${locale}`;
      a.play().then(() => setState("playing")).catch(() => setState("idle"));
    } else if (state === "playing") { a.pause(); setState("paused"); }
    else { a.play().then(() => setState("playing")).catch(() => setState("idle")); }
  };
  const icon = state === "loading" ? "…" : state === "playing" ? "❚❚" : "▶";
  return (
    <span className="inline-flex items-center">
      <button type="button" onClick={toggle} aria-label={t(locale, "listen")}
        className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wide px-3 py-2 border border-line text-ink-2 hover:border-signal hover:text-signal transition-colors">
        <span className="text-signal">{icon}</span> {t(locale, "listen")}
      </button>
      <audio ref={ref} onEnded={() => setState("idle")} onPause={() => setState((s) => (s === "playing" ? "paused" : s))} preload="none" />
    </span>
  );
}
