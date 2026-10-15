// Automatisch herberekenen tijdens navigatie (verbeterplan NAV-02). Zonder browser-API's: web en app gebruiken dezelfde regels.
import type { Graph } from './graph';
import type { LatLng, RouteResult } from './types';
import { locateOnRoute, type NavState } from './navigation';
import { formatDuration, spokenDuration } from './geo';

export const REROUTE = {
  /** zoveel meter van de route, en dat zo lang (ms), dan een nieuwe route */
  offRoute: 80,
  after: 20_000,
  /** op een andere vaarweg al vanaf zoveel meter van de route, meteen */
  otherWaterway: 40,
  /** zoveel meter mag je van een vaarweg liggen om er "op" te zijn */
  onWaterway: 50,
  /** nooit vaker dan eens per zoveel ms */
  minInterval: 30_000,
  /** komt de nieuwe route terug op de oude vóór het einde van het stuk vaarweg waar je bent plus zoveel meter, dan blijft de oude staan */
  rejoinAhead: 150,
};

export interface RerouteTimer {
  /** sinds wanneer (ms) je van de route af bent */
  offSince: number | null;
  /** laatste poging (ms) */
  lastAt: number;
}
export const newRerouteTimer = (): RerouteTimer => ({ offSince: null, lastAt: 0 });

const edgeSets = new WeakMap<RouteResult, Set<number>>();
const edgeSet = (r: RouteResult) => {
  let s = edgeSets.get(r);
  if (!s) edgeSets.set(r, (s = new Set(r.edgeIds)));
  return s;
};

/** Ben je op een vaarweg die niet in de route zit, bijvoorbeeld omdat je een andere afslag nam? */
export function onOtherWaterway(g: Graph, route: RouteResult, pos: LatLng): boolean {
  const e = g.nearestEdge(pos, REROUTE.onWaterway);
  return !!e && !edgeSet(route).has(e.edge);
}

/** Moet er nu een nieuwe route komen? Werkt de timer bij. */
export function shouldReroute(st: NavState, now: number, t: RerouteTimer, otherWaterway: boolean): boolean {
  const off = st.offRoute > REROUTE.offRoute || (otherWaterway && st.offRoute > REROUTE.otherWaterway);
  if (!off) {
    t.offSince = null;
    return false;
  }
  if (t.offSince == null) t.offSince = now;
  if (now - t.lastAt < REROUTE.minInterval) return false;
  return (otherWaterway && st.offRoute > REROUTE.otherWaterway) || now - t.offSince >= REROUTE.after;
}

/** Hoeveel tussenpunten heb je al gepasseerd op deze route? */
export function passedWaypoints(route: RouteResult, along: number): number {
  return route.steps.filter((s) => s.kind === 'waypoint' && s.at <= along + 15).length;
}

/**
 * Leidt de nieuwe route je terug naar de oude, naar een punt waar je al was of dat vlak voor je ligt?
 * Dan is er niets nieuws: de oude route blijft staan en je vaart gewoon terug. Komt hij pas verderop
 * weer op de oude route uit (een andere vaarweg die later aansluit), dan is het echt een nieuwe route.
 * "Vlak voor je" is tot het einde van het stuk vaarweg waar je naast ligt, plus een kleine marge: daar
 * sluit een route die je alleen terugstuurt op de oude aan, ook als dat stuk lang is.
 */
export function leadsBackToRoute(g: Graph, old: RouteResult, fresh: RouteResult, st: Pick<NavState, 'along' | 'segIdx'>): boolean {
  const set = edgeSet(old);
  const k = fresh.edgeIds.findIndex((e) => set.has(e));
  if (k < 0) return false;
  const node = fresh.nodeIds[k];
  if (node == null) return false;
  const rejoin = locateOnRoute(old, g.nodes[node], 0, null).along;
  // het stuk waar je naast ligt kan net voor of na een knoop vallen; neem daarom ook het volgende stuk mee
  const segmentEnd = old.cum[Math.min(st.segIdx + 2, old.cum.length - 1)] ?? st.along;
  return rejoin <= Math.max(st.along, segmentEnd) + REROUTE.rejoinAhead;
}

/** Melding na herberekenen, op het scherm en gesproken: "Nieuwe route berekend, 4 min langer." */
export function rerouteMessage(oldRemaining: number, fresh: number): { text: string; spoken: string } {
  const diff = fresh - oldRemaining;
  if (Math.abs(diff) < 90) return { text: 'Nieuwe route berekend, ongeveer even lang.', spoken: 'Nieuwe route berekend, ongeveer even lang.' };
  const word = diff > 0 ? 'langer' : 'korter';
  return { text: `Nieuwe route berekend, ${formatDuration(Math.abs(diff))} ${word}.`, spoken: `Nieuwe route berekend, ${spokenDuration(Math.abs(diff))} ${word}.` };
}
