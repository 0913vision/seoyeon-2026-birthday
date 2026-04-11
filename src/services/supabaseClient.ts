/**
 * Supabase client factory.
 *
 * Returns a configured `SupabaseClient` if both VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are set at build time, otherwise returns null.
 *
 * Callers (src/services/db.ts) treat `null` as "not configured" and
 * transparently fall back to the in-memory mock. This means the game
 * keeps working in local dev without a .env file and during any period
 * before the real Supabase project is provisioned.
 *
 * Vite inlines `import.meta.env.VITE_*` values at build time, so missing
 * vars become `undefined` in the bundle — no runtime env lookup.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
    url && anon ? createClient(url, anon) : null;

/** True if Supabase is wired up. Useful for dev logging. */
export const isSupabaseConfigured: boolean = supabase !== null;
