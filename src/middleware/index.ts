import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.server.ts";

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    // Check if required environment variables are available
    if (!import.meta.env.SUPABASE_URL || !import.meta.env.SUPABASE_ANON_KEY) {
      console.warn("Missing Supabase environment variables - continuing without auth:", {
        SUPABASE_URL: !!import.meta.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: !!import.meta.env.SUPABASE_ANON_KEY,
        NODE_ENV: import.meta.env.NODE_ENV,
        MODE: import.meta.env.MODE,
      });
      console.warn(
        "Available env keys:",
        Object.keys(import.meta.env).filter((key) => key.includes("SUPABASE"))
      );
      // Continue without Supabase client - this allows the app to work without auth
      return next();
    }

    // Create SSR Supabase client for server-side operations
    const supabase = createSupabaseServerInstance({
      cookies: context.cookies,
      headers: context.request.headers,
    });

    context.locals.supabase = supabase;

    // Get user session and add user to locals
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      context.locals.user = user;
    }

    return next();
  } catch (error) {
    console.error("Middleware error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    // Continue with the request even if there's an error - don't break the entire app
    return next();
  }
});
