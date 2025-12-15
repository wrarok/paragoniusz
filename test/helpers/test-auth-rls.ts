/**
 * RLS-specific Authentication Test Helpers
 *
 * Based on Supabase documentation for proper RLS testing
 * Uses regular authentication instead of Service Role Key
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/db/database.types";
import { TEST_USER } from "../integration-setup";
import { TEST_USER_B } from "./test-auth";

/**
 * Creates authenticated clients for RLS testing
 * Based on Supabase documentation example
 */
export async function createRLSTestClients() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error("Missing required environment variables for RLS testing");
  }

  // Create admin client for setup
  const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey);

  // Ensure test users exist using Admin API
  await ensureRLSTestUsers(adminClient);

  // Create authenticated clients for each user
  const clientA = createClient<Database>(supabaseUrl, supabaseAnonKey);
  const clientB = createClient<Database>(supabaseUrl, supabaseAnonKey);

  // Authenticate User A
  const { data: dataA, error: errorA } = await clientA.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  if (errorA || !dataA.user) {
    throw new Error(`Failed to authenticate User A: ${errorA?.message}`);
  }

  // Authenticate User B
  const { data: dataB, error: errorB } = await clientB.auth.signInWithPassword({
    email: TEST_USER_B.email,
    password: TEST_USER_B.password,
  });

  if (errorB || !dataB.user) {
    throw new Error(`Failed to authenticate User B: ${errorB?.message}`);
  }

  return {
    adminClient,
    clientA,
    clientB,
    userA: dataA.user,
    userB: dataB.user,
  };
}

/**
 * Ensures RLS test users exist using Admin API
 * Based on Supabase documentation best practices
 */
async function ensureRLSTestUsers(adminClient: any) {
  // Create User A
  try {
    const { data: userA, error: errorA } = await adminClient.auth.admin.createUser({
      id: TEST_USER.id,
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
      user_metadata: {
        created_for: "rls_integration_tests_user_a",
      },
    });

    if (errorA && !errorA.message.includes("already exists")) {
      console.warn(`⚠️ Failed to create User A: ${errorA.message}`);
    } else if (userA) {
      console.log(`✅ User A created/verified: ${TEST_USER.email}`);
    }
  } catch (error) {
    console.warn(`⚠️ Error creating User A:`, error);
  }

  // Create User B
  try {
    const { data: userB, error: errorB } = await adminClient.auth.admin.createUser({
      id: TEST_USER_B.id,
      email: TEST_USER_B.email,
      password: TEST_USER_B.password,
      email_confirm: true,
      user_metadata: {
        created_for: "rls_integration_tests_user_b",
      },
    });

    if (errorB && !errorB.message.includes("already exists")) {
      console.warn(`⚠️ Failed to create User B: ${errorB.message}`);
    } else if (userB) {
      console.log(`✅ User B created/verified: ${TEST_USER_B.email}`);
    }
  } catch (error) {
    console.warn(`⚠️ Error creating User B:`, error);
  }

  // Ensure profiles exist
  await ensureProfileExists(adminClient, TEST_USER.id);
  await ensureProfileExists(adminClient, TEST_USER_B.id);
}

/**
 * Ensures profile exists for user
 */
async function ensureProfileExists(adminClient: any, userId: string) {
  try {
    const { data: existingProfile } = await adminClient.from("profiles").select("id").eq("id", userId).single();

    if (!existingProfile) {
      const { error } = await adminClient.from("profiles").insert({
        id: userId,
        ai_consent_given: false,
      });

      if (error && !error.message.includes("already exists")) {
        console.warn(`⚠️ Failed to create profile for ${userId}:`, error);
      } else {
        console.log(`✅ Profile created for user ${userId}`);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Error ensuring profile for ${userId}:`, error);
  }
}

/**
 * Cleanup function for RLS tests
 */
export async function cleanupRLSTestData(adminClient: any, userAId: string, userBId: string) {
  try {
    // Clean up expenses for both users
    await adminClient.from("expenses").delete().eq("user_id", userAId);
    await adminClient.from("expenses").delete().eq("user_id", userBId);
    console.log("✅ RLS test data cleaned successfully");
  } catch (error) {
    console.warn("⚠️ Failed to cleanup RLS test data:", error);
  }
}
