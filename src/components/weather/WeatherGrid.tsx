"use client";
import { useState } from "react";
import { WeatherCard } from "./WeatherCard";
import { WeatherDetailModal } from "./WeatherDetailModal";
import { FavPin } from "./FavPin";
import type { CityWeather } from "@/lib/weather";
import type { Locale } from "@/lib/i18n";

export function WeatherGrid({ cities, locale }: { cities: CityWeather[]; locale: Locale }) {
  const [sel, setSel] = useState<CityWeather | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {cities.map((c) => (
          <div key={c.name} className="relative">
            <button type="button" onClick={() => setSel(c)}
              className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-wire focus-visible:ring-offset-1">
              <WeatherCard c={c} locale={locale} />
            </button>
            <FavPin city={{ name: c.name, lat: c.lat, lon: c.lon }} locale={locale} />
          </div>
        ))}
      </div>
      {sel && <WeatherDetailModal city={sel} locale={locale} onClose={() => setSel(null)} />}
    </>
  );
}
