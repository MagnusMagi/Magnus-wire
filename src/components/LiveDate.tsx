"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

const LOC: Record<Locale, string> = { tr: "tr-TR", en: "en-GB", et: "et-EE" };

export function LiveDate({ locale }: { locale: Locale }) {
  const [text, setText] = useState("");
  useEffect(() => {
    setText(new Intl.DateTimeFormat(LOC[locale], { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()));
  }, [locale]);
  return (
    <span className="uppercase text-[#b4b0a3]" suppressHydrationWarning>
      <span className="text-signal">◷ </span>{text || " "}
    </span>
  );
}
