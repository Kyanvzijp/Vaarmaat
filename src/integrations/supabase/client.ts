// Supabase-client op het pad dat Lovable Cloud gebruikt. Zonder VITE_SUPABASE_URL en
// VITE_SUPABASE_PUBLISHABLE_KEY is de client null en draait de app volledig als gast (localStorage).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export type VaarmaatSupabase = SupabaseClient<Database>;

export const supabase: VaarmaatSupabase | null =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
      })
    : null;

/** Is er een backend geconfigureerd? Zo niet: gastmodus, alles lokaal. */
export const hasBackend = () => supabase !== null;
