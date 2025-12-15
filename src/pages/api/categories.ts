import type { APIRoute } from "astro";
import { getAllCategories } from "../../lib/services/category.service";
import type { APIErrorResponse } from "../../types";

/**
 * GET /api/categories
 * Retrieves all predefined expense categories
 *
 * @returns 200 - CategoryListDTO with all categories
 * @returns 500 - Internal server error if database query fails
 *
 * @todo Add authentication check before production deployment
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Extract Supabase client from context (injected by middleware)
    const supabase = locals.supabase;

    // Fetch categories from service layer
    const categories = await getAllCategories(supabase);

    // Return success response
    return new Response(JSON.stringify(categories), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error for debugging and monitoring
    console.error("Error fetching categories:", error);

    // Return generic error response without exposing internal details
    const errorResponse: APIErrorResponse = {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Wystąpił nieoczekiwany błąd podczas pobierania kategorii",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// Disable prerendering for API routes
export const prerender = false;
