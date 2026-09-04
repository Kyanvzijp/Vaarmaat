import type { Trip } from '../types';
import type { Stage } from '../trip';
import { formatDistance, formatDuration } from '../geo';
import { POI_META, poiTitle } from '../pois';
import type { Poi } from '../types';

export function StagesList({ stages, onPoi, onFocus }: { stages: Stage[]; onPoi: (p: Poi) => void; onFocus: (p: [number, number]) => void }) {
  return (
    <div className="stages">
      {stages.map((s) => (
        <div key={s.day} className="stage">
          <div className="stage-head">
            <span className="day">Dag {s.day}</span>
            <b>{s.fromName} → {s.toName}</b>
          </div>
          <small className="muted">{s.startClock} – {s.endClock} · {formatDistance(s.distance)} · {formatDuration(s.duration)} · {s.bridges} bruggen · {s.locks} sluizen</small>
          {s.stop && (
            <button className="stop-btn" onClick={() => { onPoi(s.stop!.poi); onFocus(s.stop!.poi.p); }}>
              🛏️ Overnachten: <b>{poiTitle(s.stop.poi)}</b> <small>({POI_META[s.stop.poi.k].label}{s.stop.poi.t.fee === 'no' ? ', gratis' : ''})</small>
            </button>
          )}
          {!s.stop && s.day < stages.length && <div className="warn soft">Geen haven of aanlegplaats gevonden binnen het dagbudget. Overweeg een langere dag of een tussenstop.</div>}
          {s.alternatives.length > 0 && (
            <div className="alts-small">
              <small className="muted">Ook mogelijk:</small>
              {s.alternatives.map((a) => (
                <button key={a.poi.id} className="chip" onClick={() => { onPoi(a.poi); onFocus(a.poi.p); }}>
                  {POI_META[a.poi.k].icon} {poiTitle(a.poi)}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function TripsView({ trips, onOpen, onDelete, onNew }: { trips: Trip[]; onOpen: (t: Trip) => void; onDelete: (id: string) => void; onNew: () => void }) {
  return (
    <div className="page">
      <div className="page-head">
        <h2>Mijn tochten</h2>
        <p className="muted small">Bewaarde routes met tussenpunten en dagindeling. Plan een route op de kaart en kies "Bewaren als tocht".</p>
      </div>
      <button className="primary" onClick={onNew}>+ Nieuwe tocht plannen</button>
      {trips.length === 0 && <p className="muted small">Nog geen tochten bewaard.</p>}
      <div className="cards">
        {trips.map((t) => (
          <div key={t.id} className="card static">
            <span className="card-icon">🗺️</span>
            <span className="card-body">
              <b>{t.name}</b>
              <small>{t.waypoints.map((w) => w.name).join(' → ')}</small>
              <small className="muted">{t.hoursPerDay} vaaruur per dag · vertrek {t.startTime} · bewaard {new Date(t.createdAt).toLocaleDateString('nl-NL')}</small>
              <span className="log-actions">
                <button className="small-btn primary" onClick={() => onOpen(t)}>Openen</button>
                <button className="small-btn" onClick={() => onDelete(t.id)}>Wis</button>
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
