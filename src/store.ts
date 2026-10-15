import type { Trip, LogEntry, ActiveTrip } from './types';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* opslag niet beschikbaar */
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* opslag niet beschikbaar */
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const K = {
  trips: 'vaarmaat.trips.v1',
  logs: 'vaarmaat.logs.v1',
  checks: 'vaarmaat.checklists.v1',
  lessons: 'vaarmaat.lessons.v1',
  settings: 'vaarmaat.settings.v1',
  favs: 'vaarmaat.favs.v1',
  active: 'vaarmaat.active.v1',
};

export const loadTrips = () => read<Trip[]>(K.trips, []);
export const saveTrips = (t: Trip[]) => write(K.trips, t);

export const loadLogs = () => read<LogEntry[]>(K.logs, []);
export const saveLogs = (l: LogEntry[]) => write(K.logs, l);

export const loadChecks = () => read<Record<string, boolean>>(K.checks, {});
export const saveChecks = (c: Record<string, boolean>) => write(K.checks, c);

export interface LessonProgress {
  read: string[];
  quiz: Record<string, number>; // lessonId -> score (0..1)
}
export const loadLessonProgress = () => read<LessonProgress>(K.lessons, { read: [], quiz: {} });
export const saveLessonProgress = (p: LessonProgress) => write(K.lessons, p);

export interface Settings {
  voice: boolean;
  prepMinutes: number;
  showPois: boolean;
  hoursPerDay: number;
  startTime: string;
  /** onboarding afgerond (ISO), zie src/onboarding.ts */
  onboardedAt?: string;
  /** onboarding overgeslagen (ISO): de eerste route vraagt dan of het bootprofiel klopt */
  onboardingSkippedAt?: string;
  /** versie van de bevestigde disclaimer; bij een nieuwe versie vraagt de app opnieuw */
  disclaimerVersion?: number;
  /** de gebruiker heeft bevestigd dat het bootprofiel klopt */
  boatConfirmed?: boolean;
  /** trillen bij een nieuwe instructie en bij de naderingskaart (styleguide 10) */
  haptics: boolean;
  /** de tip over schermvergrendeling is al eens getoond (als het scherm niet aan kan blijven) */
  wakeLockTipShown?: boolean;
}
export const DEFAULT_SETTINGS: Settings = { voice: true, prepMinutes: 20, showPois: true, hoursPerDay: 5, startTime: '10:00', haptics: true };
export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(K.settings, {}) });
export const saveSettings = (s: Settings) => write(K.settings, s);

export const loadFavs = () => read<string[]>(K.favs, []);
export const saveFavs = (f: string[]) => write(K.favs, f);

/** Tocht die nu gevaren wordt (zie src/logbook.ts) */
export const loadActiveTrip = () => read<ActiveTrip | null>(K.active, null);
export const saveActiveTrip = (a: ActiveTrip | null) => (a ? write(K.active, a) : remove(K.active));
