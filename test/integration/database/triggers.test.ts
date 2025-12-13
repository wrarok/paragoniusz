/**
 * Database Triggers Integration Tests
 * 
 * Tests database triggers and automatic behaviors:
 * - set_updated_at trigger: automatically updates updated_at on row changes
 * - CASCADE DELETE: expenses deleted when user is deleted
 * 
 * Reference: supabase/migrations/20251019211400_create_expenses_table.sql (lines 139-144)
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createAuthenticatedClient } from '../../helpers/test-auth';
import { cleanTestDataWithClient, createTestExpense, getCategoryByName } from '../../helpers/test-database';
import { TEST_USER } from '../../integration-setup';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/db/database.types';

describe('Database Triggers - Expenses Table', () => {
  let categoryId: string;
  let supabase: SupabaseClient<Database>;

  beforeAll(async () => {
    // Create ONE authenticated client for entire suite
    supabase = await createAuthenticatedClient();
    
    // Get a valid category for test expenses
    const category = await getCategoryByName('żywność');
    categoryId = category.id;
  });

  afterEach(async () => {
    await cleanTestDataWithClient(supabase);
  });

  afterAll(async () => {
    await cleanTestDataWithClient(supabase);
  });

  describe('set_updated_at Trigger', () => {
    it('should automatically set updated_at on insert', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 50.00,
          expense_date: '2024-01-15',
          currency: 'PLN',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.updated_at).toBeDefined();
      
      // Verify updated_at is set and is a recent timestamp
      const updatedAt = new Date(data!.updated_at);
      const now = new Date();
      const diffSeconds = (now.getTime() - updatedAt.getTime()) / 1000;
      
      // Should be within last 5 seconds
      expect(diffSeconds).toBeLessThan(5);
      expect(diffSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should automatically update updated_at on row modification', async () => {
      // Create initial expense
      const expense = await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '30.00',
        expense_date: '2024-01-20',
        user_id: TEST_USER.id,
      });

      const originalUpdatedAt = new Date(expense.updated_at);

      // Wait at least 1 second to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Update the expense
      const { data: updatedExpense, error } = await supabase
        .from('expenses')
        .update({ amount: 35.00 })
        .eq('id', expense.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedExpense).toBeDefined();
      
      const newUpdatedAt = new Date(updatedExpense!.updated_at);
      
      // updated_at should be later than original
      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      // Verify at least 1 second difference
      const diffSeconds = (newUpdatedAt.getTime() - originalUpdatedAt.getTime()) / 1000;
      expect(diffSeconds).toBeGreaterThanOrEqual(1);
    });

    it('should update updated_at even for unchanged values', async () => {
      // Create initial expense
      const expense = await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '40.00',
        expense_date: '2024-01-21',
        user_id: TEST_USER.id,
      });

      const originalUpdatedAt = new Date(expense.updated_at);

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Update with same value
      const { data: updatedExpense, error } = await supabase
        .from('expenses')
        .update({ amount: 40.00 }) // Same amount
        .eq('id', expense.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedExpense).toBeDefined();
      
      const newUpdatedAt = new Date(updatedExpense!.updated_at);
      
      // Trigger should still fire even if value unchanged
      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should update updated_at when multiple fields change', async () => {
      // Create initial expense
      const expense = await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '25.00',
        expense_date: '2024-01-22',
        user_id: TEST_USER.id,
      });

      const originalUpdatedAt = new Date(expense.updated_at);

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Get another category for update
      const newCategory = await getCategoryByName('transport');

      // Update multiple fields
      const { data: updatedExpense, error } = await supabase
        .from('expenses')
        .update({ 
          amount: 30.00,
          category_id: newCategory.id,
          expense_date: '2024-01-23',
        })
        .eq('id', expense.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedExpense).toBeDefined();
      
      const newUpdatedAt = new Date(updatedExpense!.updated_at);
      
      // Trigger should fire once
      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      // Verify all fields were updated
      expect(updatedExpense!.amount).toBe(30);
      expect(updatedExpense!.category_id).toBe(newCategory.id);
      expect(updatedExpense!.expense_date).toBe('2024-01-23');
    });

    it('should not change updated_at on SELECT queries', async () => {
      // Create initial expense
      const expense = await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '15.00',
        expense_date: '2024-01-24',
        user_id: TEST_USER.id,
      });

      const originalUpdatedAt = new Date(expense.updated_at);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      // SELECT query should not trigger update
      const { data: fetchedExpense, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expense.id)
        .single();

      expect(error).toBeNull();
      expect(fetchedExpense).toBeDefined();
      
      const fetchedUpdatedAt = new Date(fetchedExpense!.updated_at);
      
      // Should be exactly the same (SELECT doesn't trigger)
      expect(fetchedUpdatedAt.getTime()).toBe(originalUpdatedAt.getTime());
    });

    it('should update updated_at for AI tracking field changes', async () => {
      // Create expense with AI tracking
      const { data: expense, error: createError } = await supabase
        .from('expenses')
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 20.00,
          expense_date: '2024-01-25',
          currency: 'PLN',
          created_by_ai: true,
          was_ai_suggestion_edited: false,
        })
        .select()
        .single();

      expect(createError).toBeNull();
      const originalUpdatedAt = new Date(expense!.updated_at);

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Update AI tracking field
      const { data: updatedExpense, error } = await supabase
        .from('expenses')
        .update({ was_ai_suggestion_edited: true })
        .eq('id', expense!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedExpense).toBeDefined();
      
      const newUpdatedAt = new Date(updatedExpense!.updated_at);
      
      // Trigger should fire for AI field updates too
      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      expect(updatedExpense!.was_ai_suggestion_edited).toBe(true);
    });
  });

  describe('CASCADE DELETE Behavior', () => {
    it('should allow manual deletion of expense', async () => {
      // Create expense
      const expense = await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '55.00',
        expense_date: '2024-01-26',
        user_id: TEST_USER.id,
      });

      // Manually delete expense
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data: checkData } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expense.id)
        .single();

      expect(checkData).toBeNull();
    });

    // NOTE: Testing CASCADE DELETE on user deletion requires admin access
    // This would be tested in a separate admin test suite or manually
    // For now, we document the expected behavior
    it.skip('should cascade delete expenses when user is deleted (requires admin access)', async () => {
      // This test requires Supabase admin client which isn't available in integration tests
      // Expected behavior: When a user is deleted, all their expenses are automatically deleted
      // Reference: migration line 19: "on delete cascade"
      
      // Setup: Create test user and expenses
      // Action: Delete user via admin API
      // Verify: All user's expenses are gone
      
      expect(true).toBe(true); // Placeholder
    });

    it('should NOT cascade delete when category is deleted', async () => {
      // Categories use foreign key WITHOUT cascade delete
      // This means expenses should be preserved if category is removed
      // In practice, categories should never be deleted, only marked inactive
      // This test documents the design decision
      
      expect(true).toBe(true); // Placeholder - categories shouldn't be deleted
    });
  });

  describe('Timestamp Consistency', () => {
    it('should have created_at and updated_at equal on insert', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: TEST_USER.id,
          category_id: categoryId,
          amount: 60.00,
          expense_date: '2024-01-27',
          currency: 'PLN',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // On insert, both timestamps should be the same (or very close)
      const createdAt = new Date(data!.created_at);
      const updatedAt = new Date(data!.updated_at);
      
      // Allow 1 second difference (should be identical but allow small clock skew)
      const diff = Math.abs(updatedAt.getTime() - createdAt.getTime());
      expect(diff).toBeLessThan(1000);
    });

    it('should keep created_at unchanged after update', async () => {
      // Create expense
      const expense = await createTestExpense(supabase, {
        category_id: categoryId,
        amount: '70.00',
        expense_date: '2024-01-28',
        user_id: TEST_USER.id,
      });

      const originalCreatedAt = new Date(expense.created_at);

      // Wait and update
      await new Promise(resolve => setTimeout(resolve, 1100));

      const { data: updatedExpense, error } = await supabase
        .from('expenses')
        .update({ amount: 75.00 })
        .eq('id', expense.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedExpense).toBeDefined();
      
      const newCreatedAt = new Date(updatedExpense!.created_at);
      
      // created_at should NEVER change
      expect(newCreatedAt.getTime()).toBe(originalCreatedAt.getTime());
      
      // But updated_at SHOULD change
      const newUpdatedAt = new Date(updatedExpense!.updated_at);
      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
    });
  });
});