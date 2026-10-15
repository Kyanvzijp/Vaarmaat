import { nextAnnounced, type NavState } from '../navigation';
import type { RouteResult } from '../types';
import { formatDistance, formatDuration, formatSpeed, compassName } from '../geo';
import { STEP_ICONS } from '../stepIcons';

interface Props {
  /** kan tijdelijk ontbreken; de Stop-knop blijft dan altijd beschikbaar */
  route: RouteResult | undefined;
  nav: NavState | null;
  destination: string;
  speedKmh: number | null;
  heading: number | null;
  gpsError: string | null;
  onStop: () => void;
  onRecalc: () => void;
  following: boolean;
  onFollow: () => void;
  voice: boolean;
  onVoice: () => void;
  onEmergency: () => void;
}

/** Binnen deze afstand (m) van het eindpunt ben je aangekomen */
const ARRIVED = 30;

const clock = (ms: number) => new Date(ms).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

export default function NavPanel({ route, nav, destination, speedKmh, heading, gpsError, onStop, onRecalc, following, onFollow, voice, onVoice, onEmergency }: Props) {
  const next = nav?.next;
  const off = nav ? nav.offRoute > 120 : false;
  // alleen aangekomen als je ook echt op de route bent: ver ernaast valt je positie op het eindpunt
  const arrived = !!nav && !off && nav.remaining < ARRIVED;
  const leg = route?.access?.end;
  const then = route && next && !off && !arrived ? nextAnnounced(route, next) : undefined;
  return (
    <>
      <div className="nav-top" aria-live="polite">
        {!route ? (
          <div className="nav-instruction error">
            <span className="nav-icon" aria-hidden="true">⚠️</span>
            <div><b>Geen route</b><small>Herbereken vanaf je positie of stop de navigatie</small></div>
            <button onClick={onRecalc}>Herbereken</button>
          </div>
        ) : gpsError ? (
          <div className="nav-instruction error">
            <span className="nav-icon" aria-hidden="true">⚠️</span>
            <div><b>Geen GPS</b><small>{gpsError}</small></div>
          </div>
        ) : !nav ? (
          <div className="nav-instruction">
            <span className="nav-icon" aria-hidden="true">📡</span>
            <div><b>Wachten op GPS positie…</b><small>Zorg dat locatie is toegestaan</small></div>
          </div>
        ) : arrived ? (
          <div className="nav-instruction arrive">
            <span className="nav-icon" aria-hidden="true">🏁</span>
            <div>
              <b>Je bent aangekomen</b>
              <small>{leg ? `Nog ${formatDistance(leg.walkDistance)} lopen naar ${leg.name}` : destination}</small>
            </div>
            <button onClick={onStop}>Klaar</button>
          </div>
        ) : off ? (
          <div className="nav-instruction error">
            <span className="nav-icon" aria-hidden="true">↩️</span>
            <div><b>Je bent {formatDistance(nav.offRoute)} van de route</b><small>Vaar terug naar de route of herbereken</small></div>
            <button onClick={onRecalc}>Herbereken</button>
          </div>
        ) : (
          next && (
            <div className={`nav-instruction ${next.kind}`}>
              <span className="nav-icon" aria-hidden="true">{STEP_ICONS[next.kind]}</span>
              <div>
                <small>over {formatDistance(nav.toNext)}</small>
                <b>{next.text}</b>
                {next.detail && <small>{next.detail}</small>}
              </div>
            </div>
          )
        )}
        {then && (
          <div className="nav-then muted">daarna <span aria-hidden="true">{STEP_ICONS[then.kind]}</span> {then.text}</div>
        )}
      </div>
      <div className="nav-bottom">
        <div className="nav-stats">
          <div><b>{speedKmh != null ? formatSpeed(speedKmh) : '–'}</b><small>snelheid</small></div>
          <div><b>{nav ? formatDuration(nav.remainingTime) : '–'}</b><small>resterend</small></div>
          <div><b>{nav ? formatDistance(nav.remaining) : '–'}</b><small>afstand</small></div>
          <div><b>{nav ? clock(nav.eta) : '--:--'}</b><small>aankomst</small></div>
          <div><b>{heading != null ? `${Math.round(heading)}° ${compassName(heading)}` : '–'}</b><small>koers</small></div>
        </div>
        <div className="actions">
          {!following && <button onClick={onFollow}>📍 Volg mij</button>}
          <button onClick={onVoice} title="Gesproken instructies" aria-label={voice ? 'Gesproken instructies uitzetten' : 'Gesproken instructies aanzetten'} aria-pressed={voice}>{voice ? '🔊' : '🔇'}</button>
          <button className="nav-sos" onClick={onEmergency} aria-label="Noodscherm openen">Nood</button>
          <button className="danger" onClick={onStop}>■ Stop</button>
        </div>
      </div>
    </>
  );
}
