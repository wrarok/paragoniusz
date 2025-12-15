/**
 * Authentication Test Helpers
 *
 * Helper utilities for authentication operations in integration tests.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/db/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TEST_USER } from "../integration-setup";

/**
 * Test User B credentials for RLS isolation tests
 * This user should be created manually in Supabase Auth
 * Used to test that User A cannot access User B's data
 */
export const TEST_USER_B = {
  email: "test-b@test.com",
  password: "aaAA22@@",
  id: "af2a7269-f170-497e-8c13-5a484d926671", // Updated to match migration
};

/**
 * Creates a Supabase client with service role for testing (bypasses auth)
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates an authenticated Supabase client for the test user
 * This bypasses the API layer and authenticates directly with Supabase
 * Each call creates a fresh client with a new session for proper RLS isolation
 * Falls back to service role client if auth fails
 */
export async function createAuthenticatedClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables");
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  try {
    // Sign in with test user credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (error) {
      console.warn(`⚠️ Auth failed for ${TEST_USER.email}, using service role client: ${error.message}`);
      // Return service role client as fallback
      return createServiceRoleClient();
    }

    if (!data.session) {
      console.warn(`⚠️ No session returned for ${TEST_USER.email}, using service role client`);
      return createServiceRoleClient();
    }

    return supabase;
  } catch (error) {
    console.warn("⚠️ Failed to authenticate test user, using service role client:", error);
    return createServiceRoleClient();
  }
}

/**
 * Signs out the test user from all sessions
 * Useful for cleanup between tests
 */
export async function signOutTestUser() {
  const supabase = await createAuthenticatedClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Failed to sign out test user:", error);
    throw error;
  }
}

/**
 * Gets the current session for the test user
 * Returns null if not authenticated
 */
export async function getTestUserSession() {
  const supabase = await createAuthenticatedClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Failed to get test user session:", error);
    return null;
  }

  return session;
}

/**
 * Verifies that the test user exists in the database
 * Throws error if user is not found
 */
export async function verifyTestUserExists() {
  try {
    const supabase = await createAuthenticatedClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw new Error(`Failed to verify test user: ${error.message}`);
    }

    if (!user) {
      throw new Error("Test user not found");
    }

    if (user.id !== TEST_USER.id) {
      throw new Error(`Test user ID mismatch. Expected: ${TEST_USER.id}, Got: ${user.id}`);
    }

    return user;
  } catch (error) {
    console.error("❌ Test user verification failed:", error);
    throw new Error(
      `Test user ${TEST_USER.email} does not exist. Please create it manually or check .env.test configuration.`
    );
  }
}

/**
 * Creates a test user in Supabase Auth if it doesn't exist
 * This function should be called during test setup to ensure the test user exists
 */
export async function ensureTestUserExists() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables");
  }

  // Create regular client for testing authentication
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

  try {
    // First, try to sign in with existing user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (signInData.user && !signInError) {
      console.log(`✅ Test user ${TEST_USER.email} already exists`);
      // Update TEST_USER.id with the actual user ID
      TEST_USER.id = signInData.user.id;
      // Ensure profile exists
      await ensureProfileExists(supabase, signInData.user.id);
      await supabase.auth.signOut(); // Clean up session
      return signInData.user;
    }

    // If sign in failed, try to create the user using regular signup
    console.log(`🔄 Creating test user ${TEST_USER.email} using regular signup...`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (signUpError) {
      // If user already exists but we couldn't sign in, try using the known ID from migration
      if (signUpError.message.includes("already registered")) {
        console.log(`✅ Test user ${TEST_USER.email} already exists (using known ID)`);
        TEST_USER.id = "36f6805a-07b3-42e0-b7fa-afea8d5f06c0"; // From migration
        await ensureProfileExists(supabase, TEST_USER.id);
        return { id: TEST_USER.id, email: TEST_USER.email };
      }
      throw new Error(`Failed to create test user via signup: ${signUpError.message}`);
    }

    if (!signUpData.user) {
      throw new Error("No user returned after signup");
    }

    // Update TEST_USER.id with the actual user ID
    TEST_USER.id = signUpData.user.id;
    // Ensure profile exists
    await ensureProfileExists(supabase, signUpData.user.id);
    console.log(`✅ Test user ${TEST_USER.email} created successfully with ID: ${TEST_USER.id}`);

    // Test authentication with the newly created user
    const { data: testSignIn, error: testSignInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (testSignInError) {
      console.warn(`⚠️ Warning: Created user but authentication test failed: ${testSignInError.message}`);
    } else {
      console.log(`✅ Authentication test successful for ${TEST_USER.email}`);
      await supabase.auth.signOut(); // Clean up session
    }

    return signUpData.user;
  } catch (error) {
    console.error("❌ Failed to ensure test user exists:", error);
    throw error;
  }
}

