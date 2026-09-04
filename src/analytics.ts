// Privacyvriendelijke analytics (SPEC 8.3): Plausible of Umami, alleen als VITE_ANALYTICS_SCRIPT is gezet.
// Nooit locatiedata meesturen; alleen de eventnaam en kleine, niet-persoonlijke eigenschappen.

export type AnalyticsEvent =
  | 'route_planned'
  | 'nav_started'
  | 'nav_finished'
  | 'lesson_opened'
  | 'approach_shown'
  | 'booking_click'
  | 'plus_gate_shown'
  | 'plus_started';

type Props = Record<string, string | number | boolean>;

interface AnalyticsWindow extends Window {
  plausible?: (event: string, opts?: { props?: Props }) => void;
  umami?: { track: (event: string, props?: Props) => void };
}

let loaded = false;

/** Laadt het analytics-script eenmalig. Aanroepen vanuit main.tsx; zonder configuratie gebeurt er niets. */
export function initAnalytics(): void {
  if (loaded) return;
  loaded = true;
  const src = import.meta.env.VITE_ANALYTICS_SCRIPT as string | undefined;
  const domain = import.meta.env.VITE_ANALYTICS_DOMAIN as string | undefined;
  if (!src) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = src;
  if (domain) {
    s.dataset.domain = domain; // Plausible
    s.dataset.websiteId = domain; // Umami gebruikt een website-id; zet die dan in VITE_ANALYTICS_DOMAIN
  }
  document.head.appendChild(s);
}

export function track(event: AnalyticsEvent, props?: Props): void {
  const w = window as AnalyticsWindow;
  try {
    if (w.plausible) w.plausible(event, props ? { props } : undefined);
    else if (w.umami) w.umami.track(event, props);
  } catch {
    /* analytics mag nooit de app breken */
  }
}
