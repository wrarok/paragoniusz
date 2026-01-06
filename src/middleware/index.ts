import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.server.ts";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  // Auth pages
  "/login",
  "/register",
  "/goodbye",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
];

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    // Get environment variables - Cloudflare runtime takes precedence over build-time env
    const runtimeEnv = context.locals.runtime?.env;
    const supabaseUrl = runtimeEnv?.SUPABASE_URL || import.meta.env.SUPABASE_URL;
    const supabaseAnonKey = runtimeEnv?.SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

    // Check if required environment variables are available
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables:", {
        SUPABASE_URL: !!supabaseUrl,
        SUPABASE_ANON_KEY: !!supabaseAnonKey,
        hasRuntimeEnv: !!runtimeEnv,
        NODE_ENV: import.meta.env.NODE_ENV,
        MODE: import.meta.env.MODE,
      });

      // If on public path, allow access
      if (PUBLIC_PATHS.includes(context.url.pathname)) {
        return next();
      }

      // Otherwise redirect to login
      return context.redirect("/login");
    }

    // Create SSR Supabase client for server-side operations
    const supabase = createSupabaseServerInstance(
      {
        cookies: context.cookies,
        headers: context.request.headers,
      },
      runtimeEnv
    );

    context.locals.supabase = supabase;

    // Get user session and add user to locals (for both pages and API)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      context.locals.user = user;
    }

    // Skip redirect check for API routes - they handle auth themselves
    if (context.url.pathname.startsWith("/api/")) {
      return next();
    }

    // For page routes: redirect to login if not authenticated and not on public path
    if (!user && !PUBLIC_PATHS.includes(context.url.pathname)) {
      return context.redirect("/login");
    }

    return next();
  } catch (error) {
    console.error("Middleware error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    // If on public path, allow access even on error
    if (PUBLIC_PATHS.includes(context.url.pathname)) {
      return next();
    }

    // Otherwise redirect to login
    return context.redirect("/login");
  }
});
