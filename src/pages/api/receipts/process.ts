import type { APIRoute } from "astro";
import { processReceiptSchema } from "../../../lib/validation/receipt.validation";
import { ReceiptService } from "../../../lib/services/receipt.service.refactored";
import type { APIErrorResponse } from "../../../types";
import { isFeatureEnabled } from "../../../features/feature-flags";

export const prerender = false;

/**
 * POST /api/receipts/process
 *
 * Processes an uploaded receipt image using AI to extract expense data.
 *
 * Request body:
 * {
 *   "file_path": "receipts/{user_id}/{uuid}.{ext}"
 * }
 *
 * Success response (200):
 * {
 *   "expenses": [...],
 *   "total_amount": "50.70",
 *   "currency": "PLN",
 *   "receipt_date": "2024-01-15",
 *   "processing_time_ms": 3500
 * }
 *
 * Error responses:
 * - 400: Invalid file path or file not found
 * - 403: AI consent not given or file access forbidden
 * - 408: Processing timeout (>20 seconds)
 * - 422: Unable to extract data from receipt
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check if AI receipt processing feature is enabled
    if (!isFeatureEnabled("AI_RECEIPT_PROCESSING")) {
      return new Response(
        JSON.stringify({
          error: {
            code: "FEATURE_DISABLED",
            message: "AI receipt processing is currently disabled",
          },
        } as APIErrorResponse),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user is authenticated
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Użytkownik musi być uwierzytelniony",
          },
        } as APIErrorResponse),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = locals.user.id;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_REQUEST",
            message: "Nieprawidłowy JSON w treści żądania",
          },
        } as APIErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate request body
    const validation = processReceiptSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_FILE_PATH",
            message: validation.error.errors[0].message,
            details: { file_path: body.file_path },
          },
        } as APIErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process receipt using service
    const receiptService = new ReceiptService(locals.supabase);

    try {
      const result = await receiptService.processReceipt(validation.data.file_path, userId);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle specific service errors with appropriate status codes
      if (error instanceof Error) {
        switch (error.message) {
          case "AI_CONSENT_REQUIRED":
            return new Response(
              JSON.stringify({
                error: {
                  code: "AI_CONSENT_REQUIRED",
                  message: "Nie udzielono zgody na przetwarzanie AI. Włącz funkcje AI w ustawieniach.",
                },
              } as APIErrorResponse),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );

          case "FORBIDDEN":
            return new Response(
              JSON.stringify({
                error: {
                  code: "FORBIDDEN",
                  message: "Nie masz uprawnień do przetwarzania tego pliku",
                },
              } as APIErrorResponse),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );

          case "FILE_NOT_FOUND":
            return new Response(
              JSON.stringify({
                error: {
                  code: "FILE_NOT_FOUND",
                  message: "Plik paragonu nie został znaleziony w magazynie",
                  details: { file_path: validation.data.file_path },
                },
              } as APIErrorResponse),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );

          case "PROCESSING_TIMEOUT":
            return new Response(
              JSON.stringify({
                error: {
                  code: "PROCESSING_TIMEOUT",
                  message: "Przetwarzanie AI przekroczyło limit 20 sekund. Spróbuj ponownie z wyraźniejszym obrazem.",
                },
              } as APIErrorResponse),
              { status: 408, headers: { "Content-Type": "application/json" } }
            );

          case "EXTRACTION_FAILED":
            return new Response(
              JSON.stringify({
                error: {
                  code: "EXTRACTION_FAILED",
                  message:
                    "Nie udało się wyodrębnić danych o wydatkach z paragonu. Upewnij się, że obraz jest wyraźny i zawiera prawidłowy paragon.",
                },
              } as APIErrorResponse),
              { status: 422, headers: { "Content-Type": "application/json" } }
            );

          case "AI_SERVICE_ERROR":
            console.error("AI service error:", error);
            return new Response(
              JSON.stringify({
                error: {
                  code: "AI_SERVICE_ERROR",
                  message: "Wystąpił błąd podczas przetwarzania paragonu. Spróbuj ponownie później.",
                  details: { service: "mock_ai" },
                },
              } as APIErrorResponse),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }
      }

      // Generic error handler for unexpected errors
      console.error("Unexpected error processing receipt:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.",
          },
        } as APIErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    // Fatal error handler (should rarely be reached)
    console.error("Fatal error in receipt processing endpoint:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.",
        },
      } as APIErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
