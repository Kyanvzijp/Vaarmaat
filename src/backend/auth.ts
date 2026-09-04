// Inloggen met magic link (SPEC 6.1). Dunne laag over Supabase Auth zodat de UI geen supabase-js hoeft te kennen.
import { supabase } from '@/integrations/supabase/client';

export interface AuthUser {
  id: string;
  email: string | null;
}

export const authAvailable = () => supabase !== null;

/** Stuurt een inloglink naar het e-mailadres. Geeft een Nederlandse foutmelding terug als het misgaat. */
export async function signInWithMagicLink(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Inloggen is nog niet beschikbaar. Je kunt Vaarmaat gewoon als gast gebruiken.' };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) return { error: 'De inloglink kon niet worden verstuurd. Controleer je e-mailadres en probeer het opnieuw.' };
  return { error: null };
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

export async function getUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

/** Luistert naar in- en uitloggen. Geeft een functie terug om te stoppen met luisteren. */
export function onAuthChange(cb: (user: AuthUser | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
  });
  return () => data.subscription.unsubscribe();
}
