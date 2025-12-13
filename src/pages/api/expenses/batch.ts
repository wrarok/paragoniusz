import type { APIRoute } from 'astro';
import { z } from 'zod';
import type {
  CreateExpenseBatchCommand,
  BatchExpenseResponseDTO,
  APIErrorResponse,
} from '../../../types';
import { validateCategories, createExpensesBatch } from '../../../lib/services/expense.service';

export const prerender = false;

// Zod validation schema for individual expense in batch
const batchExpenseItemSchema = z.object({
  category_id: z.string().uuid('Nieprawidłowy format identyfikatora kategorii'),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Kwota musi być liczbą z maksymalnie 2 miejscami po przecinku')
    .refine((val) => parseFloat(val) > 0, 'Kwota musi być większa od 0'),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi być w formacie RRRR-MM-DD')
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Nieprawidłowa data'),
  currency: z.string().default('PLN'),
  created_by_ai: z.boolean().default(false),
  was_ai_suggestion_edited: z.boolean().default(false),
});

// Zod validation schema for the entire batch request
const createExpenseBatchSchema = z.object({
  expenses: z
    .array(batchExpenseItemSchema)
    .min(1, 'Tablica wydatków nie może być pusta')
    .max(50, 'Maksymalnie 50 wydatków w jednej partii'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Użytkownik musi być zalogowany aby utworzyć wydatki',
          },
        } as APIErrorResponse),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Step 1: Parse and validate request body
    let body: CreateExpenseBatchCommand;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: 'INVALID_JSON',
            message: 'Nieprawidłowe dane żądania',
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
            message: 'Nieprawidłowe dane wydatku',
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
            message: 'Jedna lub więcej kategorii nie istnieje',
            details: {
              invalid_category_ids: categoryValidation.invalidIds,
            },
          },
        } as APIErrorResponse),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Create expenses batch using authenticated user ID
    const createdExpenses = await createExpensesBatch(locals.supabase, locals.user.id, expenses);

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
          message: 'Wystąpił nieoczekiwany błąd',
        },
      } as APIErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};