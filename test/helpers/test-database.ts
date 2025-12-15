/**
 * Database Test Helpers
 *
 * Helper utilities for managing database operations in integration tests.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/db/database.types";
import { TEST_USER } from "../integration-setup";

/**
 * Creates a Supabase client for integration tests
 * Uses dedicated test user from .env.test
 */
export function createTestClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables");
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Cleans test data using provided authenticated client
 * Preferred for suite-level tests to avoid creating new sessions
 */
export async function cleanTestDataWithClient(supabase: ReturnType<typeof createClient<Database>>) {
  try {
    // Delete all test user's expenses
    const { error: expensesError } = await supabase.from("expenses").delete().eq("user_id", TEST_USER.id);

    if (expensesError) {
      console.error("Error cleaning expenses:", expensesError);
      throw expensesError;
    }

    console.log("✅ Test data cleaned successfully");
  } catch (error) {
    console.error("❌ Failed to clean test data:", error);
    throw error;
  }
}

/**
 * Safely cleans test data from database
 * ONLY for TEST_USER - RLS protects against accidental deletion of other data
 * Requires authenticated client to bypass RLS
 * NOTE: Creates new auth session - use cleanTestDataWithClient() for suite-level tests
 */
export async function cleanTestData() {
  // Import here to avoid circular dependency
  const { createAuthenticatedClient } = await import("./test-auth.ts");
  const supabase = await createAuthenticatedClient();

  await cleanTestDataWithClient(supabase);
}

/**
 * Fetches all categories from database
 * Categories are shared between users
 */
export async function getCategories() {
  const supabase = createTestClient();

  const { data, error } = await supabase.from("categories").select("*").order("name");

  if (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }

  return data;
}

/**
 * Finds category by name (case-insensitive)
 */
export async function getCategoryByName(name: string) {
  const supabase = createTestClient();

  const { data, error } = await supabase.from("categories").select("*").ilike("name", name).single();

  if (error) {
    console.error(`Error fetching category "${name}":`, error);
    throw error;
  }

  return data;
}

/**
 * Verifies that required categories are properly set up in database
 */
export async function verifyCategoriesSetup() {
  const categories = await getCategories();

  const requiredCategories = [
    "żywność",
    "transport",
    "media",
    "rozrywka",
    "zdrowie",
    "edukacja",
    "odzież",
    "restauracje",
    "mieszkanie",
    "ubezpieczenia",
    "higiena",
    "prezenty",
    "podróże",
    "subskrypcje",
    "inne",
  ];

  const categoryNames = categories.map((c) => c.name.toLowerCase());
  const missing = requiredCategories.filter((name) => !categoryNames.includes(name));

  if (missing.length > 0) {
    throw new Error(`Missing required categories: ${missing.join(", ")}. Please run migrations.`);
  }

  return categories;
}

/**
 * Cleans test data for User B (used in RLS tests)
 * Only removes data belonging to TEST_USER_B for safety
 */
export async function cleanTestDataUserB(supabase: ReturnType<typeof createClient<Database>>, userBId: string) {
  // Delete all expenses for User B
  const { error: expensesError } = await supabase.from("expenses").delete().eq("user_id", userBId);

  if (expensesError) {
    console.error("Failed to clean User B expenses:", expensesError);
    throw expensesError;
  }

  console.log("✅ Test data cleaned for User B");
}

/**
 * Helper for creating test expense
 * Requires an authenticated Supabase client to respect RLS
 */
export async function createTestExpense(
  supabase: ReturnType<typeof createClient<Database>>,
  data: {
    category_id: string;
    amount: string;
    expense_date: string;
    user_id?: string;
  }
) {
  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      user_id: data.user_id || TEST_USER.id,
      category_id: data.category_id,
      amount: parseFloat(data.amount), // Convert string to number for database
      expense_date: data.expense_date,
      currency: "PLN",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating test expense:", error);
    throw error;
  }

  return expense;
}
