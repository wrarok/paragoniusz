import type {
  ProfileDTO,
  UploadReceiptResponseDTO,
  ProcessReceiptResponseDTO,
  CreateExpenseBatchCommand,
  BatchExpenseResponseDTO,
  APIErrorResponse,
} from "@/types";

/**
 * AI processing timeout in milliseconds (20 seconds)
 */
const PROCESSING_TIMEOUT_MS = 20000;

/**
 * Check if user granted AI consent
 *
 * @returns User profile with AI consent information
 * @throws {APIErrorResponse} On API error
 */
export async function checkAIConsent(): Promise<ProfileDTO> {
  const response = await fetch("/api/profiles/me");

  if (!response.ok) {
    const error: APIErrorResponse = await response.json();
    throw error;
  }

  return response.json();
}

/**
 * Grant AI consent
 *
 * @returns Updated user profile
 * @throws {APIErrorResponse} On API error
 */
export async function grantAIConsent(): Promise<ProfileDTO> {
  const response = await fetch("/api/profiles/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ai_consent_given: true }),
  });

  if (!response.ok) {
    const error: APIErrorResponse = await response.json();
    throw error;
  }

  return response.json();
}

/**
 * Upload receipt file to server
 *
 * @param file - Receipt image file to upload
 * @returns Uploaded file information (path, size, etc.)
 * @throws {APIErrorResponse} On API error
 */
export async function uploadReceipt(file: File): Promise<UploadReceiptResponseDTO> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/receipts/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error: APIErrorResponse = await response.json();
    throw error;
  }

  return response.json();
}

/**
 * Process receipt using AI (with 20 second timeout)
 *
 * @param filePath - File path on server (returned from uploadReceipt)
 * @returns Processed receipt data (expenses, date, currency)
 * @throws {APIErrorResponse} On API error or timeout
 */
export async function processReceipt(filePath: string): Promise<ProcessReceiptResponseDTO> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROCESSING_TIMEOUT_MS);

  try {
    const response = await fetch("/api/receipts/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error: APIErrorResponse = await response.json();
      throw error;
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw {
        error: {
          code: "PROCESSING_TIMEOUT",
          message: "AI processing took too long (exceeded 20s limit)",
        },
      } as APIErrorResponse;
    }

    throw error;
  }
}

/**
 * Save expenses in batch
 *
 * @param command - Command with list of expenses to save
 * @returns Operation result with number of saved expenses
 * @throws {APIErrorResponse} On API error
 */
export async function saveExpensesBatch(command: CreateExpenseBatchCommand): Promise<BatchExpenseResponseDTO> {
  const response = await fetch("/api/expenses/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const error: APIErrorResponse = await response.json();
    throw error;
  }

  return response.json();
}
