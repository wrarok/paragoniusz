/**
 * Receipt Service (Refactored)
 *
 * Handles receipt-related operations using Chain of Responsibility pattern.
 *
 * Refactored to implement:
 * - Chain of Responsibility pattern for processing pipeline
 * - Separation of concerns (each step is independent)
 * - Improved testability (steps can be tested individually)
 * - Easier extensibility (add/remove steps without affecting others)
 *
 * The processing pipeline consists of 5 steps:
 * 1. ConsentValidationStep - Verify AI consent
 * 2. FileOwnershipValidationStep - Verify file ownership
 * 3. CategoryFetchStep - Fetch categories
 * 4. AIProcessingStep - Call Edge Function
 * 5. CategoryMappingStep - Map categories and build response
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type { UploadReceiptResponseDTO, ProcessReceiptResponseDTO } from "../../types";

import {
  ConsentValidationStep,
  FileOwnershipValidationStep,
  CategoryFetchStep,
  AIProcessingStep,
  CategoryMappingStep,
  type ProcessingStep,
  type ProcessingContext,
} from "../processing/receipt-processing-steps";
import { CategoryMappingService } from "../processing/category-mapping.service";

/**
 * Service for handling receipt-related operations (Refactored)
 *
 * Uses Chain of Responsibility pattern for processing receipts.
 * Each step in the pipeline is isolated, testable, and reusable.
 */
export class ReceiptService {
  private readonly processingPipeline: ProcessingStep[];

  /**
   * Creates a new Receipt service instance
   *
   * Initializes the processing pipeline with all required steps.
   * Steps are executed in order, and each step receives the output
   * of the previous step via ProcessingContext.
   *
   * @param supabase - Supabase client for database and storage operations
   *
   * @example
   * ```typescript
   * const service = new ReceiptService(supabase);
   * const uploadResult = await service.uploadReceipt(file, userId);
   * const processResult = await service.processReceipt(uploadResult.file_path, userId);
   * ```
   */
  constructor(private supabase: SupabaseClient) {
    // Initialize category mapper
    const categoryMapper = new CategoryMappingService();

    // Initialize processing pipeline with all steps
    this.processingPipeline = [
      new ConsentValidationStep(supabase),
      new FileOwnershipValidationStep(),
      new CategoryFetchStep(supabase),
      new AIProcessingStep(supabase),
      new CategoryMappingStep(categoryMapper),
    ];
  }

  /**
   * Uploads a receipt image to Supabase Storage
   *
   * The file is stored in a user-specific directory with a UUID-based filename
   * to prevent path traversal attacks and filename collisions.
   *
   * Storage path format: receipts/{user_id}/{file_id}.{ext}
   *
   * @param file - The image file to upload
   * @param userId - The ID of the user uploading the file
   * @returns Upload metadata including file_id, file_path, and uploaded_at
   * @throws Error if upload to Supabase Storage fails
   *
   * @example
   * ```typescript
   * const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
   * const result = await service.uploadReceipt(file, 'user-123');
   * console.log(result.file_path); // 'receipts/user-123/abc-123.jpg'
   * ```
   */
  async uploadReceipt(file: File, userId: string): Promise<UploadReceiptResponseDTO> {
    // Generate unique file ID using UUID to prevent collisions
    const fileId = crypto.randomUUID();

    // Determine file extension from MIME type
    const extension = this.getFileExtension(file.type);

    // Build storage path: receipts/{user_id}/{file_id}.ext
    // This ensures user isolation and prevents path traversal
    const filePath = `receipts/${userId}/${fileId}${extension}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage.from("receipts").upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false, // Don't overwrite existing files
    });

    // Handle upload errors
    if (error) {
      throw new Error(`Nie udało się przesłać pliku: ${error.message}`);
    }

    // Return response DTO with file metadata
    return {
      file_id: fileId,
      file_path: data.path,
      uploaded_at: new Date().toISOString(),
    };
  }

  /**
   * Process receipt image using AI via processing pipeline
   *
   * Executes the complete Chain of Responsibility pipeline:
   * 1. ConsentValidationStep - Verify AI consent from user profile
   * 2. FileOwnershipValidationStep - Verify file ownership (security)
   * 3. CategoryFetchStep - Fetch categories from database
   * 4. AIProcessingStep - Call Edge Function for AI processing
   * 5. CategoryMappingStep - Map AI categories to database & build response
   *
   * Each step receives context, performs its operation, and returns updated context.
   * If any step throws an error, the pipeline is aborted.
   *
   * @param filePath - Path to receipt file in storage (receipts/{user_id}/{uuid}.ext)
   * @param userId - Authenticated user ID
   * @returns Processed receipt data with expenses grouped by category
   * @throws Error with specific error codes for different failure scenarios:
   *   - 'AI_CONSENT_REQUIRED' - User hasn't given AI consent
   *   - 'FORBIDDEN' - File doesn't belong to user
   *   - 'RATE_LIMIT_EXCEEDED' - AI processing rate limit hit
   *   - 'PROCESSING_TIMEOUT' - AI processing timed out
   *
   * @example
   * ```typescript
   * try {
   *   const result = await service.processReceipt('receipts/user-123/abc.jpg', 'user-123');
   *   console.log(result.expenses); // Grouped expenses by category
   *   console.log(result.total_amount); // Total receipt amount
   *   console.log(result.processing_time_ms); // Time taken to process
   * } catch (error) {
   *   if (error.message === 'AI_CONSENT_REQUIRED') {
   *     // Handle consent error
   *   }
   * }
   * ```
   */
  async processReceipt(filePath: string, userId: string): Promise<ProcessReceiptResponseDTO> {
    // Initialize context with input data
    let context: ProcessingContext = {
      filePath,
      userId,
      startTime: Date.now(),
    };

    // Execute pipeline - each step receives and returns context
    for (const step of this.processingPipeline) {
      context = await step.execute(context);
    }

    // Return result from final step
    if (!context.result) {
      throw new Error("Pipeline failed to produce result");
    }

    return context.result;
  }

  /**
   * Maps MIME type to file extension
   *
   * Supports common image formats used for receipts:
   * - JPEG (.jpg)
   * - PNG (.png)
   * - HEIC (.heic) - iPhone photos
   *
   * @param mimeType - The MIME type of the file
   * @returns The corresponding file extension (with dot)
   * @private
   */
  private getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/heic": ".heic",
    };

    return mimeToExt[mimeType] || ".jpg";
  }
}
