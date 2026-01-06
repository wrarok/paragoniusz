import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.server";

export const POST: APIRoute = async ({ cookies, request, locals }) => {
  const runtimeEnv = locals.runtime?.env;
  const supabase = createSupabaseServerInstance(
    {
      cookies,
      headers: request.headers,
    },
    runtimeEnv
  );

  const { error } = await supabase.auth.signOut();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(null, { status: 200 });
};
