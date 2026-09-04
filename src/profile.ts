import type { BoatProfile, BoatType } from './types';

export const BOAT_TYPES: { id: BoatType; label: string; icon: string; defaults: Partial<BoatProfile> }[] = [
  { id: 'sloep', label: 'Sloep', icon: '🛥️', defaults: { height: 1.4, draft: 0.6, width: 2.2, speed: 9, allowMovable: true } },
  { id: 'motorboot', label: 'Motorjacht', icon: '🚤', defaults: { height: 2.6, draft: 1.0, width: 3.4, speed: 12, allowMovable: true } },
  { id: 'zeilboot', label: 'Zeilboot (mast gestreken)', icon: '⛵', defaults: { height: 1.8, draft: 1.2, width: 2.8, speed: 8, allowMovable: true } },
  { id: 'zeilboot_mast', label: 'Zeilboot (staande mast)', icon: '⛵', defaults: { height: 11, draft: 1.5, width: 3.0, speed: 8, allowMovable: true } },
  { id: 'speedboot', label: 'Speedboot', icon: '🏎️', defaults: { height: 1.6, draft: 0.5, width: 2.3, speed: 15, allowMovable: true } },
  { id: 'kano', label: 'Kano / sup / roeiboot', icon: '🛶', defaults: { height: 0.6, draft: 0.2, width: 0.8, speed: 5, allowMovable: false } },
];

export const DEFAULT_PROFILE: BoatProfile = {
  type: 'sloep',
  name: 'Mijn sloep',
  height: 1.4,
  draft: 0.6,
  width: 2.2,
  speed: 9,
  allowMovable: true,
  bridgeWait: 10,
  lockWait: 20,
  margin: 0.1,
  avoidUnknownBridges: false,
};

const KEY = 'vaarmaat.profile.v1';

export function loadProfile(): BoatProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<BoatProfile>) };
  } catch {
    /* geen opslag beschikbaar */
  }
  return DEFAULT_PROFILE;
}

export function saveProfile(p: BoatProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* negeren */
  }
}

export function applyBoatType(p: BoatProfile, type: BoatType): BoatProfile {
  const t = BOAT_TYPES.find((b) => b.id === type);
  return { ...p, type, ...(t?.defaults ?? {}) };
}
