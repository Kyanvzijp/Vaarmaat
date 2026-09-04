// Het stuk over land tussen het gekozen punt en het water: schatting en links naar loop-, auto- en ov-routes.
// De app rekent zelf geen landroutes; die laten we over aan Google Maps of Apple Kaarten in een nieuw tabblad.
import type { LandLeg, LatLng } from './types';
import { fastDist } from './geo';

/** Vanaf deze afstand (m) tonen we een stuk over land */
export const LAND_LEG_MIN = 150;
const WALK_FACTOR = 1.3;
const WALK_KMH = 4.5;

export function landLeg(point: LatLng, water: LatLng, name: string): LandLeg | null {
  const distance = fastDist(point, water);
  if (distance < LAND_LEG_MIN) return null;
  const walkDistance = distance * WALK_FACTOR;
  return { point, water, distance, walkDistance, walkTime: (walkDistance / 1000 / WALK_KMH) * 3600, name };
}

export type TravelMode = 'lopen' | 'auto' | 'ov';

const modeParam: Record<TravelMode, string> = { lopen: 'walking', auto: 'driving', ov: 'transit' };
const appleFlag: Record<TravelMode, string> = { lopen: 'w', auto: 'd', ov: 'r' };

/** Link naar een routeplanner voor het stuk over land. Google Maps werkt overal; op iOS kan de gebruiker Apple Kaarten kiezen. */
export function directionsUrl(from: LatLng, to: LatLng, mode: TravelMode, provider: 'google' | 'apple' = 'google'): string {
  const f = `${from[0].toFixed(6)},${from[1].toFixed(6)}`;
  const t = `${to[0].toFixed(6)},${to[1].toFixed(6)}`;
  if (provider === 'apple') return `https://maps.apple.com/?saddr=${f}&daddr=${t}&dirflg=${appleFlag[mode]}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${f}&destination=${t}&travelmode=${modeParam[mode]}`;
}

export const isApple = () => typeof navigator !== 'undefined' && /iPhone|iPad|Macintosh/.test(navigator.userAgent);
