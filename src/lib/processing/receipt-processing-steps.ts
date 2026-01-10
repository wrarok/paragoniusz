/**
 * Receipt Processing Steps - Chain of Responsibility Pattern
 *
 * Each step in the receipt processing pipeline is isolated and testable.
 * Steps can be added, removed, or reordered without affecting other steps.
 *
 * The pipeline processes receipts through these stages:
 * 1. ConsentValidationStep - Verify user has given AI consent
 * 2. FileOwnershipValidationStep - Verify user owns the file
 * 3. CategoryFetchStep - Fetch categories from database
 * 4. AIProcessingStep - Call Edge Function for AI processing
 * 5. CategoryMappingStep - Map AI categories to database categories
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type { ProcessReceiptResponseDTO } from "../../types";

/**
 * Processing context passed through pipeline
 *
 * Each step receives context, performs its work, and returns updated context.
 * Steps can add data to context for use by subsequent steps.
 */
export interface ProcessingContext {
  // Input
  filePath: string;
  userId: string;
  startTime: number;

  // Intermediate data (populated by steps)
  aiConsentGiven?: boolean;
  categories?: { id: string; name: string }[];
  edgeFunctionData?: {
    items: { name: string; amount: number; category: string }[];
    total: number;
    date: string;
  };

  // Output (populated by final step)
  result?: ProcessReceiptResponseDTO;
}

/**
 * Base interface for processing steps
 *
 * Each step implements execute() method that:
 * 1. Receives context
 * 2. Performs its specific operation
 * 3. Returns updated context
 *
 * Steps can throw errors to abort the pipeline.
 */
export interface ProcessingStep {
  execute(context: ProcessingContext): Promise<ProcessingContext>;
}

/**
 * Step 1: Verify AI consent
 *
 * Checks if user has given consent for AI processing in their profile.
 * Required before any AI operations can be performed.
 *
 * @throws Error with 'AI_CONSENT_REQUIRED' if consent not given
 * @throws Error if profile fetch fails
 */
export class ConsentValidationStep implements ProcessingStep {
  constructor(private supabase: SupabaseClient) {}

  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    const { data: profile, error } = await this.supabase
      .from("profiles")
      .select("ai_consent_given")
      .eq("id", context.userId)
      .single();

    if (error) {
      throw new Error("Nie udało się pobrać profilu użytkownika");
    }

    if (!profile.ai_consent_given) {
      throw new Error("AI_CONSENT_REQUIRED");
    }

    return {
      ...context,
      aiConsentGiven: true,
    };
  }
}

/**
 * Step 2: Verify file ownership
 *
 * Ensures the file path contains the authenticated user's ID.
 * Prevents unauthorized access to other users' files.
 *
 * File path format: receipts/{user_id}/{uuid}.ext
 *
 * @throws Error with 'FORBIDDEN' if user doesn't own the file
 */
export class FileOwnershipValidationStep implements ProcessingStep {
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    // Extract user_id from file path (receipts/{user_id}/{uuid}.ext)
    const fileUserId = context.filePath.split("/")[1];

    if (fileUserId !== context.userId) {
      throw new Error("FORBIDDEN");
    }

    return context;
  }
}

/**
 * Step 3: Fetch categories for mapping
 *
 * Retrieves all available categories from database.
 * These are used to map AI-suggested categories to database category IDs.
 *
 * @throws Error if categories fetch fails or no categories exist
 */
export class CategoryFetchStep implements ProcessingStep {
  constructor(private supabase: SupabaseClient) {}

  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    const { data: categories, error } = await this.supabase.from("categories").select("id, name");

    if (error || !categories || categories.length === 0) {
      throw new Error("Nie udało się pobrać kategorii");
    }

    return {
      ...context,
      categories,
    };
  }
}

/**
 * Step 4: Call Edge Function for AI processing
 *
 * Invokes Supabase Edge Function that communicates with OpenRouter.ai
 * to extract structured data from receipt images.
 *
 * The Edge Function returns:
 * - items: Array of {name, amount, category}
 * - total: Total receipt amount
 * - date: Receipt date
 *
 * @throws Error with 'RATE_LIMIT_EXCEEDED' if rate limit hit
 * @throws Error with 'PROCESSING_TIMEOUT' if processing times out
 * @throws Error if Edge Function fails
 */
export class AIProcessingStep implements ProcessingStep {
  constructor(private supabase: SupabaseClient) {}

  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    // Get current session for auth token
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    // Call Edge Function
    const { data: edgeFunctionData, error } = await this.supabase.functions.invoke("process-receipt", {
      body: { file_path: context.filePath },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    // Handle errors with specific error codes
    if (error) {
      // Log detailed error information for debugging
      console.error("[AIProcessingStep] Edge Function error:", {
        message: error.message,
        status: error.context?.status,
        statusText: error.context?.statusText,
      });

      if (error.message?.includes("Rate limit")) {
        throw new Error("RATE_LIMIT_EXCEEDED");
      }
      if (error.message?.includes("timeout")) {
        throw new Error("PROCESSING_TIMEOUT");
      }

      // Try to read error details from the response body
      let errorDetails = null;
      try {
        // The error.context is the Response object
        if (error.context && typeof error.context.json === 'function') {
          errorDetails = await error.context.json();
          console.error("[AIProcessingStep] Edge Function error details:", errorDetails);
        }
      } catch (parseError) {
        console.error("[AIProcessingStep] Failed to parse error response:", parseError);
      }

      // Build error message with details if available
      if (errorDetails) {
        const detailMessage = errorDetails.message || errorDetails.error || JSON.stringify(errorDetails);
        throw new Error(`Przetwarzanie AI nie powiodło się: ${detailMessage}`);
      }

      throw new Error(`Przetwarzanie AI nie powiodło się: ${error.message}`);
    }

    if (!edgeFunctionData) {
      throw new Error("Brak danych zwróconych z przetwarzania AI");
    }

    return {
      ...context,
      edgeFunctionData: edgeFunctionData as {
        items: { name: string; amount: number; category: string }[];
        total: number;
        date: string;
      },
    };
  }
}

/**
 * Step 5: Map categories and transform response
 *
 * Final step that:
 * 1. Groups items by AI-suggested category
 * 2. Maps AI categories to database category IDs
 * 3. Formats items with amounts
 * 4. Builds final response DTO
 *
 * Uses CategoryMappingService for the actual mapping logic.
 *
 * @throws Error if required data is missing in context
 */
export class CategoryMappingStep implements ProcessingStep {
  constructor(
    private categoryMapper: {
      mapExpensesWithCategories(
        items: { name: string; amount: number; category: string }[],
        dbCategories: { id: string; name: string }[]
      ): Promise<ProcessReceiptResponseDTO["expenses"]>;
    }
  ) {}

  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    if (!context.edgeFunctionData || !context.categories) {
      throw new Error("Missing data for category mapping");
    }

    // Delegate to CategoryMappingService
    const expenses = await this.categoryMapper.mapExpensesWithCategories(
      context.edgeFunctionData.items,
      context.categories
    );

    return {
      ...context,
      result: {
        expenses,
        total_amount: context.edgeFunctionData.total.toFixed(2),
        currency: "PLN",
        receipt_date: context.edgeFunctionData.date,
        processing_time_ms: Date.now() - context.startTime,
      },
    };
  }
}
