import { useEffect, useMemo, useRef } from 'react';
import type { Graph } from '../graph';
import type { LatLng, Poi } from '../types';
import type { Notify } from '../notice';
import { formatDecimalDeg, formatDegMin, formatDistance } from '../geo';
import { ALARM_NUMBER, EMERGENCY_TEXT, KNRM_URL, KUSTWACHT_NUMBER, describeLocation, maydayLines, shareText, tel } from '../emergency';

interface Props {
  gps: { pos: LatLng; acc: number } | null;
  gpsError: string | null;
  graph: Graph | null;
  pois: Poi[];
  boatName: string;
  onClose: () => void;
  notify: Notify;
}

/** Noodscherm (VEI-01): bellen, positie doorgeven en Mayday voorlezen. Altijd gratis en zonder internet. */
export default function EmergencyView({ gps, gpsError, graph, pois, boatName, onClose, notify }: Props) {
  const pos = gps?.pos ?? null;
  // omschrijving alleen opnieuw als je echt verplaatst bent, niet bij elke GPS-positie
  const key = pos ? `${pos[0].toFixed(4)},${pos[1].toFixed(4)}` : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const desc = useMemo(() => (pos ? describeLocation(graph, pois, pos) : null), [key, graph, pois]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const [lat, lon] = pos ? formatDegMin(pos).split(', ') : ['', ''];

  const share = async () => {
    if (!pos || !desc) return;
    const text = shareText(boatName, pos, desc);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      notify('Positie gekopieerd. Plak hem in een sms of chat.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') notify('Delen lukt niet. Lees je positie voor of neem hem over.', 'fout');
    }
  };

  return (
    <div className="emergency" role="dialog" aria-modal="true" aria-labelledby="nood-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="em-inner">
        <div className="em-head">
          <h2 id="nood-title" ref={headingRef} tabIndex={-1}>{EMERGENCY_TEXT.title}</h2>
          <button className="em-close" onClick={onClose}>Sluiten</button>
        </div>

        <a className="em-call" href={tel(ALARM_NUMBER)}>
          <span aria-hidden="true">📞</span> Bel {ALARM_NUMBER}
          <small>{EMERGENCY_TEXT.lifeThreat}</small>
        </a>

        <section className="em-card em-pos" aria-live="polite">
          <small className="em-label">Jouw positie</small>
          {pos ? (
            <>
              <b className="em-dmm">
                <span>{lat}</span> <span>{lon}</span>
              </b>
              <span className="em-dec">{formatDecimalDeg(pos)}</span>
              {desc?.waterway && <span className="em-where">{desc.waterway}</span>}
              {desc?.near && <span className="em-where">{desc.near.text}</span>}
              {gps!.acc > 0 && <small className="muted">Nauwkeurig tot {formatDistance(gps!.acc)}</small>}
              <div className="actions">
                <button className="primary" onClick={share}>Deel positie</button>
                <a className="em-sms" href={`sms:?&body=${encodeURIComponent(desc ? shareText(boatName, pos, desc) : '')}`}>Sms</a>
              </div>
            </>
          ) : gpsError ? (
            <p className="em-gps-error">{gpsError} Geef je positie dan door aan de hand van wat je ziet: de naam van de vaarweg, een brug of een haven.</p>
          ) : (
            <p>Positie zoeken… Ga zo mogelijk naar buiten of houd je telefoon vrij van afdekking.</p>
          )}
        </section>

        <section className="em-card">
          <p>{EMERGENCY_TEXT.noLifeThreat}</p>
          <div className="actions">
            <a className="em-btn" href={tel(KUSTWACHT_NUMBER)}>Bel Kustwacht {KUSTWACHT_NUMBER}</a>
            <a className="em-btn" href={KNRM_URL} target="_blank" rel="noreferrer">KNRM (website)</a>
          </div>
        </section>

        <section className="em-card">
          <h3>Mayday via de marifoon</h3>
          <p className="small">{EMERGENCY_TEXT.vhf}</p>
          <ol className="em-mayday">
            {maydayLines(boatName, pos, desc).map((l, i) => (
              <li key={i} className={l.startsWith('[') ? 'muted' : ''}>{l}</li>
            ))}
          </ol>
        </section>

        <p className="muted small">{EMERGENCY_TEXT.offline}</p>
      </div>
    </div>
  );
}
