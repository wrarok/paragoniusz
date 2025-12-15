import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.server.ts";

export const onRequest = defineMiddleware(async (context, next) => {
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
});
