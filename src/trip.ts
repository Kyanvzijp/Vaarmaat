import type { Graph } from './graph';
import { computeRoutes } from './routing';
import type { BoatProfile, LatLng, Poi, RouteResult } from './types';
import { OVERNIGHT_KINDS, poisAlongRoute } from './pois';
import { landLeg } from './lastmile';
import { formatDistance, formatDuration } from './geo';

export interface Stage {
  day: number;
  /** cumulatieve afstand op de route waar deze etappe begint/eindigt */
  fromAt: number;
  toAt: number;
  fromName: string;
  toName: string;
  distance: number;
  duration: number;
  bridges: number;
  locks: number;
  /** voorgestelde overnachting (null bij laatste etappe) */
  stop: { poi: Poi; dist: number } | null;
  /** alternatieve havens rond het einde */
  alternatives: { poi: Poi; dist: number; at: number }[];
  startClock: string;
  endClock: string;
}

/** Voeg meerdere routes achter elkaar (waypoints) */
export function concatRoutes(parts: RouteResult[]): RouteResult {
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const coords: LatLng[] = [...first.coords];
  const cum = [...first.cum];
  const steps = first.steps.map((s) => ({ ...s }));
  const bridges = first.bridges.map((b) => ({ ...b }));
  const locks = first.locks.map((l) => ({ ...l }));
  const edgeIds = [...first.edgeIds];
  const nodeIds = [...first.nodeIds];
  let distance = first.distance;
  let duration = first.duration;
  let sailTime = first.sailTime;
  let waitTime = first.waitTime;
  const waterways = [...first.waterways];
  let unknown = first.unknownBridges;
  let lowest = first.lowestBridge;
  for (let k = 1; k < parts.length; k++) {
    const p = parts[k];
    const off = distance;
    // laatste 'arrive' stap van vorige deel wordt een tussenstop
    const arrive = steps.pop()!;
    steps.push({ ...arrive, kind: 'straight', text: `Tussenstop ${k}: ${arrive.text.replace('Bestemming bereikt', 'via')}`, dist: 0 });
    for (let i = 1; i < p.coords.length; i++) {
      coords.push(p.coords[i]);
      cum.push(off + p.cum[i]);
    }
    for (const s of p.steps) {
      if (s.kind === 'depart') continue;
      steps.push({ ...s, at: s.at + off, idx: s.idx + coords.length - p.coords.length });
    }
    for (const b of p.bridges) bridges.push({ ...b, at: b.at + off });
    for (const l of p.locks) locks.push({ ...l, at: l.at + off });
    edgeIds.push(...p.edgeIds);
    nodeIds.push(...p.nodeIds.slice(1));
    distance += p.distance;
    duration += p.duration;
    sailTime += p.sailTime;
    waitTime += p.waitTime;
    for (const w of p.waterways) if (waterways[waterways.length - 1] !== w) waterways.push(w);
    unknown += p.unknownBridges;
    if (p.lowestBridge != null && (lowest == null || p.lowestBridge < lowest)) lowest = p.lowestBridge;
  }
  for (let i = 0; i < steps.length - 1; i++) steps[i].dist = steps[i + 1].at - steps[i].at;
  const warnings: string[] = [];
  if (unknown > 0) warnings.push(`${unknown} brug${unknown > 1 ? 'gen' : ''} met onbekende doorvaarthoogte op de route.`);
  const access = { start: first.access?.start, end: parts[parts.length - 1].access?.end };
  return { id: 0, label: 'Route via tussenpunten', coords, nodeIds, edgeIds, distance, duration, sailTime, waitTime, access, cum, steps, bridges, locks, lowestBridge: lowest, unknownBridges: unknown, waterways, warnings };
}

export interface MultiRouteResult {
  routes: RouteResult[];
  error?: string;
}

