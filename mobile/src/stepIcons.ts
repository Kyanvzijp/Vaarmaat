import type { RouteStep } from '@shared/types';

/** Iconen per stap, zie STYLEGUIDE 5 (stappenlijst) */
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
  arrive: '🏁',
};
