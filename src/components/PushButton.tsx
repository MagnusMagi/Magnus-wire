"use client";
import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushButton({ locale }: { locale: Locale }) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "working" | "on" | "blocked" | "error">("idle");

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (ok && Notification.permission === "denied") setState("blocked");
  }, []);

  const enable = async () => {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("blocked"); return; }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) { setState("error"); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const r = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), locale }),
      });
      setState(r.ok ? "on" : "error");
    } catch { setState("error"); }
  };

  if (!supported) return null;
  if (state === "on") return <p className="font-mono text-[11px] text-wire">✓ {t(locale, "pushOn")}</p>;
  if (state === "blocked") return <p className="font-mono text-[11px] text-ink-3">{t(locale, "pushBlocked")}</p>;
  return (
    <button type="button" onClick={enable} disabled={state === "working"}
      className="font-mono text-[11px] font-bold uppercase tracking-wide px-3 py-2 border border-line text-ink-2 hover:border-signal hover:text-signal transition-colors disabled:opacity-50">
      {state === "working" ? "…" : `🔔 ${t(locale, "pushEnable")}`}
    </button>
  );
}
