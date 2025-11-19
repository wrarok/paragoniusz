import type { APIRoute } from 'astro';
import { z } from 'zod';
import type {
  CreateExpenseBatchCommand,
  BatchExpenseResponseDTO,
  APIErrorResponse,
} from '../../../types';
import { validateCategories, createExpensesBatch } from '../../../lib/services/expense.service';
import { DEFAULT_USER_ID } from '../../../db/supabase.client';

export const prerender = false;

// Zod validation schema for individual expense in batch
const batchExpenseItemSchema = z.object({
  category_id: z.string().uuid('Invalid category ID format'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid number with up to 2 decimal places')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Invalid date'),
  currency: z.string().default('PLN'),
  created_by_ai: z.boolean().default(false),
  was_ai_suggestion_edited: z.boolean().default(false),
});

// Zod validation schema for the entire batch request
const createExpenseBatchSchema = z.object({
  expenses: z
    .array(batchExpenseItemSchema)
    .min(1, 'Expenses array cannot be empty')
    .max(50, 'Maximum 50 expenses per batch'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Parse and validate request body
    let body: CreateExpenseBatchCommand;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid request body',
          },
        } as APIErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validation = createExpenseBatchSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid expense data',
            details: validation.error.format(),
          },
        } as APIErrorResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { expenses } = validation.data;

    // Step 2: Validate categories exist
    const uniqueCategoryIds = [...new Set(expenses.map((e) => e.category_id))];
    const categoryValidation = await validateCategories(locals.supabase, uniqueCategoryIds);

    if (!categoryValidation.valid) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_CATEGORY',
            message: "One or more categories don't exist",
            details: {
              invalid_category_ids: categoryValidation.invalidIds,
            },
          },
        } as APIErrorResponse),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Create expenses batch using DEFAULT_USER_ID
    const createdExpenses = await createExpensesBatch(locals.supabase, DEFAULT_USER_ID, expenses);

    // Step 4: Return success response
    const response: BatchExpenseResponseDTO = {
      data: createdExpenses,
      count: createdExpenses.length,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error creating expense batch:', error);

    // Return generic error to client
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      } as APIErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};