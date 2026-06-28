import { getWeather } from "@/lib/weather";
import { WeatherGrid } from "./WeatherGrid";
import { CustomCities } from "./CustomCities";
import { WeatherHero } from "./WeatherHero";
import { t, type Locale } from "@/lib/i18n";

function formatAsOf(asOf: Date, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : locale === "et" ? "et-EE" : "en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Istanbul", timeZoneName: "short",
    }).format(asOf);
  } catch {
    return asOf.toISOString().slice(11, 16) + " UTC";
  }
}

export async function WeatherBoard({ locale }: { locale: Locale }) {
  const { cities, asOf } = await getWeather(locale);
  return (
    <section className="mb-10">
      {cities.length > 0 && <WeatherHero defaultCity={cities[0]} locale={locale} />}
      <div className="flex items-center justify-between gap-3 border-b border-line pb-2 mb-5">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-wire">
          <span className="w-[6px] h-[6px] rounded-full bg-wire wire-pulse" />
          {t(locale, "weatherTitle")}
        </span>
        <time dateTime={asOf.toISOString()} className="font-mono text-[10px] uppercase tracking-widest text-ink-3 tabular-nums">
          {t(locale, "updated")} {formatAsOf(asOf, locale)}
        </time>
      </div>
      {cities.length ? (
        <WeatherGrid cities={cities} locale={locale} />
      ) : (
        <p className="font-mono text-[12.5px] text-ink-2 border border-line bg-panel/40 px-4 py-3">{t(locale, "weatherUnavailable")}</p>
      )}
      <CustomCities locale={locale} />
    </section>
  );
}
