import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.server.ts";

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    // Check if required environment variables are available
    if (!import.meta.env.SUPABASE_URL || !import.meta.env.SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables:", {
        SUPABASE_URL: !!import.meta.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: !!import.meta.env.SUPABASE_ANON_KEY,
      });
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
    return next();
  }
});
