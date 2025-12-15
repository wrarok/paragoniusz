import type { SupabaseClient } from "../../db/supabase.client";
import type {
  ExpenseDTO,
  ExpenseListDTO,
  ExpenseQueryParams,
  CreateExpenseCommand,
  UpdateExpenseCommand,
  BatchExpenseItem,
} from "../../types";
import { ExpenseRepository } from "../repositories/expense.repository";
import { ExpenseQueryBuilder } from "../builders/expense-query.builder";
import { ExpenseTransformer } from "../transformers/expense.transformer";

/**
 * Service for expense business logic (Refactored)
 *
 * Orchestrates repository, query builder, and transformer.
 * Contains only business logic, no data access or transformation code.
 *
 * Implements SOLID principles:
 * - Single Responsibility: Only orchestration and business logic
 * - Open/Closed: Extensible through dependency injection
 * - Liskov Substitution: Depends on abstractions (repository pattern)
 * - Interface Segregation: Clean, focused interfaces
 * - Dependency Inversion: Depends on abstractions, not concretions
 */
export class ExpenseService {
  constructor(
    private repository: ExpenseRepository,
    private queryBuilder: ExpenseQueryBuilder,
    private transformer: typeof ExpenseTransformer
  ) {}

  /**
   * Validate that category IDs exist
   * @param categoryIds - Array of category UUIDs to validate
   * @returns Validation result with list of invalid IDs
   */
  async validateCategories(categoryIds: string[]): Promise<{ valid: boolean; invalidIds: string[] }> {
    const invalidIds = await this.repository.validateCategories(categoryIds);
    return {
      valid: invalidIds.length === 0,
      invalidIds,
    };
  }

  /**
   * Create multiple expenses in batch
   * @param userId - User ID from authentication context
   * @param expenses - Array of batch expense items
   * @returns Array of created expenses as DTOs
   */
  async createBatch(userId: string, expenses: BatchExpenseItem[]): Promise<ExpenseDTO[]> {
    const insertData = this.transformer.toBatchInsertData(expenses, userId);
    const created = await this.repository.createBatch(insertData);
    return this.transformer.toDTOList(created);
  }

  /**
   * List expenses with filtering, sorting, and pagination
   *
   * Executes main query and count query in parallel for better performance.
   * Uses query builder to eliminate filter duplication.
   *
   * @param params - Query parameters for filtering, sorting, and pagination
   * @returns Paginated list of expenses with total count
   */
  async list(params: ExpenseQueryParams): Promise<ExpenseListDTO> {
    const { limit = 50, offset = 0, from_date, to_date, category_id, sort = "expense_date.desc" } = params;

    // Build query using query builder
    this.queryBuilder
      .reset()
      .withDateRange(from_date, to_date)
      .withCategory(category_id)
      .withSort(sort)
      .withPagination(offset, limit);

    // Execute queries in parallel for better performance
    const [expenses, total] = await Promise.all([
      this.repository.findMany(this.queryBuilder),
      this.repository.count(this.queryBuilder),
    ]);

    // Transform to DTOs
    const expenseDTOs = this.transformer.toDTOList(expenses);

    return {
      data: expenseDTOs,
      count: expenseDTOs.length,
      total,
    };
  }

  /**
   * Get single expense by ID
   * @param expenseId - Expense UUID
   * @returns Expense DTO or null if not found
   */
  async getById(expenseId: string): Promise<ExpenseDTO | null> {
    const expense = await this.repository.findById(expenseId);
    return expense ? this.transformer.toDTO(expense) : null;
  }

  /**
   * Create single expense
   * @param userId - User ID from authentication context
   * @param expenseData - Validated expense data from API
   * @returns Created expense as DTO
   */
  async create(userId: string, expenseData: CreateExpenseCommand): Promise<ExpenseDTO> {
    const insertData = this.transformer.toInsertData(expenseData, userId);
    const created = await this.repository.create(insertData);
    return this.transformer.toDTO(created);
  }

