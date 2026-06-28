import { weatherInfo, advisories, type CityWeather } from "@/lib/weather";
import type { Locale } from "@/lib/i18n";

// Kart yüksekliği SABİT: hi/lo ve uyarı satırları her zaman render edilir
// (yoksa boşluk yer tutucu) — uyarı çıkınca kart büyümez, grid hizalı kalır.
export function WeatherCard({ c, locale }: { c: CityWeather; locale: Locale }) {
  const info = weatherInfo(c.code);
  const adv = advisories({ code: c.code, tmax: c.tmax, tmin: c.tmin, wind: c.wind }, locale);
  return (
    <div className="h-full border border-line bg-panel/40 hover:bg-panel transition-colors p-3.5 flex flex-col gap-1.5">
      <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-2 truncate px-6 text-center">{c.name}</span>
      <div className="flex items-center gap-2">
        <span className="text-[30px] leading-none" aria-hidden>{info.emoji}</span>
        <span className="font-serif text-[28px] font-black tabular-nums leading-none">{Math.round(c.temp)}°</span>
      </div>
      <span className="font-mono text-[11px] text-ink-2 truncate">{info.label[locale]}</span>
      <span className="font-mono text-[10px] tabular-nums h-[14px] leading-[14px] overflow-hidden">
        {c.tmax != null && c.tmin != null ? (
          <>
            <span className="text-signal font-bold">↑{Math.round(c.tmax)}°</span>
            <span className="text-wire ml-1.5">↓{Math.round(c.tmin)}°</span>
          </>
        ) : " "}
      </span>
      <span className="font-mono text-[9px] font-bold uppercase tracking-wide text-signal truncate h-[14px] leading-[14px] overflow-hidden">
        {adv.length > 0 ? `${adv[0].emoji} ${adv[0].text}` : " "}
      </span>
      <span className="font-mono text-[10px] text-ink-3 tabular-nums">🌬 {Math.round(c.wind)} km/h · 💧 {c.humidity}%</span>
    </div>
  );
}
