import type { SupabaseClient } from '../../db/supabase.client';
import type {
  BatchExpenseItem,
  ExpenseDTO,
  ExpenseListDTO,
  ExpenseQueryParams,
  CategoryDTO,
  CreateExpenseCommand,
  UpdateExpenseCommand
} from '../../types';

/**
 * Validates that all provided category IDs exist in the database
 * @param supabase - Supabase client instance
 * @param categoryIds - Array of category IDs to validate
 * @returns Object containing validation result and list of invalid IDs
 */
export async function validateCategories(
  supabase: SupabaseClient,
  categoryIds: string[]
): Promise<{ valid: boolean; invalidIds: string[] }> {
  // Handle edge case of empty array
  if (categoryIds.length === 0) {
    return { valid: true, invalidIds: [] };
  }

  // Query database for categories
  const { data, error } = await supabase.from('categories').select('id').in('id', categoryIds);

  if (error) {
    throw error;
  }

  // Compare provided IDs with existing IDs
  const validIds = new Set(data.map((c) => c.id));
  const invalidIds = categoryIds.filter((id) => !validIds.has(id));

  return {
    valid: invalidIds.length === 0,
    invalidIds,
  };
}

/**
 * Creates multiple expenses in a single atomic transaction
 * @param supabase - Supabase client instance
 * @param userId - ID of the user creating the expenses
 * @param expenses - Array of expense items to create
 * @returns Array of created expenses with nested category information
 */
export async function createExpensesBatch(
  supabase: SupabaseClient,
  userId: string,
  expenses: BatchExpenseItem[]
): Promise<ExpenseDTO[]> {
  // Prepare insert data with user_id and default values
  const insertData = expenses.map((expense) => ({
    user_id: userId,
    category_id: expense.category_id,
    amount: parseFloat(expense.amount),
    expense_date: expense.expense_date,
    currency: expense.currency || 'PLN',
    created_by_ai: expense.created_by_ai ?? false,
    was_ai_suggestion_edited: expense.was_ai_suggestion_edited ?? false,
  }));

  // Insert all expenses and fetch with category information
  const { data, error } = await supabase
    .from('expenses')
    .insert(insertData)
    .select(
      `
      *,
      category:categories (
        id,
        name
      )
    `
    );

  if (error) {
    throw error;
  }

  // Transform to ExpenseDTO format
  return data.map((expense) => ({
    id: expense.id,
    user_id: expense.user_id,
    category_id: expense.category_id,
    amount: expense.amount.toString(),
    expense_date: expense.expense_date,
    currency: expense.currency,
    created_by_ai: expense.created_by_ai,
    was_ai_suggestion_edited: expense.was_ai_suggestion_edited,
    created_at: expense.created_at,
    updated_at: expense.updated_at,
    category: {
      id: (expense.category as any).id,
      name: (expense.category as any).name,
    },
  }));
}

/**
 * Retrieves a paginated list of expenses for the authenticated user
 * Supports filtering by date range and category, plus flexible sorting
 *
 * @param supabase - Supabase client instance (with user context from auth)
 * @param params - Query parameters for filtering, sorting, and pagination
 * @returns Paginated list of expenses with total count
 */
export async function listExpenses(
  supabase: SupabaseClient,
  params: ExpenseQueryParams
): Promise<ExpenseListDTO> {
  const {
    limit = 50,
    offset = 0,
    from_date,
    to_date,
    category_id,
    sort = 'expense_date.desc',
  } = params;

  // Parse sort parameter into column and direction
  const [sortColumn, sortDirection] = sort.split('.');
  const sortAscending = sortDirection === 'asc';

  // Build main query with pagination and category join
  let query = supabase
    .from('expenses')
    .select(
      `
      *,
      category:categories(id, name)
    `
    )
    .order(sortColumn, { ascending: sortAscending })
    .range(offset, offset + limit - 1);

  // Apply optional filters
  if (from_date) {
    query = query.gte('expense_date', from_date);
  }
  if (to_date) {
    query = query.lte('expense_date', to_date);
  }
  if (category_id) {
    query = query.eq('category_id', category_id);
  }

  // Execute main query
  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  // Build count query with same filters (no pagination)
  let countQuery = supabase.from('expenses').select('*', { count: 'exact', head: true });

  if (from_date) {
    countQuery = countQuery.gte('expense_date', from_date);
  }
  if (to_date) {
    countQuery = countQuery.lte('expense_date', to_date);
  }
  if (category_id) {
    countQuery = countQuery.eq('category_id', category_id);
  }

  // Execute count query
  const { count, error: countError } = await countQuery;

  if (countError) {
    throw new Error(`Failed to count expenses: ${countError.message}`);
  }

  // Transform database results to ExpenseDTO format
  const expenses: ExpenseDTO[] = (data || []).map((expense) => ({
    id: expense.id,
    user_id: expense.user_id,
    category_id: expense.category_id,
    amount: expense.amount.toString(),
    expense_date: expense.expense_date,
    currency: expense.currency,
    created_by_ai: expense.created_by_ai,
    was_ai_suggestion_edited: expense.was_ai_suggestion_edited,
    created_at: expense.created_at,
    updated_at: expense.updated_at,
    category: {
      id: (expense.category as any).id,
      name: (expense.category as any).name,
    } as CategoryDTO,
  }));

  return {
    data: expenses,
    count: expenses.length,
    total: count || 0,
  };
}