  /**
   * Update expense by ID
   * @param expenseId - Expense UUID
   * @param updateData - Partial expense data to update
   * @returns Updated expense DTO or null if not found
   */
  async update(expenseId: string, updateData: UpdateExpenseCommand): Promise<ExpenseDTO | null> {
    const updatePayload = this.transformer.toUpdateData(updateData);
    const updated = await this.repository.update(expenseId, updatePayload);
    return updated ? this.transformer.toDTO(updated) : null;
  }

  /**
   * Delete expense by ID
   * @param expenseId - Expense UUID
   * @returns Success result with optional error message
   */
  async delete(expenseId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleted = await this.repository.delete(expenseId);

      if (!deleted) {
        return { success: false, error: "Expense not found" };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected error in deleteExpense:", error);
      return {
        success: false,
        error: "An unexpected error occurred",
      };
    }
  }
}

/**
 * Factory function for creating ExpenseService with dependencies
 *
 * Provides convenient way to instantiate service with all dependencies.
 * Used for backward compatibility and in tests.
 *
 * @param supabase - Supabase client instance
 * @returns Fully configured ExpenseService instance
 */
export function createExpenseService(supabase: SupabaseClient): ExpenseService {
  const repository = new ExpenseRepository(supabase);
  const queryBuilder = new ExpenseQueryBuilder();
  const transformer = ExpenseTransformer;

  return new ExpenseService(repository, queryBuilder, transformer);
}

// ============================================================================
// Backward Compatibility Layer
// ============================================================================
// Export individual functions that match the original API for seamless migration

/**
 * Validates that all provided category IDs exist in the database
 * @deprecated Use ExpenseService.validateCategories() instead
 */
export async function validateCategories(
  supabase: SupabaseClient,
  categoryIds: string[]
): Promise<{ valid: boolean; invalidIds: string[] }> {
  const service = createExpenseService(supabase);
  return service.validateCategories(categoryIds);
}

/**
 * Creates multiple expenses in a single atomic transaction
 * @deprecated Use ExpenseService.createBatch() instead
 */
export async function createExpensesBatch(
  supabase: SupabaseClient,
  userId: string,
  expenses: BatchExpenseItem[]
): Promise<ExpenseDTO[]> {
  const service = createExpenseService(supabase);
  return service.createBatch(userId, expenses);
}

/**
 * Retrieves a paginated list of expenses for the authenticated user
 * @deprecated Use ExpenseService.list() instead
 */
export async function listExpenses(supabase: SupabaseClient, params: ExpenseQueryParams): Promise<ExpenseListDTO> {
  const service = createExpenseService(supabase);
  return service.list(params);
}

/**
 * Retrieves a single expense by ID
 * @deprecated Use ExpenseService.getById() instead
 */
export async function getExpenseById(supabase: SupabaseClient, expenseId: string): Promise<ExpenseDTO | null> {
  const service = createExpenseService(supabase);
  return service.getById(expenseId);
}

/**
 * Creates a single expense manually
 * @deprecated Use ExpenseService.create() instead
 */
export async function createExpense(
  supabase: SupabaseClient,
  userId: string,
  expenseData: CreateExpenseCommand
): Promise<ExpenseDTO> {
  const service = createExpenseService(supabase);
  return service.create(userId, expenseData);
}

/**
 * Updates an expense by ID with partial data
 * @deprecated Use ExpenseService.update() instead
 */
export async function updateExpense(
  supabase: SupabaseClient,
  expenseId: string,
  updateData: UpdateExpenseCommand
): Promise<ExpenseDTO | null> {
  const service = createExpenseService(supabase);
  return service.update(expenseId, updateData);
}

/**
 * Deletes an expense by ID
 * @deprecated Use ExpenseService.delete() instead
 */
export async function deleteExpense(
  supabase: SupabaseClient,
  expenseId: string
): Promise<{ success: boolean; error?: string }> {
  const service = createExpenseService(supabase);
  return service.delete(expenseId);
}
