import type { RouteResult, RouteStep, BoatProfile, Poi, LatLng } from '../types';
import { formatDistance, formatDuration, formatHeight } from '../geo';
import type { Stage } from '../trip';
import { StagesList } from './TripsView';
import { POI_META, poiTitle } from '../pois';
import WeatherCard from './WeatherCard';
import { OpsFacts } from './ApproachCard';

export const STEP_ICONS: Record<RouteStep['kind'], string> = {
  depart: '🚩',
  left: '↰',
  right: '↱',
  slight_left: '↖',
  slight_right: '↗',
  sharp_left: '⬑',
  sharp_right: '⬏',
  straight: '↑',
  uturn: '↶',
  bridge: '🌉',
  movable_bridge: '⏳',
  lock: '🔒',
  arrive: '🏁',
};

interface Props {
  routes: RouteResult[];
  selected: number;
  profile: BoatProfile;
  onSelect: (i: number) => void;
  onStart: () => void;
  onStepClick: (s: RouteStep) => void;
  onClose: () => void;
  expanded: boolean;
  onToggle: () => void;
  stages: Stage[];
  multiDay: boolean;
  onMultiDay: (v: boolean) => void;
  hoursPerDay: number;
  onHours: (h: number) => void;
  onSaveTrip: () => void;
  destPois: { poi: Poi; dist: number }[];
  onPoi: (p: Poi) => void;
  onFocus: (p: LatLng) => void;
  weatherPoint: LatLng | null;
  tab: 'route' | 'stappen' | 'tocht' | 'aanleggen' | 'weer';
  onTab: (t: Props['tab']) => void;
}

