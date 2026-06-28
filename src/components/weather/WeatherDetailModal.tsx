"use client";
import { useEffect, useState } from "react";
import { weatherInfo, aqiInfo, uvInfo, cardinal, type CityWeather } from "@/lib/weather";
import { t, type Locale } from "@/lib/i18n";

type Cur = { temp: number; feels: number | null; code: number; wind: number; windDir: number | null; humidity: number; pressure: number | null; isDay: boolean };
type Hour = { t: string; temp: number | null; code: number; precip: number | null };
type Day = { date: string; code: number; tmax: number | null; tmin: number | null; precip: number | null };
type Detail = {
  current: Cur | null; hourly: Hour[];
  sun: { sunrise: string | null; sunset: string | null; uvMax: number | null } | null;
  daily: Day[]; airQuality: { aqi: number | null; pm25: number | null; pm10: number | null } | null;
};

const hhmm = (iso: string | null) => (iso ? iso.slice(11, 16) : "—");

function TempTrend({ days }: { days: Day[] }) {
  const pts = days.filter((d) => d.tmax != null);
  if (pts.length < 2) return null;
  const w = 520, h = 56, pad = 8;
  const highs = pts.map((d) => d.tmax as number);
  const lows = pts.map((d) => (d.tmin ?? d.tmax) as number);
  const min = Math.min(...lows), max = Math.max(...highs), span = max - min || 1;
  const X = (i: number) => pad + (i / (pts.length - 1)) * (w - 2 * pad);
  const Y = (v: number) => pad + (1 - (v - min) / span) * (h - 2 * pad);
  const hi = pts.map((d, i) => `${X(i).toFixed(1)},${Y(d.tmax as number).toFixed(1)}`).join(" ");
  const lo = pts.map((d, i) => `${X(i).toFixed(1)},${Y((d.tmin ?? d.tmax) as number).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[56px] mb-3" preserveAspectRatio="none" aria-hidden>
      <polyline points={lo} fill="none" stroke="var(--color-wire)" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <polyline points={hi} fill="none" stroke="var(--color-signal)" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-paper px-3 py-2.5">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-widest text-ink-3">{label}</div>
      <div className="font-mono text-[13px] font-bold tabular-nums mt-0.5 flex items-center gap-1.5">
        {color && <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />}
        <span>{value}</span>
        {sub && <span className="text-ink-3 font-normal">{sub}</span>}
      </div>
    </div>
  );
}

export function WeatherDetailModal({ city, locale, onClose }: { city: CityWeather; locale: Locale; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErrored(false);
    fetch(`/api/weather?lat=${city.lat}&lon=${city.lon}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d?.error || !Array.isArray(d?.daily)) { setErrored(true); setData(null); }
        else setData(d);
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
  const cur = data?.current;
  const code = cur?.code ?? city.code;
  const info = weatherInfo(code);
  const temp = cur?.temp ?? city.temp;
  const aq = aqiInfo(data?.airQuality?.aqi, locale);
  const uv = uvInfo(data?.sun?.uvMax, locale);
  const dayName = (iso: string, i: number) =>
    i === 0 ? t(locale, "weatherToday")
      : new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "Europe/Istanbul" }).format(new Date(`${iso}T12:00:00`));

  return (
    <div role="dialog" aria-modal="true" aria-label={city.name} onClick={onClose}
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6">
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[600px] bg-paper border-2 border-ink max-h-[92vh] overflow-y-auto wire-printin">
        {/* Başlık */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
          <div className="flex items-center gap-3">
            <span className="text-[44px] leading-none" aria-hidden>{info.emoji}</span>
            <div>
              <h3 className="font-serif text-[24px] font-black tracking-tight leading-tight">{city.name}</h3>
              <div className="font-mono text-[11px] text-ink-2">
                {info.label[locale]}
                {cur?.feels != null && <span className="text-ink-3"> · {t(locale, "feelsLike")} {Math.round(cur.feels)}°</span>}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-serif text-[34px] font-black tabular-nums leading-none">{Math.round(temp)}°</span>
            <button type="button" onClick={onClose} aria-label="Close"
              className="font-mono text-[22px] leading-none text-ink-2 hover:text-signal px-1">×</button>
          </div>
        </div>

        {/* Anlık ölçümler */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-line m-5 border border-line">
          <Stat label={t(locale, "wWind")}
            value={`${cardinal(cur?.windDir, locale)} ${Math.round(cur?.wind ?? city.wind)}`} sub="km/h" />
          <Stat label={t(locale, "wHumidity")} value={`${cur?.humidity ?? city.humidity}%`} />
          <Stat label={t(locale, "wPressure")} value={cur?.pressure != null ? String(Math.round(cur.pressure)) : "—"} sub="hPa" />
          <Stat label={t(locale, "wUv")} value={uv.value} sub={uv.label} color={uv.value !== "—" ? uv.color : undefined} />
          <Stat label={t(locale, "wAqi")} value={aq.value} sub={aq.label} color={aq.value !== "—" ? aq.color : undefined} />
          <Stat label={`🌅 / 🌇`} value={`${hhmm(data?.sun?.sunrise ?? null)} / ${hhmm(data?.sun?.sunset ?? null)}`} />
        </div>

        {/* Saatlik */}
        {data?.hourly && data.hourly.length > 0 && (
          <div className="px-5 pb-2">
            <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-wire mb-2">{t(locale, "wHourly")}</h4>
            <div className="flex gap-1 overflow-x-auto [scrollbar-width:thin] pb-2 -mx-1 px-1">
              {data.hourly.map((hr) => (
                <div key={hr.t} className="flex-none w-[52px] border border-line bg-panel/40 px-1 py-2 text-center">
                  <div className="font-mono text-[10px] text-ink-3 tabular-nums">{hhmm(hr.t)}</div>
                  <div className="text-[17px] leading-tight" aria-hidden>{weatherInfo(hr.code).emoji}</div>
                  <div className="font-mono text-[12px] font-bold tabular-nums">{hr.temp != null ? Math.round(hr.temp) : "—"}°</div>
                  {hr.precip != null && hr.precip > 0 && <div className="font-mono text-[9px] text-wire tabular-nums">💧{hr.precip}%</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7 günlük */}
        <h4 className="px-5 pt-2 pb-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-wire">{t(locale, "weatherForecast")}</h4>
        <div className="px-5 pb-5">
          {loading ? (
            <div className="h-[160px] grid place-items-center font-mono text-xs text-ink-3">{t(locale, "detailLoading")}</div>
          ) : errored || !data?.daily?.length ? (
            <div className="h-[160px] grid place-items-center font-mono text-xs text-signal">{t(locale, "detailError")}</div>
          ) : (
            <>
              <TempTrend days={data.daily} />
              <div className="divide-y divide-line border border-line">
                {data.daily.map((d, i) => {
                  const inf = weatherInfo(d.code);
                  return (
                    <div key={d.date} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2.5">
                      <span className="font-mono text-[12px] font-bold capitalize">{dayName(d.date, i)}</span>
                      <span className="font-mono text-[11px] text-ink-2 tabular-nums whitespace-nowrap">
                        <span className="text-[15px] mr-1.5" aria-hidden>{inf.emoji}</span>
                        {d.precip != null && <span className="text-wire">💧 {d.precip}%</span>}
                      </span>
                      <span className="font-mono text-[12px] tabular-nums whitespace-nowrap text-right">
                        <span className="font-bold text-signal">{d.tmax != null ? Math.round(d.tmax) : "—"}°</span>
                        <span className="text-wire ml-1.5">{d.tmin != null ? Math.round(d.tmin) : "—"}°</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <p className="font-mono text-[10px] text-ink-3 mt-3">{t(locale, "weatherSource")}</p>
        </div>
      </div>
    </div>
  );
}
