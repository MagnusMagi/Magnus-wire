import { weatherInfo, type CityWeather } from "@/lib/weather";
import type { Locale } from "@/lib/i18n";

export function WeatherCard({ c, locale }: { c: CityWeather; locale: Locale }) {
  const info = weatherInfo(c.code);
  return (
    <div className="h-full border border-line bg-panel/40 hover:bg-panel transition-colors p-3.5 flex flex-col gap-1.5">
      <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-2 truncate">{c.name}</span>
      <div className="flex items-center gap-2">
        <span className="text-[30px] leading-none" aria-hidden>{info.emoji}</span>
        <span className="font-serif text-[28px] font-black tabular-nums leading-none">{Math.round(c.temp)}°</span>
      </div>
      <span className="font-mono text-[11px] text-ink-2 truncate">{info.label[locale]}</span>
      <span className="font-mono text-[10px] text-ink-3 tabular-nums">🌬 {Math.round(c.wind)} km/h · 💧 {c.humidity}%</span>
    </div>
  );
}