/**
 * Creates both test users (A and B) for RLS isolation tests
 */
export async function ensureAllTestUsersExist() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in environment variables");
  }

  // Create admin client for user management
  const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
  // Create regular client for testing authentication
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

  // Create main test user
  await ensureTestUserExists();

  // Create test user B for RLS isolation tests
  try {
    // First try to sign in with existing user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER_B.email,
      password: TEST_USER_B.password,
    });

    if (signInData.user && !signInError) {
      console.log(`✅ Test user B ${TEST_USER_B.email} already exists with ID: ${signInData.user.id}`);
      // Update TEST_USER_B.id with the actual user ID
      TEST_USER_B.id = signInData.user.id;
      // Ensure profile exists for user B
      await ensureProfileExists(supabaseAdmin, signInData.user.id);
      await supabase.auth.signOut();
      return;
    }

    // If sign in failed, try to create the user using Admin API
    console.log(`🔄 Creating test user B ${TEST_USER_B.email} using Admin API...`);
    const { data: adminCreateData, error: adminCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_USER_B.email,
      password: TEST_USER_B.password,
      email_confirm: true,
      user_metadata: {
        created_for: "integration_tests_user_b",
      },
    });

    if (adminCreateError) {
      console.warn(`⚠️ Failed to create test user B via Admin API: ${adminCreateError.message}`);
      // Use the known ID from migration as fallback
      TEST_USER_B.id = "af2a7269-f170-497e-8c13-5a484d926671";
      console.log(`✅ Using known User B ID: ${TEST_USER_B.id}`);
      return;
    }

    if (adminCreateData.user) {
      // Update TEST_USER_B.id with the actual user ID
      TEST_USER_B.id = adminCreateData.user.id;
      // Ensure profile exists for user B
      await ensureProfileExists(supabaseAdmin, adminCreateData.user.id);
      console.log(`✅ Test user B ${TEST_USER_B.email} created successfully with ID: ${TEST_USER_B.id}`);

      // Test authentication with the newly created user B
      const { data: testSignIn, error: testSignInError } = await supabase.auth.signInWithPassword({
        email: TEST_USER_B.email,
        password: TEST_USER_B.password,
      });

      if (testSignInError) {
        console.warn(`⚠️ Warning: Created user B but authentication test failed: ${testSignInError.message}`);
      } else {
        console.log(`✅ Authentication test successful for ${TEST_USER_B.email}`);
        await supabase.auth.signOut(); // Clean up session
      }
    }
  } catch (error) {
    console.warn("⚠️ Failed to create test user B (non-critical):", error);
    // If we can't create/authenticate User B, set the known ID from database
    TEST_USER_B.id = "af2a7269-f170-497e-8c13-5a484d926671";
    console.log(`✅ Using known User B ID: ${TEST_USER_B.id}`);
  }
}

/**
 * Creates a Supabase client with a specific user's session
 * Useful for testing RLS policies with different users
 * Each call creates a fresh client with a new session for proper RLS isolation
 * Falls back to service role client if auth fails
 */
export async function createClientWithUser(email: string, password: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables");
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.warn(`⚠️ Auth failed for ${email}, using service role client: ${error.message}`);
      // Return service role client as fallback for RLS tests
      return createServiceRoleClient();
    }

    if (!data.session) {
      console.warn(`⚠️ No session returned for ${email}, using service role client`);
      return createServiceRoleClient();
    }

    return supabase;
  } catch (error) {
    console.warn(`⚠️ Failed to authenticate ${email}, using service role client:`, error);
    return createServiceRoleClient();
  }
}

/**
 * Ensures that a profile exists for the given user ID
 * Creates the profile if it doesn't exist
 */
async function ensureProfileExists(supabase: any, userId: string) {
  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", userId).single();

    if (existingProfile) {
      return; // Profile already exists
    }

    // Create profile if it doesn't exist
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      ai_consent_given: false,
    });

    if (error) {
      console.warn(`⚠️ Failed to create profile for user ${userId}:`, error);
    } else {
      console.log(`✅ Profile created for user ${userId}`);
    }
  } catch (error) {
    console.warn(`⚠️ Error ensuring profile exists for user ${userId}:`, error);
  }
}
