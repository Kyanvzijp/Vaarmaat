import type { LatLng } from './types';

const R = 6371008.8;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Afstand in meters (haversine) */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const la1 = toRad(a[0]);
  const la2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Snelle benadering (equirectangular) in meters, prima voor korte afstanden */
export function fastDist(a: LatLng, b: LatLng): number {
  const x = toRad(b[1] - a[1]) * Math.cos(toRad((a[0] + b[0]) / 2));
  const y = toRad(b[0] - a[0]);
  return Math.sqrt(x * x + y * y) * R;
}

/** Koers in graden (0 = noord, 90 = oost) van a naar b */
export function bearing(a: LatLng, b: LatLng): number {
  const la1 = toRad(a[0]);
  const la2 = toRad(b[0]);
  const dLon = toRad(b[1] - a[1]);
  const y = Math.sin(dLon) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Verschil tussen twee koersen in graden, -180..180 (positief = rechtsom) */
export function turnAngle(from: number, to: number): number {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/** Projecteer punt p op segment a-b; geeft [t, afstandMeters, punt] */
export function projectOnSegment(p: LatLng, a: LatLng, b: LatLng): [number, number, LatLng] {
  const cosLat = Math.cos(toRad(p[0]));
  const ax = a[1] * cosLat, ay = a[0];
  const bx = b[1] * cosLat, by = b[0];
  const px = p[1] * cosLat, py = p[0];
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const q: LatLng = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return [t, fastDist(p, q), q];
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  if (m < 100000) return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
  return `${Math.round(m / 1000)} km`;
}

export function formatDuration(sec: number): string {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} uur` : `${h} u ${m} min`;
}

export function formatSpeed(kmh: number): string {
  return `${kmh.toFixed(kmh < 10 ? 1 : 0).replace('.', ',')} km/u`;
}

export function formatHeight(m: number | null): string {
  if (m == null) return 'onbekend';
  return `${m.toFixed(2).replace('.', ',')} m`;
}

export function compassName(deg: number): string {
  const names = ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'];
  return names[Math.round(deg / 45) % 8];
}
