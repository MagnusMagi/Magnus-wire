"use client";
import { useFavCity } from "./useFavCity";
import { t, type Locale } from "@/lib/i18n";

export function FavPin({ city, locale }: { city: { name: string; lat: number; lon: number }; locale: Locale }) {
  const { set, isFav } = useFavCity();
  const on = isFav(city.lat, city.lon);
  return (
    <button
      type="button"
      onClick={() => set(on ? null : city)}
      aria-label={on ? t(locale, "favActive") : t(locale, "favSet")}
      aria-pressed={on}
      title={on ? t(locale, "favActive") : t(locale, "favSet")}
      className={`absolute top-1.5 left-1.5 z-10 w-5 h-5 grid place-items-center text-[12px] leading-none transition-colors ${
        on ? "text-signal" : "text-ink-3 hover:text-ink"}`}
    >
      {on ? "◉" : "○"}
    </button>
  );
}
