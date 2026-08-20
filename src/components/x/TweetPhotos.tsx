"use client";
import { useEffect, useState } from "react";
import type { TweetPhoto } from "@/lib/tweets";
import { t, type Locale } from "@/lib/i18n";

// ⚠️ Görseller KENDİ vekilimizden geçer (bkz src/app/api/x/img/route.ts):
// doğrudan pbs.twimg.com her ziyaretçinin IP'sini X'e sızdırırdı.
const proxy = (u: string) => `/api/x/img?u=${encodeURIComponent(u)}`;

// X medya URL'leri `name` parametresiyle boyut seçtirir; kart küçük halini,
// büyüteç tam halini ister. Parametre zaten varsa ezilir.
function sized(url: string, name: "small" | "large"): string {
  try {
    const u = new URL(url);
    u.searchParams.set("name", name);
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Kart görselleri + tam ekran büyüteç.
 *
 * Kartın kendisi sunucu bileşeni; yalnız bu parça istemciye iniyor ki
 * sayfanın geri kalanı statik kalsın.
 */
export function TweetPhotos({ photos, locale, alt }: { photos: TweetPhoto[]; locale: Locale; alt: string }) {
  const [open, setOpen] = useState<number | null>(null);
  // Yüklenemeyen görseller. ⚠️ Emniyet ağı: vekil düzeltildi ama X medyayı her
  // an kaldırabilir; kırık görsel kutusu bırakmaktansa kartı metne indiriyoruz.
  const [broken, setBroken] = useState<Set<string>>(new Set());
  // ⚠️ Tek hatada görseli silmek fazla acımasız: `?name=small` varyantı bazı
  // medya türlerinde çalışmıyor ve vekil yoğunlukta geçici 502 alabiliyor.
  // Önce BOYUTSUZ özgün URL ile bir kez daha denenir; o da düşerse gizlenir.
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const shown = photos.filter((p) => !broken.has(p.url));

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      // Birden fazla görselde ok tuşlarıyla gezinme.
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? null : (i + 1) % shown.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? null : (i - 1 + shown.length) % shown.length));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, shown.length]);

  // ⚠️ Erken çıkış hook'lardan SONRA: koşullu hook React kuralını bozar.
  if (!shown.length) return null;

  return (
    <>
      <div className={`mt-3 grid gap-1.5 ${shown.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {shown.map((p, i) => (
          <button
            key={p.url}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={t(locale, "xOpenPhoto")}
            className="group/photo relative block w-full overflow-hidden border border-line bg-panel cursor-zoom-in focus-visible:outline-2 focus-visible:outline-wire"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proxy(sized(p.url, "small"))}
              alt={alt}
              width={p.w ?? 600}
              height={p.h ?? 400}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                if (retried.has(p.url)) {
                  setBroken((prev) => new Set(prev).add(p.url));
                  return;
                }
                setRetried((prev) => new Set(prev).add(p.url));
                e.currentTarget.src = proxy(p.url); // boyut parametresiz özgün URL
              }}
              className="w-full h-auto max-h-[340px] object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/photo:scale-[1.02]"
            />
            <span
              aria-hidden
              className="absolute bottom-1.5 right-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-ink/75 text-paper opacity-0 group-hover/photo:opacity-100 transition-opacity"
            >
              ⤢
            </span>
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || t(locale, "xOpenPhoto")}
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxy(sized(shown[open].url, "large"))}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain border border-paper/20 wire-printin cursor-default"
          />
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label={t(locale, "close")}
            className="absolute top-3 right-4 font-mono text-[26px] leading-none text-paper/80 hover:text-paper px-2"
          >
            ×
          </button>
          {shown.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[11px] tabular-nums text-paper/70">
              {open + 1} / {shown.length}
            </span>
          )}
        </div>
      )}
    </>
  );
}
