"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SourceToggle({ id, active }: { id: number; active: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next); // iyimser güncelleme
    setFailed(false);
    try {
      const res = await fetch("/api/admin/sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      startTransition(() => router.refresh());
    } catch {
      setOn(!next); // geri al
      setFailed(true);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={on}
      title={failed ? "Güncellenemedi, tekrar dene" : on ? "Kaynağı kapat" : "Kaynağı aç"}
      className={`font-mono text-[10px] uppercase tracking-wide px-2 py-1 border transition-colors disabled:opacity-50 ${
        failed
          ? "border-signal text-signal"
          : on
            ? "border-wire text-wire hover:bg-wire hover:text-paper"
            : "border-line text-ink-3 hover:border-ink hover:text-ink"
      }`}
    >
      {failed ? "hata" : on ? "aktif" : "kapalı"}
    </button>
  );
}
