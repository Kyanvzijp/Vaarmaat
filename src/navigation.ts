import type { LatLng, RouteResult, RouteStep } from './types';
import { projectOnSegment, bearing } from './geo';

export interface NavState {
  /** positie geprojecteerd op de route */
  snapped: LatLng;
  /** afstand vanaf het begin van de route (m) */
  along: number;
  /** afstand van GPS tot route (m) */
  offRoute: number;
  /** resterende afstand (m) */
  remaining: number;
  /** resterende tijd (s) */
  remainingTime: number;
  /** volgende stap */
  next: RouteStep | null;
  /** afstand tot volgende stap (m) */
  toNext: number;
  /** koers van de route ter plaatse */
  routeBearing: number;
  segIdx: number;
}

/** Zoek positie op de route; zoekt vanaf de vorige segmentindex om 'terugspringen' te voorkomen */
export function locateOnRoute(route: RouteResult, pos: LatLng, prevSeg = 0, speedKmh: number): NavState {
  const c = route.coords;
  let best = { d: Infinity, i: 0, t: 0, q: pos };
  const from = Math.max(0, prevSeg - 30);
  const to = c.length - 1;
  for (let i = from; i < to; i++) {
    const [t, d, q] = projectOnSegment(pos, c[i], c[i + 1]);
    // lichte voorkeur voor segmenten vooruit t.o.v. vorige positie
    const bias = i < prevSeg ? 1.15 : 1;
    if (d * bias < best.d) best = { d: d * bias, i, t, q };
  }
  const segLen = route.cum[best.i + 1] - route.cum[best.i];
  const along = route.cum[best.i] + segLen * best.t;
  const remaining = route.distance - along;
  const next = route.steps.find((s) => s.at > along + 15 && s.kind !== 'depart') ?? route.steps[route.steps.length - 1];
  const toNext = Math.max(0, next.at - along);
  const speed = Math.max(speedKmh, 2);
  // resterende tijd: naar rato van de geplande duur, gecorrigeerd voor huidige snelheid
  const plannedRemaining = route.duration * (remaining / Math.max(route.distance, 1));
  const bySpeed = (remaining / 1000 / speed) * 3600;
  const remainingTime = 0.5 * plannedRemaining + 0.5 * bySpeed;
  return {
    snapped: best.q,
    along,
    offRoute: best.d,
    remaining,
    remainingTime,
    next,
    toNext,
    routeBearing: bearing(c[best.i], c[Math.min(best.i + 1, c.length - 1)]),
    segIdx: best.i,
  };
}
