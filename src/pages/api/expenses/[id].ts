import type { APIRoute } from "astro";
import {
  getExpenseById,
  deleteExpense,
  updateExpense,
  validateCategories,
} from "../../../lib/services/expense.service.refactored";
import { ExpenseIdSchema, UpdateExpenseSchema } from "../../../lib/validation/expense.validation";

/**
 * GET /api/expenses/{id}
 * Retrieves a single expense by ID
 * Note: Authentication will be implemented later
 */
export const GET: APIRoute = async (context) => {
  try {
    // Get Supabase client from middleware
    const supabase = context.locals.supabase;

    // Validate expense ID format
    const validationResult = ExpenseIdSchema.safeParse({
      id: context.params.id,
    });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: "Invalid expense ID format. Must be a valid UUID.",
            details: {
              field: "id",
              provided: context.params.id,
            },
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { id } = validationResult.data;

    // Fetch expense from database
    const expense = await getExpenseById(supabase, id);

    // Handle not found
    if (!expense) {
      return new Response(
        JSON.stringify({
          error: {
            code: "EXPENSE_NOT_FOUND",
            message: "Expense not found.",
          },
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return success response
    return new Response(JSON.stringify(expense), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error for debugging
    console.error("Error in GET /api/expenses/:id:", error);

    // Return generic error response
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again later.",
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * DELETE /api/expenses/{id}
 * Deletes a single expense by ID
 * Note: Authentication will be implemented later
 */
export const DELETE: APIRoute = async (context) => {
  try {
    // Get Supabase client from middleware
    const supabase = context.locals.supabase;

    // Validate expense ID format
    const validationResult = ExpenseIdSchema.safeParse({
      id: context.params.id,
    });

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: "Invalid expense ID format. Must be a valid UUID.",
            details: {
              field: "id",
              provided: context.params.id,
            },
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { id } = validationResult.data;

    // Delete expense from database
    const result = await deleteExpense(supabase, id);

    // Handle not found
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "EXPENSE_NOT_FOUND",
            message: "Expense not found.",
          },
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return success with no content
    return new Response(null, { status: 204 });
  } catch (error) {
    // Log error for debugging
    console.error("Error in DELETE /api/expenses/:id:", error);

    // Return generic error response
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again later.",
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * PATCH /api/expenses/{id}
 * Updates an existing expense with partial data
 * Note: Authentication will be implemented later
 */
export const PATCH: APIRoute = async (context) => {
  try {
    // Get Supabase client from middleware
    const supabase = context.locals.supabase;

    // 1. Validate path parameter (expense ID format)
    const paramsValidation = ExpenseIdSchema.safeParse({
      id: context.params.id,
    });

    if (!paramsValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: "Invalid expense ID format. Must be a valid UUID.",
            details: {
              field: "id",
              provided: context.params.id,
            },
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { id } = paramsValidation.data;

    // 2. Parse and validate request body
    let requestBody;
    try {
      requestBody = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: "Invalid JSON in request body.",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const bodyValidation = UpdateExpenseSchema.safeParse(requestBody);

    if (!bodyValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_INPUT",
            message: "Invalid request payload.",
            details: bodyValidation.error.flatten(),
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const updateData = bodyValidation.data;

    // 3. Validate category exists if category_id is provided
    if (updateData.category_id) {
      const categoryValidation = await validateCategories(supabase, [updateData.category_id]);

      if (!categoryValidation.valid) {
        return new Response(
          JSON.stringify({
            error: {
              code: "INVALID_CATEGORY",
              message: "The specified category does not exist.",
              details: {
                category_id: updateData.category_id,
              },
            },
          }),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // 4. Update expense (RLS ensures ownership)
    const updatedExpense = await updateExpense(supabase, id, updateData);

    // Handle not found
    if (!updatedExpense) {
      return new Response(
        JSON.stringify({
          error: {
            code: "EXPENSE_NOT_FOUND",
            message: "Expense not found.",
          },
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Return updated expense
    return new Response(JSON.stringify(updatedExpense), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error for debugging
    console.error("Error in PATCH /api/expenses/:id:", error);

    // Return generic error response
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again later.",
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Disable prerendering for this API route
export const prerender = false;