export default function RoutePanel(p: Props) {
  const { routes, selected, profile } = p;
  const r = routes[selected];
  if (!r) return null;
  const arrival = new Date(Date.now() + r.duration * 1000);
  const arrivalStr = arrival.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  const fits = r.lowestBridge == null || r.lowestBridge >= profile.height + profile.margin;
  const long = r.duration > p.hoursPerDay * 3600;
  const opsBridges = r.bridges.filter((b) => b.movable);
  return (
    <div className={`sheet route ${p.expanded ? 'expanded' : ''}`}>
      <div className="sheet-grip" onClick={p.onToggle} />
      <div className="sheet-head">
        <div>
          <h2>{formatDuration(r.duration)} <span className="muted">({formatDistance(r.distance)})</span></h2>
          <p className="muted small">
            {long ? `${Math.ceil(r.duration / 3600 / p.hoursPerDay)} dagen bij ${p.hoursPerDay} u/dag` : `Aankomst rond ${arrivalStr}`} bij {profile.speed} km/u · {r.bridges.length} bruggen · {r.locks.length} sluizen
            {r.lowestBridge != null && ` · laagste brug ${formatHeight(r.lowestBridge)}`}
          </p>
        </div>
        <button className="icon-btn" onClick={p.onClose} aria-label="Route sluiten">×</button>
      </div>
      {routes.length > 1 && (
        <div className="alts">
          {routes.map((alt, i) => (
            <button key={alt.id} className={`alt ${i === selected ? 'active' : ''}`} onClick={() => p.onSelect(i)}>
              <b>{alt.label}</b>
              <span>{formatDuration(alt.duration)} · {formatDistance(alt.distance)}</span>
              <small>{alt.bridges.length} bruggen{alt.lowestBridge != null ? ` · min ${formatHeight(alt.lowestBridge)}` : ''}</small>
            </button>
          ))}
        </div>
      )}
      {!fits && <div className="warn">Let op: op deze route zit een brug lager dan je boot; die moet open.</div>}
      {r.warnings.map((w, i) => (
        <div key={i} className="warn soft">{w}</div>
      ))}
      <div className="actions">
        <button className="primary" onClick={p.onStart}>▶ Start navigatie</button>
        <button onClick={p.onSaveTrip}>💾 Bewaren</button>
      </div>
      <div className="subtabs small">
        {(['route', 'stappen', 'tocht', 'aanleggen', 'weer'] as const).map((t) => (
          <button key={t} className={p.tab === t ? 'active' : ''} onClick={() => { p.onTab(t); if (!p.expanded) p.onToggle(); }}>
            {t === 'route' ? 'Route' : t === 'stappen' ? `Afslagen (${r.steps.length})` : t === 'tocht' ? (long ? `Dagindeling (${Math.max(1, p.stages.length)})` : 'Tocht') : t === 'aanleggen' ? 'Aanleggen' : 'Weer'}
          </button>
        ))}
      </div>

      {p.tab === 'route' && (
        <div className="route-info">
          {r.waterways.length > 0 && <p className="small">Via {r.waterways.join(' → ')}</p>}
          {(opsBridges.length > 0 || r.locks.length > 0) && (
            <>
              <b className="small">Beweegbare bruggen en sluizen op de route</b>
              <ul className="ops-list">
                {r.steps.filter((s) => s.kind === 'movable_bridge' || s.kind === 'lock').map((s, i) => {
                  const obj = s.kind === 'lock' ? r.locks.find((l) => Math.abs(l.at - s.at) < 1) : r.bridges.find((b) => Math.abs(b.at - s.at) < 1);
                  return (
                    <li key={i} onClick={() => p.onStepClick(s)}>
                      <span className="step-icon">{STEP_ICONS[s.kind]}</span>
                      <div>
                        <b>{s.text.replace('Wacht op opening ', '').replace('Schut door ', '')}</b>
                        <small className="muted">{formatDistance(s.at)}{s.detail ? ` · ${s.detail}` : ''}</small>
                        <OpsFacts ops={obj?.ops} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {p.tab === 'stappen' && (
        <ol className="steps">
          {r.steps.map((s, i) => (
            <li key={i} className={s.kind} onClick={() => p.onStepClick(s)}>
              <span className="step-icon">{STEP_ICONS[s.kind]}</span>
              <span className="step-body">
                <b>{s.text}</b>
                {s.detail && <small>{s.detail}</small>}
                {s.kind !== 'arrive' && <small className="muted">daarna {formatDistance(s.dist)}</small>}
              </span>
              <span className="step-at muted">{formatDistance(s.at)}</span>
            </li>
          ))}
        </ol>
      )}

      {p.tab === 'tocht' && (
        <div className="trip-plan">
          <label className="toggle">
            <input type="checkbox" checked={p.multiDay} onChange={(e) => p.onMultiDay(e.target.checked)} />
            <span>Verdeel in dagetappes met overnachtingen</span>
          </label>
          <label className="field">
            <span>Vaaruren per dag</span>
            <span className="field-input">
              <input type="number" min={1} max={14} step={0.5} value={p.hoursPerDay} onChange={(e) => p.onHours(parseFloat(e.target.value) || 5)} />
              <em>uur</em>
            </span>
          </label>
          {p.multiDay ? <StagesList stages={p.stages} onPoi={p.onPoi} onFocus={p.onFocus} /> : <p className="muted small">Zet de dagindeling aan om de route op te knippen in etappes met een voorstel voor jachthavens of aanlegplaatsen om te overnachten.</p>}
        </div>
      )}

      {p.tab === 'aanleggen' && (
        <div className="dest-pois">
          <p className="small">Aanleggen in de buurt van je bestemming:</p>
          {p.destPois.length === 0 && <p className="muted small">Geen jachthaven of aanlegplaats bekend binnen 2,5 km. Kijk op de kaart of kies een andere bestemming.</p>}
          {p.destPois.map(({ poi, dist }) => (
            <button key={poi.id} className="card" onClick={() => { p.onPoi(poi); p.onFocus(poi.p); }}>
              <span className="card-icon" style={{ color: POI_META[poi.k].color }}>{POI_META[poi.k].icon}</span>
              <span className="card-body">
                <b>{poiTitle(poi)}</b>
                <small>{POI_META[poi.k].label} · {formatDistance(dist)} van de bestemming{poi.t.fee === 'no' ? ' · gratis' : poi.t.fee === 'yes' ? ' · liggeld' : ''}{poi.t.maxstay ? ` · max ${poi.t.maxstay}` : ''}</small>
              </span>
            </button>
          ))}
        </div>
      )}

      {p.tab === 'weer' && <WeatherCard point={p.weatherPoint} label="Weer bij vertrek" compact />}
    </div>
  );
}
