import type { LatLng } from './types';

export interface WeatherHour {
  time: string; // ISO
  temp: number;
  wind: number; // km/h
  gust: number; // km/h
  dir: number; // graden
  rain: number; // mm
  code: number;
}

export interface Weather {
  place: LatLng;
  fetched: number;
  hours: WeatherHour[];
  sunrise?: string;
  sunset?: string;
}

/** Beaufort uit km/h */
export function beaufort(kmh: number): number {
  const t = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  let b = 0;
  while (b < t.length && kmh >= t[b]) b++;
  return b;
}

export function windName(dir: number): string {
  const n = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];
  return n[Math.round(dir / 45) % 8];
}

export function weatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌧️';
  if (code <= 86) return '🌨️';
  return '⛈️';
}

export function weatherText(code: number): string {
  if (code === 0) return 'zonnig';
  if (code <= 2) return 'licht bewolkt';
  if (code === 3) return 'bewolkt';
  if (code <= 48) return 'mist';
  if (code <= 57) return 'motregen';
  if (code <= 67) return 'regen';
  if (code <= 77) return 'sneeuw';
  if (code <= 82) return 'buien';
  if (code <= 86) return 'sneeuwbuien';
  return 'onweer';
}

const cache = new Map<string, Weather>();

export async function fetchWeather(p: LatLng, signal?: AbortSignal): Promise<Weather> {
  const key = `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const c = cache.get(key);
  if (c && Date.now() - c.fetched < 30 * 60 * 1000) return c;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${p[0].toFixed(3)}&longitude=${p[1].toFixed(3)}&hourly=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m&daily=sunrise,sunset&timezone=Europe%2FAmsterdam&forecast_days=3&wind_speed_unit=kmh`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error('Weer niet beschikbaar');
  const j = (await r.json()) as {
    hourly: { time: string[]; temperature_2m: number[]; precipitation: number[]; weather_code: number[]; wind_speed_10m: number[]; wind_gusts_10m: number[]; wind_direction_10m: number[] };
    daily: { sunrise: string[]; sunset: string[] };
  };
  const hours: WeatherHour[] = j.hourly.time.map((t, i) => ({
    time: t,
    temp: j.hourly.temperature_2m[i],
    wind: j.hourly.wind_speed_10m[i],
    gust: j.hourly.wind_gusts_10m[i],
    dir: j.hourly.wind_direction_10m[i],
    rain: j.hourly.precipitation[i],
    code: j.hourly.weather_code[i],
  }));
  const w: Weather = { place: p, fetched: Date.now(), hours, sunrise: j.daily.sunrise?.[0], sunset: j.daily.sunset?.[0] };
  cache.set(key, w);
  return w;
}

/** Beoordeling van de vaaromstandigheden voor de komende uren */
export function assess(w: Weather, fromIso?: string, hoursAhead = 6): { level: 'ok' | 'let_op' | 'niet' ; text: string; maxGust: number; maxWind: number; rain: number; thunder: boolean } {
  const start = fromIso ? new Date(fromIso).getTime() : Date.now();
  const sel = w.hours.filter((h) => {
    const t = new Date(h.time).getTime();
    return t >= start - 3600e3 && t <= start + hoursAhead * 3600e3;
  });
  const maxGust = Math.max(0, ...sel.map((h) => h.gust));
  const maxWind = Math.max(0, ...sel.map((h) => h.wind));
  const rain = sel.reduce((a, h) => a + h.rain, 0);
  const thunder = sel.some((h) => h.code >= 95);
  const bft = beaufort(maxWind);
  const gbft = beaufort(maxGust);
  if (thunder) return { level: 'niet', text: 'Onweer verwacht. Niet uitvaren of dicht bij een haven blijven.', maxGust, maxWind, rain, thunder };
  if (bft >= 6 || gbft >= 7) return { level: 'niet', text: `Windkracht ${bft} met vlagen tot ${gbft}. Voor open boten en de grote plassen te veel.`, maxGust, maxWind, rain, thunder };
  if (bft >= 5 || gbft >= 6) return { level: 'let_op', text: `Windkracht ${bft} met vlagen tot ${gbft}. Golfslag op de plassen, aanleggen wordt lastig.`, maxGust, maxWind, rain, thunder };
  if (rain > 5) return { level: 'let_op', text: `Windkracht ${bft}, maar ${rain.toFixed(0)} mm regen verwacht. Regenkleding mee.`, maxGust, maxWind, rain, thunder };
  return { level: 'ok', text: `Windkracht ${bft}${gbft > bft ? ` (vlagen ${gbft})` : ''}, goed vaarweer.`, maxGust, maxWind, rain, thunder };
}
