/**
 * Authentication Test Helpers
 * 
 * Helper utilities for authentication operations in integration tests.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/db/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TEST_USER } from '../integration-setup';

/**
 * Test User B credentials for RLS isolation tests
 * This user should be created manually in Supabase Auth
 * Used to test that User A cannot access User B's data
 */
export const TEST_USER_B = {
  email: 'test-b@test.com',
  password: 'aaAA22@@',
  id: 'fd9e8a02-b770-406b-b201-89118a568e1f',
};


/**
 * Creates an authenticated Supabase client for the test user
 * This bypasses the API layer and authenticates directly with Supabase
 * Each call creates a fresh client with a new session for proper RLS isolation
 */
export async function createAuthenticatedClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Sign in with test user credentials
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  if (error) {
    console.error('Failed to authenticate test user:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }

  if (!data.session) {
    throw new Error('No session returned after authentication');
  }

  return supabase;
}

/**
 * Signs out the test user from all sessions
 * Useful for cleanup between tests
 */
export async function signOutTestUser() {
  const supabase = await createAuthenticatedClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Failed to sign out test user:', error);
    throw error;
  }
}

/**
 * Gets the current session for the test user
 * Returns null if not authenticated
 */
export async function getTestUserSession() {
  const supabase = await createAuthenticatedClient();
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Failed to get test user session:', error);
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
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      throw new Error(`Failed to verify test user: ${error.message}`);
    }

    if (!user) {
      throw new Error('Test user not found');
    }

    if (user.id !== TEST_USER.id) {
      throw new Error(
        `Test user ID mismatch. Expected: ${TEST_USER.id}, Got: ${user.id}`
      );
    }

    return user;
  } catch (error) {
    console.error('❌ Test user verification failed:', error);
    throw new Error(
      `Test user ${TEST_USER.email} does not exist. Please create it manually or check .env.test configuration.`
    );
  }
}

/**
 * Creates a Supabase client with a specific user's session
 * Useful for testing RLS policies with different users
 * Each call creates a fresh client with a new session for proper RLS isolation
 */
export async function createClientWithUser(email: string, password: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Authentication failed for ${email}: ${error.message}`);
  }

  if (!data.session) {
    throw new Error(`No session returned for ${email}`);
  }

  return supabase;
}