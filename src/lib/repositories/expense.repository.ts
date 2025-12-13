import type { SupabaseClient } from '../../db/supabase.client';
import type { ExpenseQueryBuilder } from '../builders/expense-query.builder';

/**
 * Database entity for expense with nested category
 */
export interface DatabaseExpense {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  expense_date: string;
  currency: string;
  created_by_ai: boolean;
  was_ai_suggestion_edited: boolean;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string };
}

/**
 * Data required to insert a new expense
 */
export interface InsertExpense {
  user_id: string;
  category_id: string;
  amount: number;
  expense_date: string;
  currency: string;
  created_by_ai: boolean;
  was_ai_suggestion_edited: boolean;
}

/**
 * Repository for expense data access operations
 * 
 * Provides abstraction over Supabase client for expense-related queries.
 * All methods return database entities, not DTOs.
 * Implements Repository Pattern for separation of concerns.
 */
export class ExpenseRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Find expense by ID
   * @param id - Expense UUID
   * @returns Database expense with nested category or null if not found
   */
  async findById(id: string): Promise<DatabaseExpense | null> {
    const { data, error } = await this.supabase
      .from('expenses')
      .select(`*, category:categories(id, name)`)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as DatabaseExpense;
  }

  /**
   * Find multiple expenses using query builder
   * @param queryBuilder - Builder with filters, sorting, and pagination
   * @returns Array of database expenses with nested categories
   */
  async findMany(queryBuilder: ExpenseQueryBuilder): Promise<DatabaseExpense[]> {
    const query = queryBuilder.build(this.supabase);
    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }

    return (data || []) as DatabaseExpense[];
  }

  /**
   * Count expenses matching query builder filters
   * @param queryBuilder - Builder with same filters as findMany
   * @returns Total count of matching expenses
   */
  async count(queryBuilder: ExpenseQueryBuilder): Promise<number> {
    const query = queryBuilder.buildCountQuery(this.supabase);
    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count expenses: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Create single expense
   * @param data - Expense data to insert
   * @returns Created expense with nested category
   */
  async create(data: InsertExpense): Promise<DatabaseExpense> {
    const { data: created, error } = await this.supabase
      .from('expenses')
      .insert(data)
      .select(`*, category:categories(id, name)`)
      .single();

    if (error) {
      throw error;
    }

    return created as DatabaseExpense;
  }

  /**
   * Create multiple expenses in single transaction
   * @param data - Array of expense data to insert
   * @returns Array of created expenses with nested categories
   */
  async createBatch(data: InsertExpense[]): Promise<DatabaseExpense[]> {
    const { data: created, error } = await this.supabase
      .from('expenses')
      .insert(data)
      .select(`*, category:categories(id, name)`);

    if (error) {
      throw error;
    }

    return (created || []) as DatabaseExpense[];
  }

  /**
   * Update expense by ID
   * @param id - Expense UUID
   * @param data - Partial expense data to update
   * @returns Updated expense with nested category or null if not found
   */
  async update(id: string, data: Partial<InsertExpense>): Promise<DatabaseExpense | null> {
    const { data: updated, error } = await this.supabase
      .from('expenses')
      .update(data)
      .eq('id', id)
      .select(`*, category:categories(id, name)`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return updated as DatabaseExpense;
  }

  /**
   * Delete expense by ID
   * @param id - Expense UUID
   * @returns true if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const { error, count } = await this.supabase
      .from('expenses')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return (count || 0) > 0;
  }

  /**
   * Validate that category IDs exist in database
   * @param categoryIds - Array of category UUIDs to validate
   * @returns List of invalid IDs (empty array if all valid)
   */
  async validateCategories(categoryIds: string[]): Promise<string[]> {
    if (categoryIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('categories')
      .select('id')
      .in('id', categoryIds);

    if (error) {
      throw error;
    }

    const validIds = new Set(data.map((c) => c.id));
    return categoryIds.filter((id) => !validIds.has(id));
  }
}