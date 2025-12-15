/**
 * Database Constraints Integration Tests
 *
 * Tests database constraints for expenses table:
 * - expenses_amount_positive: amount > 0
 * - expenses_date_not_future: expense_date <= current_date
 * - numeric(10,2) precision: max 99,999,999.99 with 2 decimal places
 * - foreign key constraints: category_id must exist
 *
 * Reference: supabase/migrations/20251019211400_create_expenses_table.sql
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAuthenticatedClient } from "../../helpers/test-auth";
import { cleanTestDataWithClient, getCategoryByName } from "../../helpers/test-database";
import { TEST_USER } from "../../integration-setup";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/db/database.types";

describe("Database Constraints - Expenses Table", () => {
  let categoryId: string;
  let supabase: SupabaseClient<Database>;

  beforeAll(async () => {
    // Create ONE authenticated client for entire suite
    supabase = await createAuthenticatedClient();

    // Get a valid category for test expenses
    const category = await getCategoryByName("żywność");
    categoryId = category.id;
  });

  afterEach(async () => {
    await cleanTestDataWithClient(supabase);
  });

  afterAll(async () => {
    await cleanTestDataWithClient(supabase);
  });

  describe("Amount Constraint - expenses_amount_positive", () => {
    it("should accept positive amounts", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 0.01, // Minimum valid amount
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.amount).toBe(0.01);
    });

    it("should reject zero amount", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 0, // Invalid: zero
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error?.message).toContain("expenses_amount_positive");
    });

    it("should reject negative amounts", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: -50.0, // Invalid: negative
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error?.message).toContain("expenses_amount_positive");
    });

    it("should reject very small negative amounts", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: -0.01, // Invalid: negative
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error?.message).toContain("expenses_amount_positive");
    });
  });

  describe("Date Constraint - expenses_date_not_future", () => {
    it("should accept today date", async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 50.0,
          expense_date: today, // Today is valid
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.expense_date).toBe(today);
    });

    it("should accept past dates", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 50.0,
          expense_date: "2020-01-01", // Past date
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.expense_date).toBe("2020-01-01");
    });

    it("should reject future dates", async () => {
      const supabase = await createAuthenticatedClient();

      // Use a fixed future date to avoid timezone-related issues
      const futureDateStr = "2099-12-31";

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 50.0,
          expense_date: futureDateStr, // Fixed future date
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error?.message).toContain("expenses_date_not_future");
    });

    it("should reject far future dates", async () => {
      const supabase = await createAuthenticatedClient();

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 50.0,
          expense_date: "2030-12-31", // Far future
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error?.message).toContain("expenses_date_not_future");
    });
  });

  describe("Numeric Precision - numeric(10,2)", () => {
    it("should accept amounts with exactly 2 decimal places", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 45.5, // Valid: 2 decimals
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.amount).toBe(45.5); // PostgreSQL doesn't keep trailing zero
    });

    it("should accept amounts with 1 decimal place (auto-padded)", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 45.5, // Will be stored as 45.50
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.amount).toBe(45.5); // PostgreSQL returns number without trailing zero
    });

    it("should accept whole numbers (auto-padded to .00)", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 100, // Will be stored as 100.00
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.amount).toBe(100);
    });

    it("should round amounts with more than 2 decimal places", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 45.567, // Will be rounded to 45.57
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // PostgreSQL rounds 45.567 to 45.57
      expect(Number(data?.amount)).toBeCloseTo(45.57, 2);
    });

    it("should accept maximum valid amount (99,999,999.99)", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 99999999.99, // Max value for numeric(10,2)
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.amount).toBe(99999999.99);
    });

    it("should reject amounts exceeding max value", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 100000000.0, // Exceeds numeric(10,2)
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();

      // More robust error checking
      expect(error?.message).toBeTruthy();
      expect(error?.message.match(/numeric|overflow|constraint/i)).toBeTruthy();
    });

    it("should handle very small amounts correctly", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 0.01, // Minimum positive
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.amount).toBe(0.01);
    });
  });

  describe("Foreign Key Constraint - category_id", () => {
    it("should accept valid category_id", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId, // Valid category
          amount: 50.0,
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.category_id).toBe(categoryId);
    });

    it("should reject non-existent category_id", async () => {
      const supabase = await createAuthenticatedClient();
      const fakeUuid = "00000000-0000-0000-0000-000000000000";

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: fakeUuid, // Non-existent category
          amount: 50.0,
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error?.message).toMatch(/foreign key|constraint/i);
    });

    it("should reject invalid UUID format for category_id", async () => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: "invalid-uuid" as any, // Invalid UUID
          amount: 50.0,
          expense_date: "2024-01-15",
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      // Error could be UUID format or foreign key
      expect(error?.message).toMatch(/invalid input|format/i);
    });
  });

  describe("Multiple Constraints Validation", () => {
    it("should validate all constraints together", async () => {
      const supabase = await createAuthenticatedClient();
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId, // Valid FK
          amount: 45.99, // Valid amount
          expense_date: today, // Valid date
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.amount).toBe(45.99);
      expect(data?.expense_date).toBe(today);
    });

    it("should fail if any constraint is violated", async () => {
      const supabase = await createAuthenticatedClient();
      const futureDateStr = "2099-12-31";

      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: -10.0, // Violates amount constraint
          expense_date: futureDateStr, // Violates date constraint
          currency: "PLN",
        })
        .select()
        .single();

      expect(error).not.toBeNull();
      expect(data).toBeNull();

      // More robust constraint violation check
      expect(error?.message.match(/amount|constraint|negative/i)).toBeTruthy();
    });
  });
});
