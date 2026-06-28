"use client";
import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export function ScrollTop({ locale }: { locale: Locale }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label={t(locale, "scrollTop")}
      className="fixed bottom-5 right-5 z-40 w-11 h-11 grid place-items-center bg-ink text-paper text-lg hover:bg-signal transition-colors shadow-[3px_3px_0_rgba(26,25,22,0.25)]">↑</button>
  );
}
