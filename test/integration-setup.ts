/**
 * Integration Tests Setup
 *
 * This file configures the environment for integration tests.
 * Manually loads environment variables from .env.integration
 * Uses local Supabase instance for testing database triggers, RLS policies, etc.
 * Automatically creates test users if they don't exist.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Manually load .env.integration file for integration tests
try {
  const envPath = resolve(process.cwd(), ".env.integration");
  const envFile = readFileSync(envPath, "utf-8");

  envFile.split("\n").forEach((line) => {
    // Skip empty lines and comments
    if (!line || line.trim().startsWith("#")) return;

    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim();
      process.env[key.trim()] = value;
    }
  });

  console.log("✅ Loaded .env.integration file");
} catch (error) {
  console.error("❌ Failed to load .env.integration file:", error);
  throw new Error(".env.integration file not found. Please create it in the project root.");
}

// Verify required environment variables (E2E_USERNAME_ID is optional and will be set dynamically)
const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "E2E_USERNAME", "E2E_PASSWORD"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}. Please check your .env.integration file.`);
  }
}

// Export TEST_USER configuration for convenience (ID will be set dynamically)
export const TEST_USER = {
  email: process.env.E2E_USERNAME!,
  password: process.env.E2E_PASSWORD!,
  id: process.env.E2E_USERNAME_ID || "", // Will be set dynamically after user creation
};

console.log("🧪 Integration tests environment loaded (local Supabase)");
console.log(`📧 Test User: ${TEST_USER.email}`);
console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL}`);

// Auto-create test users during setup
async function setupTestUsers() {
  try {
    // Import here to avoid circular dependencies
    const { ensureAllTestUsersExist } = await import("./helpers/test-auth.js");
    await ensureAllTestUsersExist();
    console.log("✅ Test users setup completed");
  } catch (error) {
    console.error("❌ Failed to setup test users:", error);
    // Don't throw here - let individual tests handle missing users
    console.warn("⚠️ Some integration tests may be skipped due to missing test users");
  }
}

// Run setup immediately when this module is imported
setupTestUsers();
