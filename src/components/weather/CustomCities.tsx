"use client";
import { useEffect, useState } from "react";
import { WeatherCard } from "./WeatherCard";
import { WeatherDetailModal } from "./WeatherDetailModal";
import { CitySearch } from "./CitySearch";
import { FavPin } from "./FavPin";
import { useCities } from "./useCities";
import { t, type Locale } from "@/lib/i18n";
import type { CityWeather } from "@/lib/weather";

export function CustomCities({ locale }: { locale: Locale }) {
  const { cities, add, remove } = useCities();
  const [wx, setWx] = useState<Record<string, CityWeather>>({});
  const [sel, setSel] = useState<CityWeather | null>(null);

  useEffect(() => {
    let alive = true;
    cities.forEach((c) => {
      if (wx[c.id]) return;
      fetch(`/api/weather?lat=${c.lat}&lon=${c.lon}`)
        .then((r) => r.json())
        .then((d) => {
          if (!alive || !d?.current) return;
          setWx((prev) => ({
            ...prev,
            [c.id]: { name: c.name, lat: c.lat, lon: c.lon, temp: d.current.temp, code: d.current.code, wind: d.current.wind, humidity: d.current.humidity, tmax: d.daily?.[0]?.tmax ?? null, tmin: d.daily?.[0]?.tmin ?? null },
          }));
        })
        .catch(() => {});
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities]);

  return (
    <div className="mt-7">
      <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink-2 mb-2.5">{t(locale, "addCity")}</h3>
      {cities.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
          {cities.map((c) => {
            const w = wx[c.id];
            return (
              <div key={c.id} className="relative">
                {w ? (
                  <button type="button" onClick={() => setSel(w)}
                    className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-wire focus-visible:ring-offset-1">
                    <WeatherCard c={w} locale={locale} />
                  </button>
                ) : (
                  <div className="h-full min-h-[104px] border border-line bg-panel/40 p-3.5 grid place-items-center font-mono text-[11px] text-ink-3">
                    {c.name}…
                  </div>
                )}
                <FavPin city={{ name: c.name, lat: c.lat, lon: c.lon }} locale={locale} />
                <button type="button" onClick={() => remove(c.id)} aria-label="Remove city"
                  className="absolute top-1.5 right-1.5 z-10 w-6 h-6 grid place-items-center text-ink-3 hover:text-signal text-[16px] leading-none">×</button>
              </div>
            );
          })}
        </div>
      )}
      <CitySearch onAdd={add} locale={locale} />
      {sel && <WeatherDetailModal city={sel} locale={locale} onClose={() => setSel(null)} />}
    </div>
  );
}
