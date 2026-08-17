"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

const LOC: Record<Locale, string> = { tr: "tr-TR", en: "en-GB", et: "et-EE" };

/**
 * Topbar tarihi. İki biçim üretilir:
 *   dar ekran → 17.08.26   (uzun biçim sağdaki bağlantılarla yarışıp sarıyordu)
 *   lg ve üstü → 17 Ağustos 2026 Pazartesi
 * Seçim CSS ile yapılıyor (ikisi de basılıp biri gizleniyor) — JS breakpoint
 * mantığı hidrasyon uyuşmazlığı riski taşır.
 */
export function LiveDate({ locale }: { locale: Locale }) {
  const [d, setD] = useState<{ short: string; full: string }>({ short: "", full: "" });

  useEffect(() => {
    const now = new Date();
    setD({
      short: new Intl.DateTimeFormat(LOC[locale], {
        day: "2-digit", month: "2-digit", year: "2-digit",
      }).format(now),
      full: new Intl.DateTimeFormat(LOC[locale], {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      }).format(now),
    });
  }, [locale]);

  return (
    <span className="uppercase text-[#b4b0a3] whitespace-nowrap" suppressHydrationWarning>
      <span className="text-signal">◷ </span>
      <span className="lg:hidden">{d.short || " "}</span>
      <span className="hidden lg:inline">{d.full || " "}</span>
    </span>
  );
}
