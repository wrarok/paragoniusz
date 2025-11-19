import type { SupabaseClient } from '../../db/supabase.client';
import type { UploadReceiptResponseDTO, ProcessReceiptResponseDTO } from '../../types';

/**
 * Service for handling receipt-related operations
 */
export class ReceiptService {
  constructor(private supabase: SupabaseClient) {}

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
    const { data, error } = await this.supabase.storage
      .from('receipts')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      });

    // Handle upload errors
    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Return response DTO with file metadata
    return {
      file_id: fileId,
      file_path: data.path,
      uploaded_at: new Date().toISOString(),
    };
  }

  /**
   * Maps MIME type to file extension
   * 
   * @param mimeType - The MIME type of the file
   * @returns The corresponding file extension (with dot)
   * @private
   */
  private getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/heic': '.heic',
    };

    return mimeToExt[mimeType] || '.jpg';
  }

  /**
   * Process receipt image using mock AI service
   *
   * This method simulates AI processing of a receipt image. In production,
   * this would call a Supabase Edge Function that communicates with OpenRouter.ai.
   *
   * Flow:
   * 1. Verify AI consent from user profile
   * 2. Verify file ownership (user_id in path matches authenticated user)
   * 3. Check file exists in storage
   * 4. Simulate AI processing with mock data
   * 5. Delete receipt file after processing (per PRD 3.4)
   *
   * @param filePath - Path to receipt file in storage (receipts/{user_id}/{uuid}.ext)
   * @param userId - Authenticated user ID
   * @returns Processed receipt data with expenses grouped by category
   * @throws Error with specific error codes for different failure scenarios
   */
  async processReceipt(
    filePath: string,
    userId: string
  ): Promise<ProcessReceiptResponseDTO> {
    // Step 1: Verify AI consent
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('ai_consent_given')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }

    if (!profile.ai_consent_given) {
      throw new Error('AI_CONSENT_REQUIRED');
    }

    // Step 2: Verify file ownership
    // Extract user_id from file path (receipts/{user_id}/{uuid}.ext)
    const fileUserId = filePath.split('/')[1];
    if (fileUserId !== userId) {
      throw new Error('FORBIDDEN');
    }

    // Step 3: Check file exists in storage
    // Use exists() method which is more reliable than list()
    const { data: fileExists, error: storageError } = await this.supabase.storage
      .from('receipts')
      .download(filePath);

    if (storageError || !fileExists) {
      throw new Error('FILE_NOT_FOUND');
    }

    // Step 4: Simulate AI processing with mock data
    // In production, this would call the Edge Function
    const startTime = Date.now();

    // Fetch categories for mock response
    const { data: categories, error: categoriesError } = await this.supabase
      .from('categories')
      .select('id, name')
      .limit(3);

    if (categoriesError || !categories || categories.length === 0) {
      throw new Error('Failed to fetch categories');
    }

    // Simulate processing delay (1-2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    const processingTime = Date.now() - startTime;

    // Generate mock response with realistic data
    const mockResponse: ProcessReceiptResponseDTO = {
      expenses: [
        {
          category_id: categories[0].id,
          category_name: categories[0].name,
          amount: '35.50',
          items: [
            'Milk 2L - 5.50',
            'Bread - 4.00',
            'Eggs 10pcs - 12.00',
            'Cheese 200g - 14.00',
          ],
        },
        {
          category_id: categories[1]?.id || categories[0].id,
          category_name: categories[1]?.name || categories[0].name,
          amount: '15.20',
          items: ['Dish soap - 8.50', 'Paper towels - 6.70'],
        },
      ],
      total_amount: '50.70',
      currency: 'PLN',
      receipt_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      processing_time_ms: processingTime,
    };

    // Step 5: Delete receipt file after successful processing
    // This is non-blocking - we log errors but don't fail the request
    try {
      await this.supabase.storage.from('receipts').remove([filePath]);
    } catch (deleteError) {
      console.warn('Failed to delete receipt file:', deleteError);
    }

    return mockResponse;
  }
}