import type { RouteStep } from './types';

/** Iconen per stap, zie STYLEGUIDE 5 (stappenlijst). Gedeeld door web en app. */
export const STEP_ICONS: Record<RouteStep['kind'], string> = {
  depart: '🚩',
  left: '↰',
  right: '↱',
  slight_left: '↖',
  slight_right: '↗',
  sharp_left: '⬑',
  sharp_right: '⬏',
  straight: '↑',
  uturn: '↶',
  bridge: '🌉',
  movable_bridge: '⏳',
  lock: '🔒',
  waypoint: '📌',
  arrive: '🏁',
};
