import type { AstroCookies } from 'astro';
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Cookie options for Supabase SSR
 * Used for secure, HTTP-only session management
 */
export const cookieOptions: CookieOptionsWithName = {
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
};

/**
 * Parses Cookie header string into array of name/value pairs
 * Required by @supabase/ssr for cookie management
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(';').map((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    return { name, value: rest.join('=') };
  });
}

/**
 * Creates Supabase server client for SSR contexts
 * Used in middleware and Astro pages for server-side authentication
 * 
 * @param context - Astro context with headers and cookies
 * @returns Configured Supabase client with SSR cookie handling
 * 
 * @example
 * ```typescript
 * // In Astro page
 * const supabase = createSupabaseServerInstance({
 *   headers: Astro.request.headers,
 *   cookies: Astro.cookies
 * });
 * ```
 */
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
}) => {
  const supabase = createServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  return supabase;
};