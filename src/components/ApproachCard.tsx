import type { OpsInfo } from '../types';
import { LESSONS } from '../content/lessons';
import { formatDistance, formatHeight } from '../geo';

export interface Approach {
  kind: 'lock' | 'movable_bridge';
  name: string;
  /** afstand (m) */
  dist: number;
  /** minuten tot aankomst */
  minutes: number;
  height: number | null;
  ops?: OpsInfo;
  key: string;
}

export function OpsFacts({ ops }: { ops?: OpsInfo }) {
  if (!ops) return <small className="muted">Geen bedieningsinformatie bekend. Kijk op het bord bij het object of in de app van de beheerder.</small>;
  return (
    <dl className="facts">
      {ops.vhf && (
        <>
          <dt>Marifoon</dt>
          <dd>kanaal {ops.vhf}</dd>
        </>
      )}
      {ops.oh && (
        <>
          <dt>Bediening</dt>
          <dd>{ops.oh}</dd>
        </>
      )}
      {ops.tel && (
        <>
          <dt>Telefoon</dt>
          <dd><a href={`tel:${ops.tel.replace(/\s/g, '')}`}>{ops.tel}</a></dd>
        </>
      )}
      {ops.op && (
        <>
          <dt>Beheerder</dt>
          <dd>{ops.op}</dd>
        </>
      )}
      {ops.self && (
        <>
          <dt>Bediening</dt>
          <dd>zelfbediening</dd>
        </>
      )}
      {ops.web && (
        <>
          <dt>Website</dt>
          <dd><a href={ops.web} target="_blank" rel="noreferrer">{ops.web.replace(/^https?:\/\//, '').slice(0, 40)}</a></dd>
        </>
      )}
      {ops.note && (
        <>
          <dt>Info</dt>
          <dd>{ops.note}</dd>
        </>
      )}
    </dl>
  );
}

export default function ApproachCard({ a, onOpenLesson, onDismiss }: { a: Approach; onOpenLesson: (id: string) => void; onDismiss: () => void }) {
  const lesson = LESSONS.find((l) => l.id === (a.kind === 'lock' ? 'sluis' : 'brug'))!;
  return (
    <div className={`approach ${a.kind}`}>
      <div className="approach-head">
        <span className="nav-icon">{a.kind === 'lock' ? '🔒' : '🌉'}</span>
        <div>
          <small>Over ongeveer {a.minutes} min · {formatDistance(a.dist)}</small>
          <b>{a.kind === 'lock' ? 'Sluis' : 'Beweegbare brug'}: {a.name}</b>
          {a.height != null && <small>doorvaarthoogte {formatHeight(a.height)}</small>}
        </div>
        <button className="icon-btn" onClick={onDismiss} aria-label="Sluiten">×</button>
      </div>
      <OpsFacts ops={a.ops} />
      <b className="small">Voorbereiden</b>
      <ul className="quick-list">
        {lesson.quick.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ul>
      <div className="actions">
        <button className="primary" onClick={() => onOpenLesson(lesson.id)}>{lesson.icon} Uitleg: {lesson.title}</button>
      </div>
    </div>
  );
}
