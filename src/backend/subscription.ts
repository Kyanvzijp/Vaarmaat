// Vaarmaat Plus (SPEC 6.2 en 6.3): status lezen, lokaal cachen voor offline gebruik, en hasPlus().
// De cache is nu een gewone localStorage-sleutel; de spec vraagt om versleutelde opslag in IndexedDB
// (Web Crypto, sleutel per apparaat). Dat is werk voor de backendfase, zie docs/BACKEND.md.
import { supabase } from '@/integrations/supabase/client';
import type { SubscriptionPlan } from '@/integrations/supabase/types';

export interface Subscription {
  plus: boolean;
  plan?: SubscriptionPlan;
  /** einde van de huidige periode (ISO) */
  until?: string;
  /** einde van de proefperiode (ISO) */
  trialUntil?: string;
  /** moment waarop deze status is opgehaald (ISO) */
  checkedAt?: string;
}

export const PLUS_PRICES = { maand: 4.99, seizoen: 14.99, jaar: 24.99 } as const;
export const TRIAL_DAYS = 14;
/** Zoveel dagen na `until` blijft een gecachete Plus-status offline geldig. */
const GRACE_DAYS = 7;
const KEY = 'vaarmaat.plus.v1';
const NONE: Subscription = { plus: false };

export function loadCachedSubscription(): Subscription {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return NONE;
    const s = JSON.parse(raw) as Subscription;
    if (!s.plus) return s;
    const end = s.trialUntil && (!s.until || s.trialUntil > s.until) ? s.trialUntil : s.until;
    if (!end) return s;
    const grace = new Date(end).getTime() + GRACE_DAYS * 86400000;
    return Date.now() <= grace ? s : { ...s, plus: false };
  } catch {
    return NONE;
  }
}

function cache(s: Subscription) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* opslag niet beschikbaar */
  }
}

export function clearSubscription() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* negeren */
  }
}

/** Centrale vraag: heeft deze gebruiker nu Plus? Zonder argument wordt de cache gebruikt. */
export function hasPlus(sub: Subscription = loadCachedSubscription()): boolean {
  return sub.plus;
}

/** Haalt de abonnementsstatus op uit Supabase en werkt de cache bij. Zonder backend: geen Plus. */
export async function fetchSubscription(userId: string): Promise<Subscription> {
  if (!supabase) return NONE;
  const { data, error } = await supabase.from('subscriptions').select('status, plan, current_period_end, trial_until').eq('user_id', userId).maybeSingle();
  if (error || !data) {
    const cached = loadCachedSubscription();
    return cached;
  }
  const now = Date.now();
  const periodOk = ['trialing', 'active', 'past_due'].includes(data.status) && (!data.current_period_end || new Date(data.current_period_end).getTime() >= now);
  const trialOk = !!data.trial_until && new Date(data.trial_until).getTime() >= now;
  const sub: Subscription = {
    plus: periodOk || trialOk,
    plan: data.plan ?? undefined,
    until: data.current_period_end ?? undefined,
    trialUntil: data.trial_until ?? undefined,
    checkedAt: new Date(now).toISOString(),
  };
  cache(sub);
  return sub;
}
