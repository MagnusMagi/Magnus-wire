"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      className="text-xs text-ink-2 hover:text-signal underline"
    >
      Çıkış yap
    </button>
  );
}
