// Onboarding bij de eerste start (verbeterplan ONB-01 en ONB-02): teksten en status, gedeeld door web en app.
import type { BoatProfile, BoatType } from './types';
import type { Settings } from './store';
import { BOAT_TYPES, applyBoatType } from './profile';
import { formatHeight } from './geo';

/** Verhoog dit getal als de inhoud van de disclaimer verandert; iedereen bevestigt hem dan opnieuw */
export const DISCLAIMER_VERSION = 1;

export type OnboardingStep = 'welkom' | 'boot' | 'maten' | 'afspraak' | 'huur';

export const WELCOME = {
  title: 'Welkom bij Vaarmaat',
  promise: 'Zoals Google Maps, maar voor het water, en hij leert je varen terwijl je vaart.',
  points: [
    'Routes die passen bij jouw boot: hoogte, diepgang en snelheid',
    'Gesproken navigatie met uitleg bij elke sluis en brug',
    'Werkt ook zonder internet',
  ],
};

export const HEIGHT_HELP = 'Meet van de waterlijn tot het hoogste punt: kap, mast, antenne of bimini.';
export const UNSURE_HELP = 'We rekenen met de gebruikelijke maten van dit type. Meet je boot zo snel mogelijk na en let tot die tijd extra op bij lage bruggen.';

export const DISCLAIMER_TITLE = 'Goed om te weten';
export const DISCLAIMER_POINTS: { title: string; text: string }[] = [
  { title: 'Gegevens kunnen afwijken', text: 'Doorvaarthoogtes, bedieningstijden en havens komen uit open bronnen. Ze zijn niet altijd compleet of actueel, en de waterstand verandert.' },
  { title: 'Borden en brugwachters gaan voor', text: 'Volg altijd de borden, lichten en aanwijzingen van brug- en sluiswachters, ook als de app iets anders zegt.' },
  { title: 'Jij bent de schipper', text: 'Vaarmaat helpt je onderweg, maar jij blijft verantwoordelijk voor een veilige vaart.' },
];
export const DISCLAIMER_ACCEPT = 'Begrepen, laten we varen';

export const RENTAL_TITLE = 'Eerste keer varen?';
export const RENTAL_TEXT = 'Neem voor vertrek even deze drie dingen door. Het noodscherm vind je altijd onder Aan boord.';

/** Welke stap de app bij het opstarten toont, of null als er niets te doen is */
export function onboardingStart(s: Settings): OnboardingStep | null {
  if (!s.onboardedAt && !s.onboardingSkippedAt) return 'welkom';
  if ((s.disclaimerVersion ?? 0) < DISCLAIMER_VERSION) return 'afspraak';
  return null;
}

const NOUN: Record<BoatType, string> = { sloep: 'sloep', motorboot: 'motorjacht', zeilboot: 'zeilboot', zeilboot_mast: 'zeilboot', speedboot: 'speedboot', kano: 'kano' };
export const boatNoun = (t: BoatType) => NOUN[t];

/** Boottype kiezen in de onboarding: standaardmaten van het type, en een passende naam zolang je zelf geen naam koos */
export function chooseBoatType(p: BoatProfile, type: BoatType): BoatProfile {
  const next = applyBoatType(p, type);
  const defaultName = /^Mijn (sloep|motorjacht|zeilboot|speedboot|kano)$/.test(p.name);
  return { ...next, name: defaultName ? `Mijn ${NOUN[type]}` : p.name, heightUnsure: false };
}

/**
 * "Ik weet het niet precies": standaardmaten van het type, gemarkeerd als geschat. Bruggen met onbekende hoogte
 * vermijden zetten we bewust niet aan: van 80 procent van de bruggen is de hoogte onbekend, en dan vindt de app
 * voor bijna geen enkele route meer een weg (1 van de 8 testroutes voor een sloep). De routesheet herinnert je
 * in plaats daarvan aan de geschatte hoogte.
 */
export function markUnsure(p: BoatProfile): BoatProfile {
  return { ...applyBoatType(p, p.type), heightUnsure: true };
}

/** Onboarding afgerond of overgeslagen; de disclaimer is dan bevestigd */
export function completeOnboarding(s: Settings, p: BoatProfile, skipped: boolean, now = new Date()): Settings {
  const iso = now.toISOString();
  return {
    ...s,
    disclaimerVersion: DISCLAIMER_VERSION,
    onboardedAt: skipped ? s.onboardedAt : iso,
    onboardingSkippedAt: skipped ? (s.onboardingSkippedAt ?? iso) : s.onboardingSkippedAt,
    boatConfirmed: skipped ? s.boatConfirmed : !p.heightUnsure,
  };
}

/** Alleen de (nieuwe versie van de) disclaimer bevestigd */
export const acceptDisclaimer = (s: Settings): Settings => ({ ...s, disclaimerVersion: DISCLAIMER_VERSION });

export type BoatCheck = 'skipped' | 'unsure';

/** Moet de routesheet vragen of het bootprofiel klopt? */
export function boatCheck(s: Settings, p: BoatProfile): BoatCheck | null {
  if (s.boatConfirmed) return null;
  if (p.heightUnsure) return 'unsure';
  if (s.onboardingSkippedAt && !s.onboardedAt) return 'skipped';
  return null;
}

export function boatCheckText(kind: BoatCheck, p: BoatProfile): string {
  if (kind === 'unsure') return `De hoogte van je boot is geschat (${formatHeight(p.height)}). Meet hem na voor betrouwbare routes en let tot die tijd extra op bij lage bruggen.`;
  return `Je route is berekend voor een ${NOUN[p.type]} van ${formatHeight(p.height)} hoog. Klopt dat?`;
}

export const boatTypeLine = (t: (typeof BOAT_TYPES)[number]) =>
  `${formatHeight(t.defaults.height ?? null)} hoog · ${t.defaults.speed ?? ''} km/u`;
