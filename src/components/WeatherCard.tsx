import { useEffect, useState } from 'react';
import type { LatLng } from '../types';
import { assess, beaufort, fetchWeather, weatherGridPoint, weatherIcon, weatherKey, weatherText, windName, type Weather } from '../weather';
import { useNow } from '../useNow';

type Result = { key: string; w?: Weather; failed?: boolean };

export default function WeatherCard({ point, label, compact }: { point: LatLng | null; label?: string; compact?: boolean }) {
  // het weer hangt aan een rastervak van ongeveer 2 km, zodat een nieuwe GPS-positie het niet steeds opnieuw ophaalt
  const key = point ? weatherKey(point) : null;
  const [attempt, setAttempt] = useState(0);
  const [res, setRes] = useState<Result | null>(null);
  const now = useNow(60000);
  useEffect(() => {
    if (!key || !point) return;
    const ac = new AbortController();
    fetchWeather(weatherGridPoint(point), ac.signal)
      .then((w) => setRes({ key, w }))
      .catch(() => {
        if (!ac.signal.aborted) setRes({ key, failed: true });
      });
    return () => ac.abort();
    // point zelf hoort niet in de afhankelijkheden: alleen een ander rastervak haalt het weer opnieuw op
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);
  if (!point) return <p className="muted small">Kies een vertrekpunt of bestemming voor het weer.</p>;
  const cur = res?.key === key ? res : null;
  if (cur?.failed)
    return (
      <p className="muted small">
        Het weer is nu niet beschikbaar. Controleer je verbinding en probeer het opnieuw.{' '}
        <button className="small-btn" onClick={() => { setRes(null); setAttempt((a) => a + 1); }}>Opnieuw</button>
      </p>
    );
  const w = cur?.w;
  if (!w) return <p className="muted small">Weer laden…</p>;
  const a = assess(w);
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
            <span title={weatherText(h.code)} aria-label={weatherText(h.code)} role="img">{weatherIcon(h.code)}</span>
            <b>{Math.round(h.temp)}°</b>
            <small style={{ transform: `rotate(${h.dir}deg)`, display: 'inline-block' }} aria-hidden="true">↓</small>
            <small>{windName(h.dir)} {beaufort(h.wind)}{beaufort(h.gust) > beaufort(h.wind) ? `-${beaufort(h.gust)}` : ''}</small>
            {h.rain > 0.1 && <small>💧{h.rain.toFixed(1).replace('.', ',')}</small>}
          </div>
        ))}
      </div>
      {w.sunrise && w.sunset && (
        <p className="muted small">Zon op {new Date(w.sunrise).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}, onder {new Date(w.sunset).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}. Verlichting verplicht tussen zonsondergang en zonsopkomst. Bron: Open-Meteo.</p>
      )}
    </div>
  );
}
