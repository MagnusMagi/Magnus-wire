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
    return <p className="font-mono text-[12.5px] text-wire border border-wire/40 bg-wire/5 px-3.5 py-2.5 max-w-md">✓ {t(locale, "subscribed")}</p>;
  return (
    <div className="w-full max-w-md">
      <form onSubmit={submit} className="flex items-stretch w-full border border-ink bg-paper focus-within:border-wire transition-colors">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder={t(locale, "emailPlaceholder")} aria-label={t(locale, "emailPlaceholder")}
          className="flex-1 min-w-0 bg-transparent px-3.5 py-2.5 font-mono text-[12.5px] text-ink placeholder:text-ink-3 focus:outline-none" />
        <button type="submit" disabled={state === "loading"}
          className="font-mono text-[11px] font-bold uppercase tracking-wide px-5 py-2.5 bg-ink text-paper hover:bg-wire transition-colors disabled:opacity-50 whitespace-nowrap">
          {state === "loading" ? "…" : t(locale, "subscribe")}
        </button>
      </form>
      {state === "error" && <p className="font-mono text-[11px] text-signal mt-1">{t(locale, "subscribeError")}</p>}
    </div>
  );
}
