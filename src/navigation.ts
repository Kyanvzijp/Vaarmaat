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
  /** verwachte aankomst (ms sinds 1970) */
  eta: number;
  /** volgende stap */
  next: RouteStep | null;
  /** afstand tot volgende stap (m) */
  toNext: number;
  /** koers van de route ter plaatse */
  routeBearing: number;
  segIdx: number;
}

/** Onder deze snelheid (km/u) lig je stil, bijvoorbeeld voor een sluis of brug */
export const STATIONARY_KMH = 1.5;

/** Vaste sleutel voor een object of stap op een plek, zodat meldingen na herberekenen niet opnieuw komen */
export const placeKey = (p: LatLng) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;

/**
 * Resterende tijd in seconden. Naar rato van de geplande duur, voor de helft gecorrigeerd met de huidige snelheid.
 * Lig je stil, dan telt alleen de planning: de aankomsttijd schuift dan rustig mee met de wachttijd in plaats van
 * omhoog te springen alsof je de rest van de route met wandeltempo vaart.
 */
export function remainingTimeFor(route: RouteResult, remaining: number, speedKmh: number | null): number {
  const plannedRemaining = route.duration * (remaining / Math.max(route.distance, 1));
  if (speedKmh == null || speedKmh < STATIONARY_KMH) return plannedRemaining;
  const bySpeed = (remaining / 1000 / speedKmh) * 3600;
  return 0.5 * plannedRemaining + 0.5 * bySpeed;
}

/** Zoek positie op de route; zoekt vanaf de vorige segmentindex om 'terugspringen' te voorkomen */
export function locateOnRoute(route: RouteResult, pos: LatLng, prevSeg = 0, speedKmh: number | null = null, now = Date.now()): NavState {
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
  const remainingTime = remainingTimeFor(route, remaining, speedKmh);
  return {
    snapped: best.q,
    along,
    offRoute: best.d,
    remaining,
    remainingTime,
    eta: now + remainingTime * 1000,
    next,
    toNext,
    routeBearing: bearing(c[best.i], c[Math.min(best.i + 1, c.length - 1)]),
    segIdx: best.i,
  };
}
