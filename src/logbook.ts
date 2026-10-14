// Logboek: een gevaren tocht vastleggen, bewaren tijdens het varen en exporteren als GPX.
// Zonder browser-API's, zodat web en app (mobile/) dezelfde code gebruiken.
import type { ActiveTrip, LatLng, LogEntry } from './types';
import { haversine } from './geo';
import { loadActiveTrip, loadLogs, saveActiveTrip, saveLogs, uid } from './store';

/** Een tocht komt pas in het logboek als je minstens zo ver en zo lang gevaren hebt */
export const MIN_LOG_DISTANCE = 200;
export const MIN_LOG_SECONDS = 60;
/** Minimale afstand (m) tussen twee punten van het spoor */
export const TRACK_STEP = 8;
/** Snelheden hierboven (km/u) zijn GPS-sprongen, geen echte vaart; ze tellen niet als topsnelheid */
export const MAX_PLAUSIBLE_KMH = 80;
/** Maximaal aantal punten dat in het logboek bewaard wordt */
const MAX_POINTS = 800;

export function startActiveTrip(from: string, to: string, now = Date.now()): ActiveTrip {
  return { startedAt: now, from, to, track: [], times: [], maxSpeed: 0 };
}

/** Voegt een positie toe als die ver genoeg van het vorige punt ligt. Geeft true als het spoor gegroeid is. */
export function addFix(a: ActiveTrip, pos: LatLng, speedKmh: number | null, now = Date.now()): boolean {
  if (speedKmh != null && speedKmh <= MAX_PLAUSIBLE_KMH && speedKmh > a.maxSpeed) a.maxSpeed = speedKmh;
  const last = a.track[a.track.length - 1];
  if (last && haversine(last, pos) <= TRACK_STEP) return false;
  a.track.push(pos);
  a.times.push(now);
  return true;
}

export function trackDistance(track: LatLng[]): number {
  let d = 0;
  for (let i = 1; i < track.length; i++) d += haversine(track[i - 1], track[i]);
  return d;
}

/** Maakt een logboekitem van een gevaren tocht, of null als hij te kort was */
export function buildLogEntry(a: ActiveTrip, endedAt = Date.now()): LogEntry | null {
  if (a.track.length < 2) return null;
  const distance = trackDistance(a.track);
  const duration = (endedAt - a.startedAt) / 1000;
  if (distance <= MIN_LOG_DISTANCE || duration <= MIN_LOG_SECONDS) return null;
  const every = Math.max(1, Math.ceil(a.track.length / MAX_POINTS));
  const keep = (_: unknown, i: number) => i % every === 0 || i === a.track.length - 1;
  return {
    id: uid(),
    date: new Date(a.startedAt).toISOString(),
    from: a.from,
    to: a.to,
    distance,
    duration,
    maxSpeed: a.maxSpeed,
    avgSpeed: (distance / 1000 / duration) * 3600,
    track: a.track.filter(keep),
    times: a.times.length === a.track.length ? a.times.filter(keep) : undefined,
  };
}

/**
 * Was er nog een tocht bezig toen de app werd afgesloten of crashte? Dan komt die alsnog in het logboek,
 * met als eindtijd het laatste punt van het spoor. Geeft het nieuwe logboekitem terug, of null.
 */
export function recoverActiveTrip(): LogEntry | null {
  const a = loadActiveTrip();
  if (!a) return null;
  saveActiveTrip(null);
  const entry = buildLogEntry(a, a.times[a.times.length - 1] ?? a.startedAt);
  if (entry) saveLogs([entry, ...loadLogs()]);
  return entry;
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** GPX 1.1 met naam, tijd van vertrek en, als bekend, een tijd per punt */
export function toGpx(l: LogEntry): string {
  const withTimes = l.times && l.times.length === l.track.length;
  const pts = l.track
    .map((p, i) => `<trkpt lat="${p[0].toFixed(6)}" lon="${p[1].toFixed(6)}">${withTimes ? `<time>${new Date(l.times![i]).toISOString()}</time>` : ''}</trkpt>`)
    .join('\n');
  const name = xml(`${l.from} naar ${l.to}`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Vaarmaat" xmlns="http://www.topografix.com/GPX/1/1">
<metadata><name>${name}</name><time>${new Date(l.date).toISOString()}</time></metadata>
<trk><name>${name}</name><trkseg>
${pts}
</trkseg></trk>
</gpx>
`;
}

/** Bestandsnaam voor de GPX-export, bijvoorbeeld vaarmaat-2026-07-12.gpx */
export const gpxFileName = (l: LogEntry) => `vaarmaat-${l.date.slice(0, 10)}-${l.id}.gpx`;
