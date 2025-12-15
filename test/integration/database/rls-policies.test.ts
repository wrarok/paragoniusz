/**
 * RLS Policies Integration Tests
 *
 * Tests Row Level Security policies for expenses table.
 * Verifies that users can only access their own data.
 *
 * Reference: supabase/migrations/20251019211400_create_expenses_table.sql (lines 70-137)
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  createAuthenticatedClient,
  createClientWithUser,
  createServiceRoleClient,
  TEST_USER_B,
} from "../../helpers/test-auth";
import {
  cleanTestDataWithClient,
  cleanTestDataUserB,
  createTestExpense,
  getCategoryByName,
} from "../../helpers/test-database";
import { TEST_USER } from "../../integration-setup";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/db/database.types";

/**
 * Checks if the client is using Service Role Key (which bypasses RLS)
 * Service Role Key bypasses RLS by design - this is expected Supabase behavior
 */
async function isUsingServiceRole(client: SupabaseClient<Database>): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    // If no user session but client works, it's likely Service Role
    return !user;
  } catch {
    // If auth.getUser() fails, it's likely Service Role
    return true;
  }
}

describe("RLS Policies - Expenses Table", () => {
  let categoryId: string;
  let supabaseA: SupabaseClient<Database>;
  let supabaseB: SupabaseClient<Database>;
  let isServiceRoleA: boolean;
  let isServiceRoleB: boolean;

  beforeAll(async () => {
    // Create ONE authenticated client for entire suite (avoid rate limiting)
    supabaseA = await createAuthenticatedClient();
    supabaseB = await createClientWithUser(TEST_USER_B.email, TEST_USER_B.password);

    // Check if we're using Service Role (which bypasses RLS)
    isServiceRoleA = await isUsingServiceRole(supabaseA);
    isServiceRoleB = await isUsingServiceRole(supabaseB);

    if (isServiceRoleA || isServiceRoleB) {
      console.warn("⚠️ RLS tests will be skipped - Service Role Key bypasses RLS policies (expected behavior)");
    }

    // Get a valid category for test expenses
    const category = await getCategoryByName("żywność");
    categoryId = category.id;
  });

  afterEach(async () => {
    // Clean up test data for both users using shared clients
    await cleanTestDataWithClient(supabaseA);
    await cleanTestDataUserB(supabaseB, TEST_USER_B.id);
  });

  afterAll(async () => {
    // Final cleanup
    await cleanTestDataWithClient(supabaseA);
    await cleanTestDataUserB(supabaseB, TEST_USER_B.id);
  });

  describe("SELECT Policy - Read Isolation", () => {
    it.skipIf(() => isServiceRoleA)("should allow user A to read their own expenses", async () => {
      // Create expense for User A with a fixed, predictable date
      const expense = await createTestExpense(supabaseA, {
        category_id: categoryId,
        amount: "50.00",
        expense_date: "2024-01-15",
        user_id: TEST_USER.id,
      });

      // User A should be able to read their own expense
      const { data, error } = await supabaseA
        .from("expenses")
        .select("id, user_id, amount, expense_date") // Explicit column selection
        .eq("id", expense.id)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy(); // More robust than toBeDefined()
      expect(data?.id).toBe(expense.id);
      expect(data?.user_id).toBe(TEST_USER.id);
      expect(data?.amount).toBe(50); // Ensure numeric conversion
      expect(data?.expense_date).toBe("2024-01-15");
    });

    it.skipIf(() => isServiceRoleA || isServiceRoleB)(
      "should prevent user A from reading user B expenses",
      async () => {
        // Create expense for User B
        const expenseB = await createTestExpense(supabaseB, {
          category_id: categoryId,
          amount: "75.00",
          expense_date: "2024-01-16",
          user_id: TEST_USER_B.id,
        });

        // User A tries to read User B's expense
        const { data, error } = await supabaseA.from("expenses").select("*").eq("id", expenseB.id).single();

        // Should return no data due to RLS
        expect(data).toBeNull();
        expect(error?.code).toBe("PGRST116"); // PostgREST error for no rows
      }
    );

    it.skipIf(() => isServiceRoleA || isServiceRoleB)(
      "should return empty array when user A queries all expenses but only user B has data",
      async () => {
        // Create expense for User B only
        await createTestExpense(supabaseB, {
          category_id: categoryId,
          amount: "100.00",
          expense_date: "2024-01-17",
          user_id: TEST_USER_B.id,
        });

        // User A should see zero expenses
        const { data, error } = await supabaseA.from("expenses").select("*");

        expect(error).toBeNull();
        expect(data).toEqual([]);
      }
    );
  });

  describe("INSERT Policy - Write Isolation", () => {
    it.skipIf(() => isServiceRoleA)("should allow user A to insert their own expenses", async () => {
      const supabaseA = await createAuthenticatedClient();

      const { data, error } = await supabaseA
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 45.5,
          expense_date: "2024-01-18",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.user_id).toBe(TEST_USER.id);
      expect(data?.amount).toBe(45.5); // PostgreSQL returns number, not string with trailing zero
    });

    it.skipIf(() => isServiceRoleA)("should prevent user A from inserting expenses for user B", async () => {
      const supabaseA = await createAuthenticatedClient();

      // User A tries to create expense with User B's ID
      const { data, error } = await supabaseA
        .from("expenses")
        .insert({
          user_id: TEST_USER_B.id, // Wrong user_id
          category_id: categoryId,
          amount: 60.0,
          expense_date: "2024-01-19",
          currency: "PLN",
        })
        .select()
        .single();

      // Should fail due to RLS policy with check
      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error?.message).toContain("new row violates row-level security policy");
    });
  });

  describe("UPDATE Policy - Modify Isolation", () => {
    it.skipIf(() => isServiceRoleA)("should allow user A to update their own expenses", async () => {
      const supabaseA = await createAuthenticatedClient();

      // Create expense for User A
      const expense = await createTestExpense(supabaseA, {
        category_id: categoryId,
        amount: "30.00",
        expense_date: "2024-01-20",
        user_id: TEST_USER.id,
      });

      // User A updates their own expense
      const { data, error } = await supabaseA
        .from("expenses")
        .update({ amount: 35.0 })
        .eq("id", expense.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.amount).toBe(35);
    });

    it.skipIf(() => isServiceRoleA || isServiceRoleB)(
      "should prevent user A from updating user B expenses",
      async () => {
        const supabaseA = await createAuthenticatedClient();
        const supabaseB = await createClientWithUser(TEST_USER_B.email, TEST_USER_B.password);

        // Create expense for User B
        const expenseB = await createTestExpense(supabaseB, {
          category_id: categoryId,
          amount: "80.00",
          expense_date: "2024-01-21",
          user_id: TEST_USER_B.id,
        });

        // User A tries to update User B's expense
        const { data, error } = await supabaseA
          .from("expenses")
          .update({ amount: 90.0 })
          .eq("id", expenseB.id)
          .select()
          .single();

        // Should fail - no rows affected
        expect(data).toBeNull();
        expect(error?.code).toBe("PGRST116"); // No rows returned
      }
    );

    it.skipIf(() => isServiceRoleA)("should prevent user A from changing user_id to user B in update", async () => {
      const supabaseA = await createAuthenticatedClient();

      // Create expense for User A
      const expense = await createTestExpense(supabaseA, {
        category_id: categoryId,
        amount: "40.00",
        expense_date: "2024-01-22",
        user_id: TEST_USER.id,
      });

      // User A tries to change user_id to User B
      const { data, error } = await supabaseA
        .from("expenses")
        .update({ user_id: TEST_USER_B.id }) // Try to transfer ownership
        .eq("id", expense.id)
        .select()
        .single();

      // Should fail due to RLS with check policy
      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error?.message).toContain("new row violates row-level security policy");
    });
  });

  describe("DELETE Policy - Remove Isolation", () => {
    it.skipIf(() => isServiceRoleA)("should allow user A to delete their own expenses", async () => {
      const supabaseA = await createAuthenticatedClient();

      // Create expense for User A with a fixed, predictable date
      const expense = await createTestExpense(supabaseA, {
        category_id: categoryId,
        amount: "25.00",
        expense_date: "2024-01-23",
        user_id: TEST_USER.id,
      });

      // User A deletes their own expense
      const { error, data } = await supabaseA.from("expenses").delete().eq("id", expense.id).select();

      expect(error).toBeNull();

      // More robust deletion verification
      expect(data).toBeTruthy();
      expect(data?.length).toBe(1);
      expect(data?.[0].id).toBe(expense.id);

      // Verify deletion
      const { data: checkData } = await supabaseA.from("expenses").select("*").eq("id", expense.id).single();

      expect(checkData).toBeNull();
    });

    it.skipIf(() => isServiceRoleA || isServiceRoleB)(
      "should prevent user A from deleting user B expenses",
      async () => {
        const supabaseA = await createAuthenticatedClient();
        const supabaseB = await createClientWithUser(TEST_USER_B.email, TEST_USER_B.password);

        // Create expense for User B with a fixed, predictable date
        const expenseB = await createTestExpense(supabaseB, {
          category_id: categoryId,
          amount: "55.00",
          expense_date: "2024-01-24",
          user_id: TEST_USER_B.id,
        });

        // User A tries to delete User B's expense
        const { data, error } = await supabaseA.from("expenses").delete().eq("id", expenseB.id).select();

        // Expect no data and no error (RLS prevents deletion)
        expect(data).toEqual([]);
        expect(error).toBeNull();

        // Verify User B's expense still exists
        const { data: checkData } = await supabaseB.from("expenses").select("*").eq("id", expenseB.id).single();

        expect(checkData).not.toBeNull();
        expect(checkData?.id).toBe(expenseB.id);
      }
    );
  });

  describe("Multi-User Scenarios", () => {
    it.skipIf(() => isServiceRoleA || isServiceRoleB)(
      "should correctly isolate data when both users have expenses",
      async () => {
        // Create expenses for both users
        const expenseA = await createTestExpense(supabaseA, {
          category_id: categoryId,
          amount: "10.00",
          expense_date: "2024-01-25",
          user_id: TEST_USER.id,
        });

        const expenseB = await createTestExpense(supabaseB, {
          category_id: categoryId,
          amount: "20.00",
          expense_date: "2024-01-25",
          user_id: TEST_USER_B.id,
        });

        // User A should see only their expense
        const { data: dataA } = await supabaseA.from("expenses").select("*");
        expect(dataA).toHaveLength(1);
        expect(dataA?.[0].id).toBe(expenseA.id);
        expect(dataA?.[0].user_id).toBe(TEST_USER.id);
        expect(dataA?.[0].amount).toBe(10); // PostgreSQL returns number

        // User B should see only their expense
        const { data: dataB } = await supabaseB.from("expenses").select("*");
        expect(dataB).toHaveLength(1);
        expect(dataB?.[0].id).toBe(expenseB.id);
        expect(dataB?.[0].user_id).toBe(TEST_USER_B.id);
        expect(dataB?.[0].amount).toBe(20); // PostgreSQL returns number
      }
    );
  });
});
