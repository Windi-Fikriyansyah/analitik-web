import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client.
 *
 * SERVER-SIDE ONLY. Bypasses Row Level Security, so every function that
 * uses this client is responsible for enforcing its own tenant isolation
 * (e.g. validating site_id, checking ownership) before touching data.
 *
 * Never import this file from a client component.
 */
let cachedClient: ReturnType<typeof createClient<any, 'public', any>> | null = null;

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
    );
  }

  cachedClient = createClient<any, 'public', any>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cachedClient;
}
