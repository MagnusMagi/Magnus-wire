"use client";
import { useEffect, useState } from "react";
import { useFavCity } from "./useFavCity";
import { weatherInfo, aqiInfo, uvInfo, cardinal, advisories, type CityWeather } from "@/lib/weather";
import { t, type Locale } from "@/lib/i18n";

type Detail = {
  current: { temp: number; feels: number | null; code: number; wind: number; windDir: number | null; humidity: number; pressure: number | null } | null;
  hourly: { t: string; temp: number | null; code: number; precip: number | null }[];
  sun: { sunrise: string | null; sunset: string | null; uvMax: number | null } | null;
  daily: { date: string; code: number; tmax: number | null; tmin: number | null; precip: number | null }[];
  airQuality: { aqi: number | null } | null;
};

const hhmm = (iso: string | null) => (iso ? iso.slice(11, 16) : "—");

function Chip({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="border border-line bg-paper/60 px-3 py-2">
      <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink-3">{label}</div>
      <div className="font-mono text-[13px] font-bold tabular-nums mt-0.5 flex items-center gap-1.5">
        {color && <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />}
        <span>{value}</span>{sub && <span className="text-ink-3 font-normal">{sub}</span>}
      </div>
    </div>
  );
}

export function WeatherHero({ defaultCity, locale }: { defaultCity: CityWeather; locale: Locale }) {
  const { fav } = useFavCity();
  const city = fav ?? { name: defaultCity.name, lat: defaultCity.lat, lon: defaultCity.lon };
  const [d, setD] = useState<Detail | null>(null);

  useEffect(() => {
    let alive = true;
    setD(null);
    fetch(`/api/weather?lat=${city.lat}&lon=${city.lon}`)
      .then((r) => r.json())
      .then((j) => { if (alive && !j?.error) setD(j); })
      .catch(() => {});
    return () => { alive = false; };
  }, [city.lat, city.lon]);

  const cur = d?.current;
  const today = d?.daily?.[0];
  const code = cur?.code ?? defaultCity.code;
  const info = weatherInfo(code);
  const temp = cur?.temp ?? defaultCity.temp;
  const aq = aqiInfo(d?.airQuality?.aqi, locale);
  const uv = uvInfo(d?.sun?.uvMax, locale);
  const adv = advisories({ code, tmax: today?.tmax, tmin: today?.tmin, wind: cur?.wind, aqi: d?.airQuality?.aqi }, locale);
  const radar = `https://embed.windy.com/embed2.html?lat=${city.lat}&lon=${city.lon}&detailLat=${city.lat}&detailLon=${city.lon}&zoom=6&level=surface&overlay=radar&menu=&message=&marker=true&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  return (
    <div className="mb-9 border-2 border-ink bg-panel/40">
      <div className="grid lg:grid-cols-[1.05fr_1fr]">
        {/* Sol: büyük durum */}
        <div className="p-5 sm:p-6 flex flex-col gap-3">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-wire inline-flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-wire wire-pulse" />{city.name}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-[64px] leading-none" aria-hidden>{info.emoji}</span>
            <span className="font-serif text-[64px] font-black tabular-nums leading-none">{Math.round(temp)}°</span>
          </div>
          <div className="font-mono text-[13px] text-ink-2">
            {info.label[locale]}
            {cur?.feels != null && <span className="text-ink-3"> · {t(locale, "feelsLike")} {Math.round(cur.feels)}°</span>}
            {today?.tmax != null && today?.tmin != null && (
              <span className="ml-2 tabular-nums"><span className="text-signal font-bold">↑{Math.round(today.tmax)}°</span> <span className="text-wire">↓{Math.round(today.tmin)}°</span></span>
            )}
          </div>
          {adv.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {adv.map((a) => (
                <span key={a.text} className="inline-flex items-center gap-1 border border-signal/40 bg-signal/10 text-signal font-mono text-[11px] font-bold px-2 py-1">
                  <span aria-hidden>{a.emoji}</span> {a.text}
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1">
            <Chip label={t(locale, "wWind")} value={`${cardinal(cur?.windDir, locale)} ${Math.round(cur?.wind ?? defaultCity.wind)}`} sub="km/h" />
            <Chip label={t(locale, "wHumidity")} value={`${cur?.humidity ?? defaultCity.humidity}%`} />
            <Chip label={t(locale, "wPressure")} value={cur?.pressure != null ? String(Math.round(cur.pressure)) : "—"} sub="hPa" />
            <Chip label={t(locale, "wUv")} value={uv.value} sub={uv.label} color={uv.value !== "—" ? uv.color : undefined} />
            <Chip label={t(locale, "wAqi")} value={aq.value} sub={aq.label} color={aq.value !== "—" ? aq.color : undefined} />
            <Chip label="🌅 / 🌇" value={`${hhmm(d?.sun?.sunrise ?? null)} / ${hhmm(d?.sun?.sunset ?? null)}`} />
          </div>
        </div>
        {/* Sağ: radar */}
        <div className="relative border-t-2 lg:border-t-0 lg:border-l-2 border-ink min-h-[260px]">
          <span className="absolute top-2 left-2 z-10 font-mono text-[10px] font-bold uppercase tracking-widest text-paper bg-ink/80 px-2 py-1">{t(locale, "wRadar")}</span>
          <iframe title={t(locale, "wRadar")} loading="lazy" src={radar} className="w-full h-full min-h-[260px] block" />
        </div>
      </div>
      {/* Saatlik */}
      {d?.hourly && d.hourly.length > 0 && (
        <div className="border-t-2 border-ink p-3">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:thin] px-1">
            {d.hourly.map((hr) => (
              <div key={hr.t} className="flex-none w-[52px] text-center py-1">
                <div className="font-mono text-[10px] text-ink-3 tabular-nums">{hhmm(hr.t)}</div>
                <div className="text-[17px] leading-tight" aria-hidden>{weatherInfo(hr.code).emoji}</div>
                <div className="font-mono text-[12px] font-bold tabular-nums">{hr.temp != null ? Math.round(hr.temp) : "—"}°</div>
                {hr.precip != null && hr.precip > 0 && <div className="font-mono text-[9px] text-wire tabular-nums">💧{hr.precip}%</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
