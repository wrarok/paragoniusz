/// <reference types="astro/client" />

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: User; // Optional user object from Supabase Auth
    }
  }
}

interface ImportMetaEnv {
  // Client-side (React components) - requires PUBLIC_ prefix
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;

  // Server-side (API routes, middleware) - no prefix needed
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;

  // Server-side only
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_MODEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
