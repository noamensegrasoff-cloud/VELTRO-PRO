import { createClient } from '@supabase/supabase-js';

// VITE_SUPABASE_URL must be the project root, not a REST/Auth endpoint.
// Normalize known API suffixes defensively so a misconfigured GitHub variable
// cannot produce URLs such as /rest/v1/auth/v1/recover.
const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const url = configuredUrl
  ?.replace(/\/(?:rest\/v1|auth\/v1|storage\/v1|realtime\/v1)(?:\/.*)?\/?$/i, '')
  .replace(/\/+$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'veltro-pro-auth',
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : null;
