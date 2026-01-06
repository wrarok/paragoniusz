import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Cookie options for Supabase SSR
 * Used for secure, HTTP-only session management
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parses Cookie header string into array of name/value pairs
 * Required by @supabase/ssr for cookie management
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Creates Supabase server client for SSR contexts
 * Used in middleware and Astro pages for server-side authentication
 *
 * @param context - Astro context with headers and cookies
 * @param env - Optional environment variables (for Cloudflare runtime)
 * @returns Configured Supabase client with SSR cookie handling
 *
 * @example
 * ```typescript
 * // In Astro page (local development)
 * const supabase = createSupabaseServerInstance({
 *   headers: Astro.request.headers,
 *   cookies: Astro.cookies
 * });
 *
 * // On Cloudflare Pages (runtime)
 * const supabase = createSupabaseServerInstance({
 *   headers: Astro.request.headers,
 *   cookies: Astro.cookies
 * }, Astro.locals.runtime?.env);
 * ```
 */
export const createSupabaseServerInstance = (
  context: { headers: Headers; cookies: AstroCookies },
  env?: { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string }
) => {
  // Use runtime env (Cloudflare) if available, otherwise fallback to import.meta.env (local)
  const supabaseUrl = env?.SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = env?.SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};
