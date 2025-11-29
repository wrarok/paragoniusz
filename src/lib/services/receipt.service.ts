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
   * Process receipt image using OpenRouter AI service via Edge Function
   *
   * This method calls the Supabase Edge Function that communicates with OpenRouter.ai
   * to extract structured data from receipt images.
   *
   * Flow:
   * 1. Verify AI consent from user profile
   * 2. Verify file ownership (user_id in path matches authenticated user)
   * 3. Call Edge Function to process receipt with OpenRouter
   * 4. Transform AI response (individual items) to grouped expenses by category
   * 5. Map AI-suggested categories to database category IDs
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
    const startTime = Date.now();

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

    // Step 3: Fetch all categories for mapping AI suggestions
    const { data: categories, error: categoriesError } = await this.supabase
      .from('categories')
      .select('id, name');

    if (categoriesError || !categories || categories.length === 0) {
      throw new Error('Failed to fetch categories');
    }

    // Step 4: Call Edge Function to process receipt
    // Get the current session to pass auth token
    const { data: { session } } = await this.supabase.auth.getSession();
    
    const { data: edgeFunctionData, error: edgeFunctionError } = await this.supabase.functions.invoke(
      'process-receipt',
      {
        body: { file_path: filePath },
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined,
      }
    );

    if (edgeFunctionError) {
      // Map Edge Function errors to our error codes
      if (edgeFunctionError.message?.includes('Rate limit')) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      if (edgeFunctionError.message?.includes('timeout')) {
        throw new Error('PROCESSING_TIMEOUT');
      }
      throw new Error(`AI processing failed: ${edgeFunctionError.message}`);
    }

    if (!edgeFunctionData) {
      throw new Error('No data returned from AI processing');
    }

    // Step 5: Transform OpenRouter response to our DTO format
    // OpenRouter returns: { items: [{name, amount, category}], total, date }
    // We need: { expenses: [{category_id, category_name, amount, items[]}], total_amount, currency, receipt_date }
    
    const aiResponse = edgeFunctionData as {
      items: Array<{ name: string; amount: number; category: string }>;
      total: number;
      date: string;
    };

    // Group items by AI-suggested category
    const groupedByCategory = this.groupItemsByCategory(aiResponse.items);

    // Map AI categories to database categories and build expenses array
    const expenses = await this.mapCategoriesToExpenses(groupedByCategory, categories);

    const processingTime = Date.now() - startTime;

    return {
      expenses,
      total_amount: aiResponse.total.toFixed(2),
      currency: 'PLN',
      receipt_date: aiResponse.date,
      processing_time_ms: processingTime,
    };
  }

  /**
   * Groups receipt items by their AI-suggested category
   * 
   * @param items - Array of items from OpenRouter response
   * @returns Map of category name to items
   * @private
   */
  private groupItemsByCategory(
    items: Array<{ name: string; amount: number; category: string }>
  ): Map<string, Array<{ name: string; amount: number }>> {
    const grouped = new Map<string, Array<{ name: string; amount: number }>>();

    for (const item of items) {
      const categoryName = item.category;
      const existing = grouped.get(categoryName) || [];
      existing.push({ name: item.name, amount: item.amount });
      grouped.set(categoryName, existing);
    }

    return grouped;
  }

  /**
   * Maps AI-suggested categories to database categories and builds expense DTOs
   * 
   * Uses fuzzy matching to find the best database category for each AI suggestion.
   * Falls back to "Inne" (Other) category if no good match is found.
   * 
   * @param groupedItems - Items grouped by AI-suggested category
   * @param dbCategories - Available database categories
   * @returns Array of expense DTOs with category IDs and grouped items
   * @private
   */
  private async mapCategoriesToExpenses(
    groupedItems: Map<string, Array<{ name: string; amount: number }>>,
    dbCategories: Array<{ id: string; name: string }>
  ): Promise<ProcessReceiptResponseDTO['expenses']> {
    const expenses: ProcessReceiptResponseDTO['expenses'] = [];

    for (const [aiCategoryName, items] of groupedItems.entries()) {
      // Find best matching database category
      const matchedCategory = this.findBestCategoryMatch(aiCategoryName, dbCategories);

      // Calculate total amount for this category
      const categoryTotal = items.reduce((sum, item) => sum + item.amount, 0);

      // Format items as strings with amounts
      const formattedItems = items.map(
        (item) => `${item.name} - ${item.amount.toFixed(2)}`
      );

      expenses.push({
        category_id: matchedCategory.id,
        category_name: matchedCategory.name,
        amount: categoryTotal.toFixed(2),
        items: formattedItems,
      });
    }

    return expenses;
  }

  /**
   * Finds the best matching database category for an AI-suggested category name
   * 
   * Uses simple string matching (case-insensitive, partial matches).
   * Falls back to "Inne" (Other) category if no match is found.
   * 
   * @param aiCategoryName - Category name suggested by AI
   * @param dbCategories - Available database categories
   * @returns Best matching database category
   * @private
   */
  private findBestCategoryMatch(
    aiCategoryName: string,
    dbCategories: Array<{ id: string; name: string }>
  ): { id: string; name: string } {
    const normalizedAiName = aiCategoryName.toLowerCase().trim();

    // Try exact match first
    const exactMatch = dbCategories.find(
      (cat) => cat.name.toLowerCase() === normalizedAiName
    );
    if (exactMatch) return exactMatch;

    // Try partial match (AI category contains DB category name or vice versa)
    const partialMatch = dbCategories.find(
      (cat) =>
        normalizedAiName.includes(cat.name.toLowerCase()) ||
        cat.name.toLowerCase().includes(normalizedAiName)
    );
    if (partialMatch) return partialMatch;

    // Fallback to "Inne" (Other) category
    const otherCategory = dbCategories.find(
      (cat) => cat.name.toLowerCase() === 'inne' || cat.name.toLowerCase() === 'other'
    );

    // If no "Inne" category exists, use the first category as ultimate fallback
    return otherCategory || dbCategories[0];
  }
}