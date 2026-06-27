"use client";
import { useEffect } from "react";

// Kısayollar: "/" arama, "t" yukarı, "j" sonraki / "k" önceki dispatch.
export function KeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (/^(input|textarea|select)$/i.test(tgt.tagName) || tgt.isContentEditable)) return;
      if (e.key === "/") { e.preventDefault(); (document.querySelector('input[name="q"]') as HTMLInputElement | null)?.focus(); return; }
      if (e.key === "t") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      if (e.key === "j" || e.key === "k") {
        const links = document.querySelectorAll<HTMLAnchorElement>('nav[aria-label="prev-next"] a');
        const target = e.key === "k" ? links[0] : links[links.length - 1];
        if (target && links.length) target.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
