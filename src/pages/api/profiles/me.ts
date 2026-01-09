import type { APIRoute } from "astro";
import { z } from "zod";
import { ProfileService } from "../../../lib/services/profile.service";
import type { ProfileDTO, APIErrorResponse, UpdateProfileCommand } from "../../../types";

/**
 * Zod schema for validating profile update requests
 * Ensures ai_consent_given is a boolean and no extra fields are present
 */
const UpdateProfileSchema = z
  .object({
    ai_consent_given: z.boolean({
      required_error: "ai_consent_given is required",
      invalid_type_error: "ai_consent_given must be a boolean",
    }),
  })
  .strict();

/**
 * GET /api/profiles/me
 *
 * Retrieves the user's profile information.
 *
 * TODO: Add authentication once all endpoints are implemented
 *
 * For testing without authentication:
 * - Without query param: Uses DEFAULT_USER_ID (a33573a0-3562-495e-b3c4-d898d0b54241)
 * - With ?user_id=xxx: Uses the provided user_id
 *
 * Success Response (200):
 * {
 *   "id": "uuid",
 *   "ai_consent_given": false,
 *   "created_at": "2024-01-01T00:00:00Z",
 *   "updated_at": "2024-01-01T00:00:00Z"
 * }
 *
 * Error Responses:
 * - 404 Not Found: Profile not found
 * - 500 Internal Server Error: Unexpected server error
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "User must be authenticated",
          },
        } satisfies APIErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const userId = locals.user.id;

    // Retrieve profile using service layer
    const runtimeEnv = locals.runtime?.env as Record<string, string | undefined> | undefined;
    const profileService = new ProfileService(locals.supabase, runtimeEnv);
    const profile = await profileService.getProfile(userId);

    // Handle profile not found
    if (!profile) {
      return new Response(
        JSON.stringify({
          error: {
            code: "PROFILE_NOT_FOUND",
            message: "Profile not found for the specified user",
          },
        } satisfies APIErrorResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return successful response
    return new Response(JSON.stringify(profile satisfies ProfileDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle unexpected errors
    console.error("Error fetching profile:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      } satisfies APIErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * PATCH /api/profiles/me
 *
 * Updates the user's profile information (currently only ai_consent_given).
 *
 * TODO: Add authentication once all endpoints are implemented
 *
 * For testing without authentication:
 * - Without query param: Uses DEFAULT_USER_ID (a33573a0-3562-495e-b3c4-d898d0b54241)
 * - With ?user_id=xxx: Uses the provided user_id
 *
 * Request Body:
 * {
 *   "ai_consent_given": true
 * }
 *
 * Success Response (200):
 * {
 *   "id": "uuid",
 *   "ai_consent_given": true,
 *   "created_at": "2024-01-01T00:00:00Z",
 *   "updated_at": "2024-01-01T12:00:00Z"
 * }
 *
 * Error Responses:
 * - 400 Bad Request: Invalid request payload or validation error
 * - 404 Not Found: Profile not found
 * - 500 Internal Server Error: Unexpected server error
 */
export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "User must be authenticated",
          },
        } satisfies APIErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const userId = locals.user.id;
    const runtimeEnv = locals.runtime?.env as Record<string, string | undefined> | undefined;

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_JSON",
            message: "Invalid JSON in request body",
          },
        } satisfies APIErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate request body with Zod schema
    const validationResult = UpdateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request payload",
            details: {
              errors: validationResult.error.errors,
            },
          },
        } satisfies APIErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const updateData: UpdateProfileCommand = validationResult.data;

    // Update profile using service layer
    const profileService = new ProfileService(locals.supabase, runtimeEnv);
    const updatedProfile = await profileService.updateProfile(userId, updateData);

    // Return successful response
    return new Response(JSON.stringify(updatedProfile satisfies ProfileDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle profile not found error
    if (error instanceof Error && error.message === "Profile not found") {
      return new Response(
        JSON.stringify({
          error: {
            code: "PROFILE_NOT_FOUND",
            message: "Profile not found for the specified user",
          },
        } satisfies APIErrorResponse),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle unexpected errors
    console.error("Error updating profile:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      } satisfies APIErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * DELETE /api/profiles/me
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * This operation is irreversible and includes:
 * - User authentication record
 * - User profile
 * - All expenses (via CASCADE)
 *
 * TODO: Add authentication once all endpoints are implemented
 *
 * For testing without authentication:
 * - Without query param: Uses DEFAULT_USER_ID (a33573a0-3562-495e-b3c4-d898d0b54241)
 * - With ?user_id=xxx: Uses the provided user_id
 *
 * Success Response (204 No Content):
 * - Empty response body
 *
 * Error Responses:
 * - 401 Unauthorized: Authentication required or invalid token
 * - 500 Internal Server Error: Failed to delete user account
 */
export const DELETE: APIRoute = async ({ locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "User must be authenticated",
          },
        } satisfies APIErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const userId = locals.user.id;
    const runtimeEnv = locals.runtime?.env as Record<string, string | undefined> | undefined;

    // Delete the user account using service layer
    const profileService = new ProfileService(locals.supabase, runtimeEnv);
    await profileService.deleteProfile(userId);

    // Sign out the user to clear session cookies
    await locals.supabase.auth.signOut();

    // Return 204 No Content on successful deletion
    return new Response(null, { status: 204 });
  } catch (error) {
    // Handle deletion errors
    console.error("Failed to delete user account:", error);

    // Check if error is due to missing service role key
    if (error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(
        JSON.stringify({
          error: {
            code: "CONFIGURATION_ERROR",
            message: "Usługa usuwania konta jest tymczasowo niedostępna. Skontaktuj się z administratorem.",
            details: {
              technical: "SUPABASE_SERVICE_ROLE_KEY nie jest skonfigurowany",
            },
          },
        } satisfies APIErrorResponse),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Nie udało się usunąć konta użytkownika",
        },
      } satisfies APIErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Disable prerendering for this API route
// API routes must be server-rendered to handle dynamic requests
export const prerender = false;
