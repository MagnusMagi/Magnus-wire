"use client";
import { useEffect, useState } from "react";
import { weatherInfo, type CityWeather } from "@/lib/weather";
import { t, type Locale } from "@/lib/i18n";

type Day = { date: string; code: number; tmax: number | null; tmin: number | null; precip: number | null };

export function WeatherDetailModal({ city, locale, onClose }: { city: CityWeather; locale: Locale; onClose: () => void }) {
  const [days, setDays] = useState<Day[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErrored(false);
    fetch(`/api/weather?lat=${city.lat}&lon=${city.lon}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d?.error || !Array.isArray(d?.daily)) { setErrored(true); setDays(null); }
        else setDays(d.daily);
        setLoading(false);
      })
      .catch(() => { if (alive) { setErrored(true); setLoading(false); } });
    return () => { alive = false; };
  }, [city.lat, city.lon]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const tag = locale === "tr" ? "tr-TR" : locale === "et" ? "et-EE" : "en-GB";
  const now = weatherInfo(city.code);
  const dayName = (iso: string, i: number) =>
    i === 0 ? t(locale, "weatherToday")
      : new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "Europe/Istanbul" }).format(new Date(`${iso}T12:00:00`));

  return (
    <div role="dialog" aria-modal="true" aria-label={city.name} onClick={onClose}
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6">
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[560px] bg-paper border-2 border-ink max-h-[92vh] overflow-y-auto wire-printin">
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
          <div className="flex items-center gap-3">
            <span className="text-[40px] leading-none" aria-hidden>{now.emoji}</span>
            <div>
              <h3 className="font-serif text-[24px] font-black tracking-tight leading-tight">{city.name}</h3>
              <div className="font-mono text-[11px] text-ink-2">{now.label[locale]} · 🌬 {Math.round(city.wind)} km/h · 💧 {city.humidity}%</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-serif text-[34px] font-black tabular-nums leading-none">{Math.round(city.temp)}°</span>
            <button type="button" onClick={onClose} aria-label="Close"
              className="font-mono text-[22px] leading-none text-ink-2 hover:text-signal px-1">×</button>
          </div>
        </div>

        <h4 className="px-5 pt-4 pb-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-wire">{t(locale, "weatherForecast")}</h4>

        <div className="px-5 pb-5">
          {loading ? (
            <div className="h-[180px] grid place-items-center font-mono text-xs text-ink-3">{t(locale, "detailLoading")}</div>
          ) : errored || !days?.length ? (
            <div className="h-[180px] grid place-items-center font-mono text-xs text-signal">{t(locale, "detailError")}</div>
          ) : (
            <div className="divide-y divide-line border border-line">
              {days.map((d, i) => {
                const inf = weatherInfo(d.code);
                return (
                  <div key={d.date} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2.5">
                    <span className="font-mono text-[12px] font-bold capitalize">{dayName(d.date, i)}</span>
                    <span className="font-mono text-[11px] text-ink-2 tabular-nums whitespace-nowrap">
                      <span className="text-[15px] mr-1.5" aria-hidden>{inf.emoji}</span>
                      {d.precip != null && <span className="text-wire">💧 {d.precip}%</span>}
                    </span>
                    <span className="font-mono text-[12px] tabular-nums whitespace-nowrap text-right">
                      <span className="font-bold">{d.tmax != null ? Math.round(d.tmax) : "—"}°</span>
                      <span className="text-ink-3 ml-1.5">{d.tmin != null ? Math.round(d.tmin) : "—"}°</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="font-mono text-[10px] text-ink-3 mt-3">{t(locale, "weatherSource")}</p>
        </div>
      </div>
    </div>
  );
}
