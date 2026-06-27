"use client";
import { useEffect } from "react";

// Detayda mount olunca görüntülenmeyi 1 kez sayar (oturum başına tek).
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const k = `viewed:${slug}`;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch {}
    fetch("/api/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }), keepalive: true }).catch(() => {});
  }, [slug]);
  return null;
}
