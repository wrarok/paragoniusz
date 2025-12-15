import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "integration",
    environment: "node",
    setupFiles: ["./test/integration-setup.ts"],
    testTimeout: 30000, // 30s for DB operations and API calls
    hookTimeout: 30000,
    include: ["test/integration/**/*.test.ts"],
    exclude: ["node_modules", "dist", "test/unit/**", "test/e2e/**"],
    globals: true,
    // Run tests sequentially to avoid Supabase Auth rate limiting
    sequence: {
      concurrent: false,
      shuffle: false,
    },
    // Disable file-level parallelism
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/services/**", "src/pages/api/**", "src/middleware/**"],
      exclude: ["node_modules/**", "test/**", "**/*.d.ts", "**/*.config.*", "src/types/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
