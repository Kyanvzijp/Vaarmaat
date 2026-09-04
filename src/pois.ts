import type { LatLng, Poi, PoiKind, RouteResult } from './types';
import { fastDist, projectOnSegment } from './geo';

export const POI_META: Record<PoiKind, { label: string; icon: string; color: string; plural: string }> = {
  marina: { label: 'Jachthaven', plural: 'Jachthavens', icon: '⛵', color: '#0a66ff' },
  harbour: { label: 'Haven', plural: 'Havens', icon: '⚓', color: '#0a66ff' },
  mooring: { label: 'Aanlegplaats', plural: 'Aanlegplaatsen', icon: '🪢', color: '#0a8f5b' },
  anchorage: { label: 'Ankerplaats', plural: 'Ankerplaatsen', icon: '⚓', color: '#0a8f5b' },
  fuel: { label: 'Tankstation', plural: 'Tankstations', icon: '⛽', color: '#e08a00' },
  pumpout: { label: 'Vuilwaterstation', plural: 'Vuilwaterstations', icon: '🚽', color: '#7a8699' },
  water: { label: 'Drinkwater', plural: 'Drinkwaterpunten', icon: '🚰', color: '#7a8699' },
  slipway: { label: 'Trailerhelling', plural: 'Trailerhellingen', icon: '🛻', color: '#7a8699' },
  shop: { label: 'Watersportwinkel', plural: 'Watersportwinkels', icon: '🛒', color: '#7a8699' },
  boatyard: { label: 'Jachtwerf', plural: 'Jachtwerven', icon: '🔧', color: '#7a8699' },
  no_mooring: { label: 'Verboden af te meren', plural: 'Afmeerverboden', icon: '⛔', color: '#d33b3b' },
  no_anchor: { label: 'Verboden te ankeren', plural: 'Ankerverboden', icon: '⛔', color: '#d33b3b' },
  restricted: { label: 'Beperkt gebied', plural: 'Beperkte gebieden', icon: '⚠️', color: '#d33b3b' },
};

let cache: Promise<Poi[]> | null = null;
export function loadPois(url = `${import.meta.env.BASE_URL}data/pois.json`): Promise<Poi[]> {
  if (!cache) cache = fetch(url).then((r) => (r.ok ? (r.json() as Promise<Poi[]>) : []));
  return cache;
}

export function poiTitle(p: Poi): string {
  return p.n ?? POI_META[p.k].label;
}

/** Zoek POI's binnen afstand (m) van een punt */
export function poisNear(pois: Poi[], p: LatLng, maxDist: number, kinds?: PoiKind[]): { poi: Poi; dist: number }[] {
  const out: { poi: Poi; dist: number }[] = [];
  for (const poi of pois) {
    if (kinds && !kinds.includes(poi.k)) continue;
    if (Math.abs(poi.p[0] - p[0]) > maxDist / 100000 || Math.abs(poi.p[1] - p[1]) > maxDist / 60000) continue;
    const d = fastDist(poi.p, p);
    if (d <= maxDist) out.push({ poi, dist: d });
  }
  return out.sort((a, b) => a.dist - b.dist);
}

/** POI's langs een route: geeft ook de positie langs de route (m) */
export function poisAlongRoute(pois: Poi[], route: RouteResult, corridor: number, kinds?: PoiKind[]): { poi: Poi; dist: number; at: number }[] {
  const c = route.coords;
  // bbox van de route
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const q of c) {
    if (q[0] < minLat) minLat = q[0];
    if (q[0] > maxLat) maxLat = q[0];
    if (q[1] < minLon) minLon = q[1];
    if (q[1] > maxLon) maxLon = q[1];
  }
  const dl = corridor / 100000, dn = corridor / 60000;
  const out: { poi: Poi; dist: number; at: number }[] = [];
  for (const poi of pois) {
    if (kinds && !kinds.includes(poi.k)) continue;
    if (poi.p[0] < minLat - dl || poi.p[0] > maxLat + dl || poi.p[1] < minLon - dn || poi.p[1] > maxLon + dn) continue;
    let best = { d: Infinity, at: 0 };
    // grove stap om snel te blijven op lange routes
    const step = c.length > 2000 ? 2 : 1;
    for (let i = 0; i < c.length - 1; i += step) {
      const j = Math.min(i + step, c.length - 1);
      if (Math.abs(c[i][0] - poi.p[0]) > dl * 1.5 && Math.abs(c[j][0] - poi.p[0]) > dl * 1.5) continue;
      const [t, d] = projectOnSegment(poi.p, c[i], c[j]);
      if (d < best.d) best = { d, at: route.cum[i] + (route.cum[j] - route.cum[i]) * t };
    }
    if (best.d <= corridor) out.push({ poi, dist: best.d, at: best.at });
  }
  return out.sort((a, b) => a.at - b.at);
}

export const OVERNIGHT_KINDS: PoiKind[] = ['marina', 'harbour', 'mooring', 'anchorage'];

export function poiFacts(p: Poi): { label: string; value: string }[] {
  const t = p.t;
  const out: { label: string; value: string }[] = [];
  if (t.category) out.push({ label: 'Type', value: t.category });
  if (t.fee) out.push({ label: 'Liggeld', value: t.fee === 'yes' ? 'ja' : t.fee === 'no' ? 'gratis' : t.fee });
  if (t.capacity) out.push({ label: 'Plaatsen', value: t.capacity });
  if (t.maxstay) out.push({ label: 'Max. ligduur', value: t.maxstay });
  if (t.opening_hours) out.push({ label: 'Open', value: t.opening_hours });
  if (t.phone) out.push({ label: 'Telefoon', value: t.phone });
  if (t.website) out.push({ label: 'Website', value: t.website });
  if (t.vhf) out.push({ label: 'Marifoon', value: `kanaal ${t.vhf}` });
  if (t.operator) out.push({ label: 'Beheerder', value: t.operator });
  if (t.electricity) out.push({ label: 'Stroom', value: t.electricity === 'yes' ? 'ja' : t.electricity });
  if (t.water) out.push({ label: 'Water', value: t.water === 'yes' ? 'ja' : t.water });
  if (t.sanitary) out.push({ label: 'Sanitair', value: t.sanitary === 'yes' ? 'ja' : t.sanitary });
  if (t.fuel) out.push({ label: 'Brandstof', value: t.fuel });
  if (t.restriction) out.push({ label: 'Beperking', value: t.restriction });
  if (t.description) out.push({ label: 'Info', value: t.description });
  return out;
}