/** Route langs meerdere waypoints; bij precies twee punten ook alternatieven */
export function routeWaypoints(g: Graph, points: { point: LatLng; name: string }[], profile: BoatProfile): MultiRouteResult {
  if (points.length < 2) return { routes: [], error: 'Kies minstens een vertrekpunt en een bestemming.' };
  const parts: RouteResult[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const pair = g.snapPair(points[i].point, points[i + 1].point, 2500);
    if (!pair) return { routes: [], error: `Geen vaarweg gevonden bij "${points[i].name}" of "${points[i + 1].name}".` };
    const out = computeRoutes(g, { from: pair.a.node, to: pair.b.node, fromPoint: pair.a.snapped, toPoint: pair.b.snapped, fromSnap: pair.a, toSnap: pair.b, profile, alternatives: points.length === 2 ? 2 : 0 });
    if (out.routes.length === 0) return { routes: [], error: out.blockedInfo ?? `Geen route tussen "${points[i].name}" en "${points[i + 1].name}".` };
    // stukken over land: van het gekozen punt naar het water en van het water naar de bestemming
    for (const r of out.routes) {
      const start = landLeg(points[i].point, r.coords[0], points[i].name);
      const end = landLeg(points[i + 1].point, r.coords[r.coords.length - 1], points[i + 1].name);
      if (start || end) r.access = { start: start ?? undefined, end: end ?? undefined };
      const first = r.steps[0];
      const last = r.steps[r.steps.length - 1];
      if (start && first?.kind === 'depart') first.detail = `eerst ${formatDistance(start.walkDistance)} van ${start.name} naar het water`;
      if (end && last?.kind === 'arrive') last.detail = `nog ${formatDistance(end.walkDistance)} lopen naar ${end.name}, ongeveer ${formatDuration(end.walkTime)}`;
    }
    if (points.length === 2) return { routes: out.routes };
    parts.push(out.routes[0]);
  }
  return { routes: [concatRoutes(parts)] };
}

const clock = (startMin: number, plusSec: number) => {
  const m = Math.round(startMin + plusSec / 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Verdeel een route in dagetappes op basis van vaaruren per dag, met overnachtingsvoorstellen */
export function planStages(route: RouteResult, pois: Poi[], hoursPerDay: number, startTime: string, fromName: string, toName: string): Stage[] {
  const budget = Math.max(1, hoursPerDay) * 3600;
  const startMin = (() => {
    const [h, m] = startTime.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  })();
  const candidates = poisAlongRoute(pois, route, 1500, OVERNIGHT_KINDS);
  // tijd op de route bij afstand 'at': lineair naar rato van duur (inclusief wachttijden)
  const timeAt = (at: number) => (route.duration * at) / Math.max(route.distance, 1);
  const atForTime = (t: number) => (route.distance * t) / Math.max(route.duration, 1);
  const stages: Stage[] = [];
  let fromAt = 0;
  let day = 1;
  let curFrom = fromName;
  while (fromAt < route.distance - 1) {
    const tFrom = timeAt(fromAt);
    const tTarget = tFrom + budget;
    let toAt = route.distance;
    let stop: Stage['stop'] = null;
    let alternatives: Stage['alternatives'] = [];
    if (tTarget < route.duration - 600) {
      // zoek overnachting tussen 60% en 100% van het dagbudget, het liefst zo ver mogelijk
      const minAt = atForTime(tFrom + budget * 0.6);
      const maxAt = atForTime(tTarget);
      const window = candidates.filter((c) => c.at >= minAt && c.at <= maxAt && c.at > fromAt + 500);
      const ranked = [...window].sort((a, b) => {
        const score = (x: typeof a) => (x.poi.k === 'marina' || x.poi.k === 'harbour' ? 0 : 1) * 3000 + x.dist * 2 - (x.at - minAt) * 0.5;
        return score(a) - score(b);
      });
      if (ranked.length > 0) {
        stop = { poi: ranked[0].poi, dist: ranked[0].dist };
        toAt = ranked[0].at;
        alternatives = ranked.slice(1, 5);
      } else {
        // geen haven in het venster: neem het dagbudget en toon de dichtstbijzijnde havens erna
        toAt = maxAt;
        const after = candidates.filter((c) => c.at > maxAt).slice(0, 3);
        alternatives = after;
      }
    }
    const countIn = (arr: { at: number }[]) => arr.filter((x) => x.at > fromAt && x.at <= toAt).length;
    const duration = timeAt(toAt) - tFrom;
    stages.push({
      day,
      fromAt,
      toAt,
      fromName: curFrom,
      toName: stop ? (stop.poi.n ?? 'Aanlegplaats') : toAt >= route.distance - 1 ? toName : 'Einde dagbudget',
      distance: toAt - fromAt,
      duration,
      bridges: countIn(route.bridges),
      locks: countIn(route.locks),
      stop,
      alternatives,
      startClock: clock(startMin, 0),
      endClock: clock(startMin, duration),
    });
    curFrom = stages[stages.length - 1].toName;
    fromAt = toAt;
    day++;
    if (day > 30) break;
  }
  return stages;
}
