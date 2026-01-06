/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

// Cloudflare runtime environment interface
interface CloudflareEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  ENV_NAME?: string;
}

// Cloudflare runtime type
interface CloudflareRuntime {
  env?: CloudflareEnv;
  cf?: IncomingRequestCfProperties;
  ctx?: ExecutionContext;
}

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {
        id: string;
        email?: string;
      };
      // Cloudflare runtime (available on Cloudflare Pages)
      runtime?: CloudflareRuntime;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_MODEL: string;
  readonly ENV_NAME: string;
  readonly PUBLIC_ENV_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
