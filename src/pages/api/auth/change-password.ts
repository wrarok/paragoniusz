import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.server";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const { newPassword } = await request.json();

  const runtimeEnv = locals.runtime?.env;
  const supabase = createSupabaseServerInstance(
    {
      cookies,
      headers: request.headers,
    },
    runtimeEnv
  );

  // Update password using SSR client (has access to session in cookies)
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
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
