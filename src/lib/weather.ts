// Hava durumu — Open-Meteo (anahtarsız, ücretsiz). Yahoo Weather API kapatıldığı için onun yerine.
import type { Locale } from "./i18n";

export type City = { name: Record<Locale, string>; lat: number; lon: number };
export type CityWeather = { name: string; lat: number; lon: number; temp: number; code: number; wind: number; humidity: number };

export const CITIES: City[] = [
  { name: { tr: "İstanbul", en: "Istanbul", et: "Istanbul" }, lat: 41.0082, lon: 28.9784 },
  { name: { tr: "Ankara", en: "Ankara", et: "Ankara" }, lat: 39.9334, lon: 32.8597 },
  { name: { tr: "İzmir", en: "Izmir", et: "Izmir" }, lat: 38.4237, lon: 27.1428 },
  { name: { tr: "Tallinn", en: "Tallinn", et: "Tallinn" }, lat: 59.437, lon: 24.7536 },
  { name: { tr: "Tartu", en: "Tartu", et: "Tartu" }, lat: 58.378, lon: 26.729 },
  { name: { tr: "Londra", en: "London", et: "London" }, lat: 51.5074, lon: -0.1278 },
];

type Cond = { emoji: string; label: Record<Locale, string> };
const C = (emoji: string, tr: string, en: string, et: string): Cond => ({ emoji, label: { tr, en, et } });

const COND: Record<number, Cond> = {
  0: C("☀️", "Açık", "Clear", "Selge"),
  1: C("🌤️", "Az bulutlu", "Mostly clear", "Enamasti selge"),
  2: C("⛅", "Parçalı bulutlu", "Partly cloudy", "Vahelduv pilvisus"),
  3: C("☁️", "Bulutlu", "Overcast", "Pilves"),
  45: C("🌫️", "Sisli", "Fog", "Udu"),
  48: C("🌫️", "Kırağılı sis", "Rime fog", "Härmaudu"),
  51: C("🌦️", "Hafif çisenti", "Light drizzle", "Nõrk uduvihm"),
  53: C("🌦️", "Çisenti", "Drizzle", "Uduvihm"),
  55: C("🌦️", "Yoğun çisenti", "Dense drizzle", "Tihe uduvihm"),
  56: C("🌧️", "Donan çisenti", "Freezing drizzle", "Külmuv uduvihm"),
  57: C("🌧️", "Donan çisenti", "Freezing drizzle", "Külmuv uduvihm"),
  61: C("🌧️", "Hafif yağmur", "Light rain", "Nõrk vihm"),
  63: C("🌧️", "Yağmurlu", "Rain", "Vihm"),
  65: C("🌧️", "Şiddetli yağmur", "Heavy rain", "Tugev vihm"),
  66: C("🌧️", "Donan yağmur", "Freezing rain", "Külmuv vihm"),
  67: C("🌧️", "Donan yağmur", "Freezing rain", "Külmuv vihm"),
  71: C("❄️", "Hafif kar", "Light snow", "Nõrk lumi"),
  73: C("❄️", "Karlı", "Snow", "Lumi"),
  75: C("❄️", "Yoğun kar", "Heavy snow", "Tugev lumi"),
  77: C("🌨️", "Kar taneleri", "Snow grains", "Lumeterad"),
  80: C("🌦️", "Hafif sağanak", "Light showers", "Nõrk hoovihm"),
  81: C("🌧️", "Sağanak", "Showers", "Hoovihm"),
  82: C("⛈️", "Şiddetli sağanak", "Violent showers", "Tugev hoovihm"),
  85: C("🌨️", "Kar sağanağı", "Snow showers", "Lumesadu"),
  86: C("🌨️", "Yoğun kar sağanağı", "Heavy snow showers", "Tugev lumesadu"),
  95: C("⛈️", "Gök gürültülü", "Thunderstorm", "Äike"),
  96: C("⛈️", "Dolulu fırtına", "Thunderstorm, hail", "Äike rahega"),
  99: C("⛈️", "Şiddetli dolulu fırtına", "Severe thunderstorm", "Tugev äike rahega"),
};

export function weatherInfo(code: number): Cond {
  return COND[code] ?? C("·", "—", "—", "—");
}

export async function getWeather(locale: Locale): Promise<{ cities: CityWeather[]; asOf: Date }> {
  const lats = CITIES.map((c) => c.lat).join(",");
  const lons = CITIES.map((c) => c.lon).join(",");
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return { cities: [], asOf: new Date() };
    const j = await res.json();
    const arr = Array.isArray(j) ? j : [j];
    const cities = CITIES.map((c, i) => {
      const cur = arr[i]?.current;
      if (!cur || typeof cur.temperature_2m !== "number") return null;
      return {
        name: c.name[locale], lat: c.lat, lon: c.lon,
        temp: cur.temperature_2m,
        code: typeof cur.weather_code === "number" ? cur.weather_code : 0,
        wind: typeof cur.wind_speed_10m === "number" ? cur.wind_speed_10m : 0,
        humidity: typeof cur.relative_humidity_2m === "number" ? cur.relative_humidity_2m : 0,
      };
    }).filter((x): x is CityWeather => x !== null);
    return { cities, asOf: new Date() };
  } catch {
    return { cities: [], asOf: new Date() };
  }
}
