import type { APIRoute } from 'astro';
import { ExpenseQuerySchema, CreateExpenseSchema } from '../../../lib/validation/expense.validation';
import { listExpenses, createExpense, validateCategories } from '../../../lib/services/expense.service';
import type { APIErrorResponse, ExpenseQueryParams } from '../../../types';

export const prerender = false;

/**
 * GET /api/expenses
 *
 * Retrieves a paginated list of expenses.
 * Supports filtering by date range and category, plus flexible sorting.
 *
 * NOTE: Authentication not yet implemented - will be added later
 *
 * Query Parameters:
 * - limit (optional): Number of records per page (1-100, default: 50)
 * - offset (optional): Pagination offset (default: 0)
 * - from_date (optional): Filter from date (YYYY-MM-DD)
 * - to_date (optional): Filter to date (YYYY-MM-DD)
 * - category_id (optional): Filter by category UUID
 * - sort (optional): Sort order (expense_date.asc|desc, amount.asc|desc, default: expense_date.desc)
 *
 * Returns:
 * - 200: ExpenseListDTO with data, count, and total
 * - 400: Invalid query parameters
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Get Supabase client from middleware
    const supabase = locals.supabase;

    // Extract query parameters from URL
    const url = new URL(request.url);
    const rawParams = {
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
      from_date: url.searchParams.get('from_date'),
      to_date: url.searchParams.get('to_date'),
      category_id: url.searchParams.get('category_id'),
      sort: url.searchParams.get('sort'),
    };

    // Validate query parameters with Zod schema
    const validationResult = ExpenseQuerySchema.safeParse(rawParams);

    if (!validationResult.success) {
      // Log validation errors for debugging
      console.error('Validation failed:', JSON.stringify(validationResult.error.format(), null, 2));
      console.error('Raw params:', rawParams);
      
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid query parameters',
          details: validationResult.error.flatten().fieldErrors,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validatedParams = validationResult.data as ExpenseQueryParams;

    // Fetch expenses using service layer
    const result = await listExpenses(supabase, validatedParams);

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('Error in GET /api/expenses:', error);

    const errorResponse: APIErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while fetching expenses',
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * POST /api/expenses
 *
 * Creates a single expense manually.
 * Validates all input fields, ensures category exists, and returns the created expense.
 *
 * NOTE: Authentication not yet implemented - will be added later
 * Currently uses placeholder user_id
 *
 * Request Body:
 * - category_id (required): UUID of existing category
 * - amount (required): Positive number with max 2 decimal places, max 99,999,999.99
 * - expense_date (required): Date in YYYY-MM-DD format, cannot be in future
 * - currency (optional): 3-letter code, defaults to 'PLN', only PLN supported in MVP
 *
 * Returns:
 * - 201: Created expense with nested category
 * - 400: Invalid request body or validation error
 * - 422: Category not found
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Get Supabase client from middleware
    const supabase = locals.supabase;

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate request body with Zod schema
    const validationResult = CreateExpenseSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validatedData = validationResult.data;

    // Validate category exists
    const categoryValidation = await validateCategories(supabase, [validatedData.category_id]);

    if (!categoryValidation.valid) {
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'The specified category does not exist',
          details: {
            category_id: validatedData.category_id,
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log warning if date is more than 1 year old (non-blocking)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (new Date(validatedData.expense_date) < oneYearAgo) {
      console.warn(`Expense date is more than 1 year old: ${validatedData.expense_date}`);
    }

    // TODO: Get user_id from authenticated user when auth is implemented
    // For now, use a placeholder
    const userId = 'a33573a0-3562-495e-b3c4-d898d0b54241'; // Temporary placeholder

    // Create expense using service layer
    const expense = await createExpense(supabase, userId, validatedData);

    // Return success response with 201 Created
    return new Response(JSON.stringify(expense), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error in POST /api/expenses:', error);

    const errorResponse: APIErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
        details: {
          timestamp: new Date().toISOString(),
        },
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};