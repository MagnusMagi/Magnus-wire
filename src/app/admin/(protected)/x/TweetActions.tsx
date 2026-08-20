"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

async function patch(id: string, body: Record<string, unknown>) {
  const res = await fetch("/api/admin/tweets", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...body }),
  });
  if (!res.ok) throw new Error(String(res.status));
}

const btn = (tone: "on" | "off" | "err") =>
  `font-mono text-[10px] uppercase tracking-wide px-2 py-1 border transition-colors disabled:opacity-50 ${
    tone === "err"
      ? "border-signal text-signal"
      : tone === "on"
        ? "border-wire text-wire hover:bg-wire hover:text-paper"
        : "border-line text-ink-3 hover:border-ink hover:text-ink"
  }`;

/** Tek satırın eylemleri: göster/gizle, sabitle, sil. */
export function TweetActions({ id, active, pinned }: { id: string; active: boolean; pinned: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [pin, setPin] = useState(pinned);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  // İyimser güncelleme + başarısızlıkta geri alma (SourceToggle ile aynı desen).
  async function run(next: () => void, undo: () => void, body: Record<string, unknown>) {
    next();
    setFailed(false);
    try {
      await patch(id, body);
      startTransition(() => router.refresh());
    } catch {
      undo();
      setFailed(true);
    }
  }

  async function remove() {
    if (!confirm("Bu tweet havuzdan kalıcı olarak silinsin mi?")) return;
    setFailed(false);
    try {
      const res = await fetch("/api/admin/tweets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(String(res.status));
      startTransition(() => router.refresh());
    } catch {
      setFailed(true);
    }
  }

  return (
    <span className="inline-flex gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setPin(!pin), () => setPin(pin), { pinned: !pin })}
        aria-pressed={pin}
        title={pin ? "Sabitlemeyi kaldır" : "Başa sabitle"}
        className={btn(pin ? "on" : "off")}
      >
        {pin ? "sabit" : "sabitle"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setOn(!on), () => setOn(on), { active: !on })}
        aria-pressed={on}
        title={on ? "Siteden gizle" : "Sitede göster"}
        className={btn(failed ? "err" : on ? "on" : "off")}
      >
        {failed ? "hata" : on ? "açık" : "gizli"}
      </button>
      <button type="button" disabled={pending} onClick={remove} title="Kalıcı sil" className={btn("off")}>
        sil
      </button>
    </span>
  );
}

/** URL yapıştır → syndication'dan çek → havuza ekle. */
export function AddTweet() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: j.error || `hata ${res.status}` });
      } else {
        setMsg({ ok: true, text: `eklendi: @${j.screen_name} (${j.lang})` });
        setUrl("");
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "istek gönderilemedi" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-line p-3 mb-5">
      <label htmlFor="tweet-url" className="block font-mono text-[10px] uppercase tracking-wide text-ink-3 mb-1.5">
        Tweet bağlantısı yapıştır (x.com/…/status/…)
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="tweet-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://x.com/kullanici/status/1234567890"
          className="font-mono text-xs px-2 py-1.5 border border-line bg-paper text-ink min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={busy}
          className="font-mono text-[10px] uppercase tracking-wide px-3 py-1.5 border border-ink text-ink hover:bg-ink hover:text-paper disabled:opacity-50"
        >
          {busy ? "çekiliyor…" : "ekle"}
        </button>
      </div>
      {msg && (
        <p className={`mt-2 font-mono text-[11px] ${msg.ok ? "text-wire" : "text-signal"}`}>{msg.text}</p>
      )}
    </form>
  );
}
