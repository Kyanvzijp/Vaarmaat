import { useEffect, useState } from 'react';
import type { LatLng } from '../types';
import { assess, beaufort, fetchWeather, weatherIcon, weatherText, windName, type Weather } from '../weather';

export default function WeatherCard({ point, label, compact }: { point: LatLng | null; label?: string; compact?: boolean }) {
  const [w, setW] = useState<Weather | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!point) return;
    const ac = new AbortController();
    setErr(null);
    fetchWeather(point, ac.signal)
      .then(setW)
      .catch((e: Error) => {
        if (!ac.signal.aborted) setErr(e.message);
      });
    return () => ac.abort();
  }, [point]);
  if (!point) return <p className="muted small">Kies een vertrekpunt of bestemming voor het weer.</p>;
  if (err) return <p className="muted small">Weer niet beschikbaar ({err}). Controleer je verbinding.</p>;
  if (!w) return <p className="muted small">Weer laden…</p>;
  const a = assess(w);
  const now = Date.now();
  const upcoming = w.hours.filter((h) => new Date(h.time).getTime() >= now - 3600e3).slice(0, compact ? 8 : 24);
  return (
    <div className={`weather ${a.level}`}>
      <div className="weather-head">
        <b>{label ?? 'Weer op de route'}</b>
        <span className={`badge ${a.level}`}>{a.level === 'ok' ? 'Goed vaarweer' : a.level === 'let_op' ? 'Let op' : 'Niet varen'}</span>
      </div>
      <p className="small">{a.text}</p>
      <div className="weather-hours">
        {upcoming.map((h) => (
          <div key={h.time} className="wh">
            <small>{new Date(h.time).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</small>
            <span title={weatherText(h.code)}>{weatherIcon(h.code)}</span>
            <b>{Math.round(h.temp)}°</b>
            <small style={{ transform: `rotate(${h.dir}deg)`, display: 'inline-block' }}>↓</small>
            <small>{windName(h.dir)} {beaufort(h.wind)}{beaufort(h.gust) > beaufort(h.wind) ? `-${beaufort(h.gust)}` : ''}</small>
            {h.rain > 0.1 && <small>💧{h.rain.toFixed(1)}</small>}
          </div>
        ))}
      </div>
      {w.sunrise && w.sunset && (
        <p className="muted small">Zon op {new Date(w.sunrise).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}, onder {new Date(w.sunset).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}. Verlichting verplicht tussen zonsondergang en zonsopkomst. Bron: Open-Meteo.</p>
      )}
    </div>
  );
}
