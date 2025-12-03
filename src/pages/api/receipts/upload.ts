import type { APIRoute } from 'astro';
import { uploadReceiptSchema, MAX_FILE_SIZE } from '../../../lib/validation/receipt.validation';
import { ReceiptService } from '../../../lib/services/receipt.service';
import type { APIErrorResponse, UploadReceiptResponseDTO } from '../../../types';

export const prerender = false;

/**
 * POST /api/receipts/upload
 * 
 * Uploads a receipt image to temporary storage in Supabase Storage.
 * This is the first step in the AI-powered receipt processing workflow.
 * 
 * Request:
 * - Content-Type: multipart/form-data
 * - Body: file field containing image (JPEG, PNG, or HEIC)
 * - Max file size: 10MB
 * 
 * Response (201 Created):
 * {
 *   "file_id": "uuid",
 *   "file_path": "receipts/user_id/uuid.jpg",
 *   "uploaded_at": "2024-01-15T10:30:00.000Z"
 * }
 * 
 * Error Responses:
 * - 400: No file provided, invalid file type, or empty file
 * - 413: File size exceeds 10MB
 * - 500: Internal server error during upload
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'User must be authenticated',
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = locals.user.id;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    // Validate file presence - early return for missing file
    if (!file || !(file instanceof File)) {
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No file provided in request',
          details: { field: 'file' },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file size early (before full validation) - return 413 for oversized files
    if (file.size > MAX_FILE_SIZE) {
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `File size must not exceed ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          details: {
            max_size_mb: MAX_FILE_SIZE / (1024 * 1024),
            provided_size_mb: Number((file.size / (1024 * 1024)).toFixed(2)),
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file with Zod schema (checks file type, empty file, etc.)
    const validation = uploadReceiptSchema.safeParse({ file });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      const errorResponse: APIErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError.message,
          details: {
            field: 'file',
            provided_type: file.type,
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upload file using service
    const receiptService = new ReceiptService(locals.supabase);
    const result: UploadReceiptResponseDTO = await receiptService.uploadReceipt(file, userId);

    // Return success response with 201 Created status
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error uploading receipt:', error);

    // Return generic error response
    const errorResponse: APIErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upload file to storage',
        details: {
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};