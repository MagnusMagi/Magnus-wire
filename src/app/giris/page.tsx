"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GirisForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/site/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 429) {
        setError("Çok fazla deneme. Biraz sonra tekrar dene.");
        return;
      }
      if (!res.ok) {
        setError("Şifre hatalı.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm border-2 border-ink p-6 bg-panel"
    >
      <div className="text-xs font-bold tracking-[0.08em] uppercase text-wire mb-4">
        MagiWire
      </div>
      <label className="block text-xs text-ink-2 mb-1" htmlFor="password">
        Şifre
      </label>
      <input
        id="password"
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        // ⚠️ `outline-none` KALDIRILDI. Global odak halkası (:focus-visible) artık
        // @layer base içinde olduğu için utility'ler onu EZEBİLİYOR; bu satır
        // duruyorken klavye odağı bu alanda tamamen görünmez oluyordu (ölçüldü:
        // odaklı/odaksız piksel farkı sıfır). Tek başına kenarlık rengi değişimi
        // WCAG 2.4.7 için yeterli bir gösterge değil.
        className="w-full border border-line bg-paper px-3 py-2 text-sm mb-3 focus:border-wire"
      />
      {error && <div className="text-signal text-xs mb-3">{error}</div>}
      <button
        type="submit"
        disabled={pending || !password}
        className="w-full bg-wire text-white text-sm font-bold py-2 disabled:opacity-50"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}

export default function GirisPage() {
  return (
    <Suspense>
      <GirisForm />
    </Suspense>
  );
}
