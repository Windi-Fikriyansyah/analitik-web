import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client bound to the incoming request's auth cookies.
 * Use this in Server Components, Route Handlers, and Server Actions
 * that need to know "who is the logged-in tenant".
 * Respects Row Level Security (RLS) - safe for reading tenant-scoped data.
 */
export function getSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient<any, 'public', any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component - safe to ignore because
            // middleware refreshes the session cookie on each request.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // see note above
          }
        },
      },
    }
  );
}
