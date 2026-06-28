"use client";
import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

type State = "idle" | "sending" | "ok" | "error";

export function ContactForm({ locale }: { locale: Locale }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<State>("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, locale }),
      });
      if (!r.ok) throw new Error();
      setState("ok");
      setName(""); setEmail(""); setMessage("");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="mt-9">
      <h2 className="font-serif text-[25px] font-semibold tracking-tight mb-3.5">{t(locale, "contactWrite")}</h2>
      {state === "ok" ? (
        <p className="font-mono text-[13px] text-wire border border-wire/40 bg-wire/5 px-4 py-3">
          ✓ {t(locale, "contactOk")}
        </p>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <label htmlFor="ad" className="font-mono text-[11px] font-bold uppercase tracking-wide">{t(locale, "contactName")}</label>
          <input id="ad" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={120}
            placeholder={t(locale, "contactNamePh")}
            className="font-mono text-sm px-3.5 py-2.5 border border-line bg-[#fbfaf6] text-ink outline-none focus:border-ink" />
          <label htmlFor="eposta" className="font-mono text-[11px] font-bold uppercase tracking-wide">{t(locale, "contactEmail")}</label>
          <input id="eposta" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160}
            placeholder={t(locale, "contactEmailPh")}
            className="font-mono text-sm px-3.5 py-2.5 border border-line bg-[#fbfaf6] text-ink outline-none focus:border-ink" />
          <label htmlFor="mesaj" className="font-mono text-[11px] font-bold uppercase tracking-wide">{t(locale, "contactMsg")}</label>
          <textarea id="mesaj" required value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000}
            placeholder={t(locale, "contactMsgPh")}
            className="font-mono text-sm px-3.5 py-2.5 border border-line bg-[#fbfaf6] text-ink outline-none focus:border-ink resize-y min-h-[120px]" />
          <button type="submit" disabled={state === "sending"}
            className="self-start font-mono text-[13px] font-bold tracking-wide uppercase px-5.5 py-2.5 border border-signal bg-signal text-white hover:bg-signal-d disabled:opacity-60 transition-colors">
            {state === "sending" ? t(locale, "contactSending") : t(locale, "contactSend")}
          </button>
          {state === "error" && (
            <p className="font-mono text-[12px] text-signal">{t(locale, "contactError")}</p>
          )}
        </form>
      )}
      <p className="font-mono text-[11.5px] text-ink-3 mt-6">
        {t(locale, "contactDirect")} <a href="mailto:magiwire@magnusmagi.com" className="text-wire font-bold hover:text-ink">magiwire@magnusmagi.com</a>
      </p>
    </div>
  );
}
