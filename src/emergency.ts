// Noodscherm (verbeterplan VEI-01): positie omschrijven, nummers en een Mayday-tekst om voor te lezen.
// Werkt zonder internet: alles komt uit de graaf, de POI's en de bekende plaatsen. Altijd gratis.
import type { Graph } from './graph';
import type { LatLng, Poi } from './types';
import { KNOWN_PLACES } from './geocode';
import { bearing, fastDist, formatDegMin, formatDistance } from './geo';

export const ALARM_NUMBER = '112';
export const KUSTWACHT_NUMBER = '0900 0111';
export const KNRM_URL = 'https://www.knrm.nl';
export const tel = (n: string) => `tel:${n.replace(/\s/g, '')}`;

export const EMERGENCY_TEXT = {
  title: 'Nood',
  lifeThreat: 'Levensgevaar? Bel 112.',
  noLifeThreat: 'Geen levensgevaar, wel hulp nodig, zoals motorpech of aan de grond? Bel de Kustwacht of gebruik de KNRM Helpt app.',
  vhf: 'Heb je een marifoon? Op het IJsselmeer, de Waddenzee en de Zeeuwse wateren luistert de Kustwacht op kanaal 16. Op rivieren en kanalen kun je ook het kanaal van de verkeerspost of het blokgebied gebruiken. Bel bij twijfel altijd 112.',
  offline: 'Dit scherm werkt zonder internet. Bellen naar 112 kan ook via een ander netwerk dan dat van je eigen provider.',
};

const DIRECTION: Record<string, string> = { N: 'noorden', NO: 'noordoosten', O: 'oosten', ZO: 'zuidoosten', Z: 'zuiden', ZW: 'zuidwesten', W: 'westen', NW: 'noordwesten' };
const COMPASS = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];

export interface PlaceDescription {
  /** naam van de vaarweg of plas waar je bent, als je op of vlak bij het water bent */
  waterway: string | null;
  /** dichtstbijzijnde bekende plaats, brug, sluis of haven */
  near: { name: string; dist: number; text: string } | null;
}

/** Waar ben je? "Kagerplassen", "400 m ten zuiden van Zijlbrug" */
export function describeLocation(g: Graph | null, pois: Poi[], pos: LatLng): PlaceDescription {
  let waterway: string | null = null;
  if (g) {
    const e = g.nearestEdge(pos, 300);
    if (e) waterway = g.wayOf(e.edge).n;
  }
  const maxDist = 5000;
  let best: { name: string; p: LatLng; d: number } | null = null;
  const consider = (name: string | null | undefined, p: LatLng) => {
    if (!name) return;
    if (Math.abs(p[0] - pos[0]) > 0.05 || Math.abs(p[1] - pos[1]) > 0.08) return;
    const d = fastDist(p, pos);
    if (d <= maxDist && (!best || d < best.d)) best = { name, p, d };
  };
  if (g) {
    for (const b of g.data.bridges) consider(b.n, b.p);
    for (const l of g.data.locks) consider(l.n, l.p);
  }
  for (const poi of pois) if (poi.k === 'marina' || poi.k === 'harbour' || poi.k === 'mooring') consider(poi.n, poi.p);
  // plassen en vaarwegen zelf zijn geen goed herkenningspunt ("ten zuiden van Kagerplassen")
  for (const pl of KNOWN_PLACES) if (pl.kind !== 'waterway') consider(pl.name, pl.point);
  const b = best as { name: string; p: LatLng; d: number } | null;
  if (!b) return { waterway, near: null };
  if (b.d < 40) return { waterway, near: { name: b.name, dist: b.d, text: `bij ${b.name}` } };
  const dir = DIRECTION[COMPASS[Math.round(bearing(b.p, pos) / 45) % 8]];
  return { waterway, near: { name: b.name, dist: b.d, text: `${formatDistance(b.d)} ten ${dir} van ${b.name}` } };
}

/** Positie in één regel voor de marifoon of de telefoon */
export function positionLine(pos: LatLng, desc: PlaceDescription): string {
  return [formatDegMin(pos), desc.waterway, desc.near?.text].filter(Boolean).join(', ');
}

/** Mayday-melding volgens de vaste volgorde voor de marifoon, ingevuld waar dat kan */
export function maydayLines(boatName: string, pos: LatLng | null, desc: PlaceDescription | null): string[] {
  const name = boatName.trim() || 'mijn boot';
  return [
    'Mayday, Mayday, Mayday',
    `Hier is ${name}, ${name}, ${name}`,
    `Mayday ${name}`,
    `Positie: ${pos && desc ? positionLine(pos, desc) : '[waar je bent]'}`,
    '[Wat er aan de hand is, bijvoorbeeld brand, lek of iemand te water]',
    '[Welke hulp je nodig hebt]',
    '[Aantal personen aan boord]',
    'Over',
  ];
}

/** Link naar de positie op de kaart, ook te openen zonder Vaarmaat */
export function mapLink(pos: LatLng): string {
  const lat = pos[0].toFixed(5);
  const lon = pos[1].toFixed(5);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}

/** Tekst om je positie te delen via sms, WhatsApp of het deelmenu */
export function shareText(boatName: string, pos: LatLng, desc: PlaceDescription): string {
  return `Mijn positie op het water (${boatName.trim() || 'boot'}): ${positionLine(pos, desc)}. Kaart: ${mapLink(pos)}`;
}
