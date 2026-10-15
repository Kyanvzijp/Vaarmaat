import type { LatLng, RouteResult, RouteStep } from './types';
import { projectOnSegment, bearing, spokenDistance } from './geo';

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

/** Vanaf deze afstand (m) tot de route ben je ervan af */
export const OFF_ROUTE = 120;

/** Ligt je positie verder dan dit (m) van de route rond de vorige positie, dan zoekt de app de hele route af */
const RELOCATE = 60;

/** Onder deze snelheid (km/u) lig je stil, bijvoorbeeld voor een sluis of brug */
export const STATIONARY_KMH = 1.5;
/** Snelheden hierboven (km/u) zijn GPS-sprongen, geen echte vaart */
export const MAX_PLAUSIBLE_KMH = 80;

/** Vaste sleutel voor een object of stap op een plek, zodat meldingen na herberekenen niet opnieuw komen */
export const placeKey = (p: LatLng) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;

/**
 * Resterende tijd in seconden. Naar rato van de geplande duur, voor de helft gecorrigeerd met de huidige snelheid.
 * Lig je stil, dan telt alleen de planning: de aankomsttijd schuift dan rustig mee met de wachttijd in plaats van
 * omhoog te springen alsof je de rest van de route met wandeltempo vaart.
 */
export function remainingTimeFor(route: RouteResult, remaining: number, speedKmh: number | null): number {
  const plannedRemaining = route.duration * (remaining / Math.max(route.distance, 1));
  if (speedKmh == null || speedKmh < STATIONARY_KMH || speedKmh > MAX_PLAUSIBLE_KMH) return plannedRemaining;
  const bySpeed = (remaining / 1000 / speedKmh) * 3600;
  return 0.5 * plannedRemaining + 0.5 * bySpeed;
}

/** Zoek positie op de route; zoekt vanaf de vorige segmentindex om 'terugspringen' te voorkomen */
export function locateOnRoute(route: RouteResult, pos: LatLng, prevSeg = 0, speedKmh: number | null = null, now = Date.now()): NavState {
  const c = route.coords;
  const to = c.length - 1;
  const search = (from: number) => {
    let found = { score: Infinity, d: Infinity, i: 0, t: 0, q: pos };
    for (let i = from; i < to; i++) {
      const [t, d, q] = projectOnSegment(pos, c[i], c[i + 1]);
      // lichte voorkeur voor segmenten vooruit t.o.v. vorige positie
      const score = d * (i < prevSeg ? 1.15 : 1);
      if (score < found.score) found = { score, d, i, t, q };
    }
    return found;
  };
  // eerst rond de vorige positie, zodat je op een route die zichzelf kruist niet terugspringt
  let best = search(Math.max(0, prevSeg - 30));
  // past dat slecht (na een GPS-sprong of nadat je positie ver naast de route op het eindpunt viel), dan de hele route
  if (best.d > RELOCATE && prevSeg > 30) {
    const all = search(0);
    if (all.d < best.d / 2) best = all;
  }
  const segLen = route.cum[best.i + 1] - route.cum[best.i];
  const along = route.cum[best.i] + segLen * best.t;
  const remaining = route.distance - along;
  // stille stappen (NAV-01) zijn geen instructie tijdens het varen
  const next = route.steps.find((s) => s.at > along + 15 && s.kind !== 'depart' && !s.quiet) ?? route.steps[route.steps.length - 1];
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

/** De eerstvolgende stap na `step` die wel een instructie is */
export function nextAnnounced(route: RouteResult, step: RouteStep): RouteStep | undefined {
  const i = route.steps.indexOf(step);
  return i < 0 ? undefined : route.steps.slice(i + 1).find((s) => !s.quiet);
}

/**
 * Momenten voor gesproken instructies (styleguide 8): ver vooraf (600 m, 1 km voor sluis en beweegbare brug),
 * dichtbij (250 m) en bij de stap zelf (40 m). Ligt de stap erna binnen 200 m, dan noemen we die er meteen bij.
 */
export const CUE = { far: 600, farObject: 1000, near: 250, now: 40, combine: 200 };

export interface Cue {
  text: string;
  /** sleutels die hiermee gezegd zijn, zodat ze niet nog eens komen */
  keys: string[];
}

const cueKey = (s: RouteStep, moment: 'far' | 'near' | 'now') => `${s.kind}:${placeKey(s.point)}:${moment}`;

/** Wat er nu gezegd moet worden, of null. `spoken` bevat de sleutels die al gezegd zijn. */
export function nextCue(route: RouteResult, st: NavState, spoken: Set<string>): Cue | null {
  const next = st.next;
  if (!next || st.offRoute >= OFF_ROUTE || next.quiet) return null;
  const after = nextAnnounced(route, next);
  const combine = after && after.kind !== 'arrive' && after.at - next.at <= CUE.combine ? after : undefined;
  const then = combine ? `, daarna ${combine.text.charAt(0).toLowerCase()}${combine.text.slice(1)}` : '';
  const lower = next.text.charAt(0).toLowerCase() + next.text.slice(1);
  const far = next.kind === 'lock' || next.kind === 'movable_bridge' ? CUE.farObject : CUE.far;
  const also = combine ? [cueKey(combine, 'far')] : [];
  if (st.toNext < far && st.toNext > CUE.near && !spoken.has(cueKey(next, 'far'))) {
    return { text: `${spokenDistance(st.toNext)} ${lower}${then}`, keys: [cueKey(next, 'far'), ...also] };
  }
  if (st.toNext <= CUE.near && st.toNext > CUE.now && !spoken.has(cueKey(next, 'near'))) {
    return { text: `${spokenDistance(st.toNext)} ${lower}${next.detail ? `, ${next.detail}` : ''}${then}`, keys: [cueKey(next, 'far'), cueKey(next, 'near'), ...also] };
  }
  if (st.toNext <= CUE.now && !spoken.has(cueKey(next, 'now'))) {
    return { text: `${next.text}${then}`, keys: [cueKey(next, 'far'), cueKey(next, 'near'), cueKey(next, 'now'), ...also] };
  }
  return null;
}
