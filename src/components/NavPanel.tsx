import type { NavState } from '../navigation';
import type { RouteResult } from '../types';
import { formatDistance, formatDuration, formatSpeed, compassName } from '../geo';
import { STEP_ICONS } from './RoutePanel';

interface Props {
  route: RouteResult;
  nav: NavState | null;
  speedKmh: number | null;
  heading: number | null;
  gpsError: string | null;
  onStop: () => void;
  onRecalc: () => void;
  following: boolean;
  onFollow: () => void;
  voice: boolean;
  onVoice: () => void;
}

export default function NavPanel({ route, nav, speedKmh, heading, gpsError, onStop, onRecalc, following, onFollow, voice, onVoice }: Props) {
  const next = nav?.next;
  const eta = nav ? new Date(Date.now() + nav.remainingTime * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const off = nav ? nav.offRoute > 120 : false;
  return (
    <>
      <div className="nav-top">
        {gpsError ? (
          <div className="nav-instruction error">
            <span className="nav-icon">⚠️</span>
            <div><b>Geen GPS</b><small>{gpsError}</small></div>
          </div>
        ) : !nav ? (
          <div className="nav-instruction">
            <span className="nav-icon">📡</span>
            <div><b>Wachten op GPS positie…</b><small>Zorg dat locatie is toegestaan</small></div>
          </div>
        ) : off ? (
          <div className="nav-instruction error">
            <span className="nav-icon">↩️</span>
            <div><b>Je bent {formatDistance(nav.offRoute)} van de route</b><small>Vaar terug naar de route of herbereken</small></div>
            <button onClick={onRecalc}>Herbereken</button>
          </div>
        ) : (
          next && (
            <div className={`nav-instruction ${next.kind}`}>
              <span className="nav-icon">{STEP_ICONS[next.kind]}</span>
              <div>
                <small>over {formatDistance(nav.toNext)}</small>
                <b>{next.text}</b>
                {next.detail && <small>{next.detail}</small>}
              </div>
            </div>
          )
        )}
        {nav && !off && route.steps[route.steps.indexOf(nav.next!) + 1] && (
          <div className="nav-then muted">daarna {STEP_ICONS[route.steps[route.steps.indexOf(nav.next!) + 1].kind]} {route.steps[route.steps.indexOf(nav.next!) + 1].text}</div>
        )}
      </div>
      <div className="nav-bottom">
        <div className="nav-stats">
          <div><b>{speedKmh != null ? formatSpeed(speedKmh) : '–'}</b><small>snelheid</small></div>
          <div><b>{nav ? formatDuration(nav.remainingTime) : '–'}</b><small>resterend</small></div>
          <div><b>{nav ? formatDistance(nav.remaining) : '–'}</b><small>afstand</small></div>
          <div><b>{eta}</b><small>aankomst</small></div>
          <div><b>{heading != null ? `${Math.round(heading)}° ${compassName(heading)}` : '–'}</b><small>koers</small></div>
        </div>
        <div className="actions">
          {!following && <button onClick={onFollow}>📍 Volg mij</button>}
          <button onClick={onVoice} title="Gesproken instructies">{voice ? '🔊' : '🔇'}</button>
          <button className="danger" onClick={onStop}>■ Stop</button>
        </div>
      </div>
    </>
  );
}
