"use client";
import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export function NewsletterForm({ locale }: { locale: Locale }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      setState(r.ok ? "ok" : "error");
    } catch { setState("error"); }
  };
  if (state === "ok")
    return <p className="font-mono text-[12px] text-wire">✓ {t(locale, "subscribed")}</p>;
  return (
    <form onSubmit={submit} className="flex flex-wrap items-stretch gap-2 max-w-sm">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder={t(locale, "emailPlaceholder")} aria-label={t(locale, "emailPlaceholder")}
        className="flex-1 min-w-0 bg-paper border border-line px-3 py-2 font-mono text-[12.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-wire" />
      <button type="submit" disabled={state === "loading"}
        className="font-mono text-[11px] font-bold uppercase tracking-wide px-4 py-2 bg-ink text-paper hover:bg-wire transition-colors disabled:opacity-50">
        {state === "loading" ? "…" : t(locale, "subscribe")}
      </button>
      {state === "error" && <span className="w-full font-mono text-[11px] text-signal">{t(locale, "subscribeError")}</span>}
    </form>
  );
}
