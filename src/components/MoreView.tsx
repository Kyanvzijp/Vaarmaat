import { useState } from 'react';
import { CHECKLISTS } from '../content/lessons';
import { loadChecks, saveChecks, loadLogs, saveLogs, type Settings } from '../store';
import type { BoatProfile, LatLng, LogEntry } from '../types';
import { formatDistance, formatDuration, formatSpeed } from '../geo';
import WeatherCard from './WeatherCard';
import { voiceAvailable } from '../voice';

function gpx(l: LogEntry): string {
  const pts = l.track.map((p) => `<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Vaarmaat" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${l.from} naar ${l.to} (${l.date})</name><trkseg>\n${pts}\n</trkseg></trk></gpx>`;
}

export function Checklists() {
  const [checks, setChecks] = useState<Record<string, boolean>>(loadChecks);
  const toggle = (k: string) => {
    const c = { ...checks, [k]: !checks[k] };
    setChecks(c);
    saveChecks(c);
  };
  const reset = (id: string) => {
    const c = { ...checks };
    for (const k of Object.keys(c)) if (k.startsWith(id + ':')) delete c[k];
    setChecks(c);
    saveChecks(c);
  };
  return (
    <>
      {CHECKLISTS.map((cl) => {
        const done = cl.items.filter((_, i) => checks[`${cl.id}:${i}`]).length;
        return (
          <details key={cl.id} className="checklist">
            <summary>
              <span>{cl.icon} {cl.title}</span>
              <small className={done === cl.items.length ? 'ok' : ''}>{done}/{cl.items.length}</small>
            </summary>
            <ul>
              {cl.items.map((it, i) => (
                <li key={i}>
                  <label className="toggle">
                    <input type="checkbox" checked={!!checks[`${cl.id}:${i}`]} onChange={() => toggle(`${cl.id}:${i}`)} />
                    <span>{it}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button className="small-btn" onClick={() => reset(cl.id)}>Lijst leegmaken</button>
          </details>
        );
      })}
    </>
  );
}

export function Logbook() {
  const [logs, setLogs] = useState<LogEntry[]>(loadLogs);
  const remove = (id: string) => {
    const l = logs.filter((x) => x.id !== id);
    setLogs(l);
    saveLogs(l);
  };
  const download = (l: LogEntry) => {
    const blob = new Blob([gpx(l)], { type: 'application/gpx+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vaarmaat-${l.date}.gpx`;
    a.click();
  };
  const total = logs.reduce((a, l) => a + l.distance, 0);
  const hours = logs.reduce((a, l) => a + l.duration, 0);
  if (logs.length === 0) return <p className="muted small">Nog geen tochten in het logboek. Start navigatie en je tocht wordt automatisch vastgelegd: afstand, tijd, gemiddelde en topsnelheid en het gevaren spoor.</p>;
  return (
    <>
      <p className="small">Totaal {formatDistance(total)} in {formatDuration(hours)} over {logs.length} tocht{logs.length === 1 ? '' : 'en'}.</p>
      {logs.map((l) => (
        <div key={l.id} className="log">
          <div>
            <b>{l.from} → {l.to}</b>
            <small className="muted">{new Date(l.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</small>
            <small>{formatDistance(l.distance)} · {formatDuration(l.duration)} · gem. {formatSpeed(l.avgSpeed)} · max {formatSpeed(l.maxSpeed)}</small>
          </div>
          <div className="log-actions">
            <button className="small-btn" onClick={() => download(l)}>GPX</button>
            <button className="small-btn" onClick={() => remove(l.id)}>Wis</button>
          </div>
        </div>
      ))}
    </>
  );
}

interface Props {
  settings: Settings;
  onSettings: (s: Settings) => void;
  profile: BoatProfile;
  onEditProfile: () => void;
  weatherPoint: LatLng | null;
}

export default function MoreView({ settings, onSettings, profile, onEditProfile, weatherPoint }: Props) {
  const [tab, setTab] = useState<'weer' | 'check' | 'log' | 'inst'>('weer');
  return (
    <div className="page">
      <div className="page-head">
        <h2>Aan boord</h2>
      </div>
      <div className="subtabs">
        <button className={tab === 'weer' ? 'active' : ''} onClick={() => setTab('weer')}>🌤️ Weer</button>
        <button className={tab === 'check' ? 'active' : ''} onClick={() => setTab('check')}>✅ Checklists</button>
        <button className={tab === 'log' ? 'active' : ''} onClick={() => setTab('log')}>📒 Logboek</button>
        <button className={tab === 'inst' ? 'active' : ''} onClick={() => setTab('inst')}>⚙️ Instellingen</button>
      </div>
      {tab === 'weer' && <WeatherCard point={weatherPoint} label="Weer en wind" />}
      {tab === 'check' && <Checklists />}
      {tab === 'log' && <Logbook />}
      {tab === 'inst' && (
        <div className="settings">
          <button className="card" onClick={onEditProfile}>
            <span className="card-icon">🛥️</span>
            <span className="card-body">
              <b>{profile.name}</b>
              <small>hoogte {profile.height.toFixed(2).replace('.', ',')} m · diepgang {profile.draft.toFixed(2).replace('.', ',')} m · {profile.speed} km/u</small>
            </span>
          </button>
          <label className="toggle">
            <input type="checkbox" checked={settings.voice} disabled={!voiceAvailable()} onChange={(e) => onSettings({ ...settings, voice: e.target.checked })} />
            <span>Gesproken instructies tijdens navigatie{voiceAvailable() ? '' : ' (niet beschikbaar in deze browser)'}</span>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={settings.showPois} onChange={(e) => onSettings({ ...settings, showPois: e.target.checked })} />
            <span>Havens, aanlegplaatsen en voorzieningen op de kaart tonen</span>
          </label>
          <label className="field">
            <span>Voorbereiding op sluis of brug tonen vanaf</span>
            <span className="field-input">
              <input type="number" min={5} max={60} step={5} value={settings.prepMinutes} onChange={(e) => onSettings({ ...settings, prepMinutes: parseInt(e.target.value) || 20 })} />
              <em>min van tevoren</em>
            </span>
          </label>
          <div className="grid2">
            <label className="field">
              <span>Vaaruren per dag (tochtplanner)</span>
              <span className="field-input">
                <input type="number" min={1} max={14} step={0.5} value={settings.hoursPerDay} onChange={(e) => onSettings({ ...settings, hoursPerDay: parseFloat(e.target.value) || 5 })} />
                <em>uur</em>
              </span>
            </label>
            <label className="field">
              <span>Standaard vertrektijd</span>
              <span className="field-input">
                <input type="time" value={settings.startTime} onChange={(e) => onSettings({ ...settings, startTime: e.target.value || '10:00' })} />
              </span>
            </label>
          </div>
          <div className="about muted small">
            <p><b>Over Vaarmaat</b></p>
            <p>Vaarwegen, bruggen, sluizen, havens en aanlegplaatsen: © OpenStreetMap bijdragers (ODbL). Zeekaartsymbolen: OpenSeaMap. Weer: Open-Meteo. Regelkennis op basis van het Binnenvaartpolitiereglement en Varen doe je Samen.</p>
            <p>Doorvaarthoogtes en bedieningstijden kunnen afwijken van de werkelijkheid. Controleer altijd ter plaatse en volg aanwijzingen van brug- en sluiswachters. De app is een hulpmiddel, de schipper blijft verantwoordelijk.</p>
            <p>De app werkt offline nadat hij één keer geladen is: routes, uitleg en de kaart waar je eerder bent geweest. Voeg hem toe aan je beginscherm via het deelmenu van je browser.</p>
          </div>
        </div>
      )}
    </div>
  );
}
