import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.server";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const { email, password } = await request.json();

  const runtimeEnv = locals.runtime?.env;
  const supabase = createSupabaseServerInstance(
    {
      cookies,
      headers: request.headers,
    },
    runtimeEnv
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify({ user: data.user }), {
    status: 200,
  });
};
