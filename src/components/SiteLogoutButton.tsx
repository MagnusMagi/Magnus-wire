"use client";

import { useRouter } from "next/navigation";

export function SiteLogoutButton({ label }: { label: string }) {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/site/logout", { method: "POST" });
    router.push("/giris");
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3 hover:text-signal transition-colors"
    >
      {label}
    </button>
  );
}
