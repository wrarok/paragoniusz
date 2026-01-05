// @ts-check
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// Load environment variables based on mode
// In test mode, this will load .env.test file
const mode = process.env.NODE_ENV === "test" ? "test" : "development";
const env = loadEnv(mode, process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: {
    port: 3000,
    host: process.env.NODE_ENV === "test" ? "0.0.0.0" : "localhost",
  },
  vite: {
    plugins: [tailwindcss()],
    // Make environment variables available to import.meta.env
    define: {
      "import.meta.env.SUPABASE_URL": JSON.stringify(env.SUPABASE_URL || process.env.SUPABASE_URL),
      "import.meta.env.SUPABASE_ANON_KEY": JSON.stringify(env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
      "import.meta.env.PUBLIC_SUPABASE_URL": JSON.stringify(env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL),
      "import.meta.env.PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(
        env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY
      ),
      "import.meta.env.OPENROUTER_API_KEY": JSON.stringify(env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY),
      "import.meta.env.OPENROUTER_MODEL": JSON.stringify(env.OPENROUTER_MODEL || process.env.OPENROUTER_MODEL),
    },
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