/**
 * Retrieves a single expense by ID
 * Includes nested category information
 * Note: Authentication will be added later
 *
 * @param supabase - Supabase client instance
 * @param expenseId - UUID of the expense to retrieve
 * @returns Expense with nested category, or null if not found
 */
export async function getExpenseById(
  supabase: SupabaseClient,
  expenseId: string
): Promise<ExpenseDTO | null> {
  // Query expense with category join
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      category:categories(id, name)
    `)
    .eq('id', expenseId)
    .single();

  // Handle not found
  if (error) {
    if (error.code === 'PGRST116') {  // PostgREST "not found" error code
      return null;
    }
    throw error;
  }

  // Transform to ExpenseDTO format
  return {
    id: data.id,
    user_id: data.user_id,
    category_id: data.category_id,
    amount: data.amount.toString(),
    expense_date: data.expense_date,
    currency: data.currency,
    created_by_ai: data.created_by_ai,
    was_ai_suggestion_edited: data.was_ai_suggestion_edited,
    created_at: data.created_at,
    updated_at: data.updated_at,
    category: {
      id: (data.category as any).id,
      name: (data.category as any).name,
    } as CategoryDTO,
  };
}

/**
 * Creates a single expense manually
 * Includes nested category information in response
 * Note: Authentication will be added later
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the user creating the expense (from auth when implemented)
 * @param expenseData - Validated expense data
 * @returns Created expense with nested category
 */
export async function createExpense(
  supabase: SupabaseClient,
  userId: string,
  expenseData: CreateExpenseCommand
): Promise<ExpenseDTO> {
  // Prepare insert data with user_id and default values
  const insertData = {
    user_id: userId,
    category_id: expenseData.category_id,
    amount: expenseData.amount,
    expense_date: expenseData.expense_date,
    currency: expenseData.currency || 'PLN',
    created_by_ai: false,
    was_ai_suggestion_edited: false,
  };

  // Insert expense and fetch with category information
  const { data, error } = await supabase
    .from('expenses')
    .insert(insertData)
    .select(`
      *,
      category:categories(id, name)
    `)
    .single();

  if (error) {
    throw error;
  }

  // Transform to ExpenseDTO format
  return {
    id: data.id,
    user_id: data.user_id,
    category_id: data.category_id,
    amount: data.amount.toString(),
    expense_date: data.expense_date,
    currency: data.currency,
    created_by_ai: data.created_by_ai,
    was_ai_suggestion_edited: data.was_ai_suggestion_edited,
    created_at: data.created_at,
    updated_at: data.updated_at,
    category: {
      id: (data.category as any).id,
      name: (data.category as any).name,
    } as CategoryDTO,
  };
}

/**
 * Updates an expense by ID with partial data
 * RLS ensures user can only update their own expenses
 *
 * @param supabase - Supabase client instance
 * @param expenseId - UUID of expense to update
 * @param updateData - Partial expense data to update
 * @returns Updated expense with nested category, or null if not found
 */
export async function updateExpense(
  supabase: SupabaseClient,
  expenseId: string,
  updateData: UpdateExpenseCommand
): Promise<ExpenseDTO | null> {
  try {
    // Prepare update data - only include provided fields
    const updatePayload: Record<string, any> = {};
    
    if (updateData.category_id !== undefined) {
      updatePayload.category_id = updateData.category_id;
    }
    if (updateData.amount !== undefined) {
      updatePayload.amount = updateData.amount;
    }
    if (updateData.expense_date !== undefined) {
      updatePayload.expense_date = updateData.expense_date;
    }
    if (updateData.currency !== undefined) {
      updatePayload.currency = updateData.currency;
    }

    // Perform update and fetch updated expense with category information in one query
    const { data: updatedExpense, error } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', expenseId)
      .select(`
        *,
        category:categories(id, name)
      `)
      .single();

    if (error) {
      // Handle not found error (expense doesn't exist or RLS blocked access)
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error updating expense:', error);
      throw error;
    }

    // If no data returned, expense wasn't found or user doesn't have access (RLS)
    if (!updatedExpense) {
      return null;
    }

    // Transform to ExpenseDTO format
    return {
      id: updatedExpense.id,
      user_id: updatedExpense.user_id,
      category_id: updatedExpense.category_id,
      amount: updatedExpense.amount.toString(),
      expense_date: updatedExpense.expense_date,
      currency: updatedExpense.currency,
      created_by_ai: updatedExpense.created_by_ai,
      was_ai_suggestion_edited: updatedExpense.was_ai_suggestion_edited,
      created_at: updatedExpense.created_at,
      updated_at: updatedExpense.updated_at,
      category: {
        id: (updatedExpense.category as any).id,
        name: (updatedExpense.category as any).name,
      },
    };
  } catch (error) {
    console.error('Unexpected error in updateExpense:', error);
    throw error;
  }
}

/**
 * Deletes an expense by ID
 * RLS ensures user can only delete their own expenses
 *
 * @param supabase - Supabase client instance
 * @param expenseId - UUID of expense to delete
 * @returns Object with success status and optional error message
 */
export async function deleteExpense(
  supabase: SupabaseClient,
  expenseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error, count } = await supabase
      .from('expenses')
      .delete({ count: 'exact' })
      .eq('id', expenseId);

    if (error) {
      console.error('Error deleting expense:', error);
      return { success: false, error: error.message };
    }

    // If count is 0, expense wasn't found or user doesn't have access (RLS)
    if (count === 0) {
      return { success: false, error: 'Expense not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in deleteExpense:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}