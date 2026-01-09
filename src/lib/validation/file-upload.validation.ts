import { z } from "zod";

/**
 * Max file size in MB
 */
export const MAX_FILE_SIZE_MB = 10;

/**
 * Max file size in bytes
 */
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Allowed file types
 */
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/heic"] as const;

/**
 * Checks if file extension is allowed
 */
function hasValidExtension(fileName: string): boolean {
  const extension = fileName.toLowerCase().split(".").pop();
  return ["jpg", "jpeg", "png", "heic"].includes(extension || "");
}

/**
 * Validation schema for uploaded receipt files
 *
 * Checks:
 * - File is a File instance
 * - File is not empty (size > 0)
 * - Size doesn't exceed MAX_FILE_SIZE_BYTES
 * - File type (MIME or extension) is allowed
 */
export const fileUploadSchema = z.custom<File>(
  (file) => {
    if (!(file instanceof File)) {
      return false;
    }

    if (file.size === 0) {
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return false;
    }

    // Check both MIME type and extension (iOS browsers may not set correct MIME for HEIC)
    const hasMimeType = ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number]);
    const hasExtension = hasValidExtension(file.name);

    if (!hasMimeType && !hasExtension) {
      return false;
    }

    return true;
  },
  {
    message: `File must be in format ${ALLOWED_FILE_TYPES.join(", ")} and not exceed ${MAX_FILE_SIZE_MB}MB`,
  }
);

/**
 * File validation result type
 */
export type FileValidationResult = { isValid: true } | { isValid: false; error: string };

/**
 * Helper function to validate files with detailed error messages
 * Checks both MIME type and extension (iOS browsers may not set correct MIME for HEIC)
 */
export function validateFile(file: File | null | undefined): FileValidationResult {
  if (!file) {
    return { isValid: false, error: "Nie wybrano pliku" };
  }

  if (!(file instanceof File)) {
    return { isValid: false, error: "Invalid file object" };
  }

  if (file.size === 0) {
    return { isValid: false, error: "Plik jest pusty" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Rozmiar pliku przekracza limit ${MAX_FILE_SIZE_MB}MB`,
    };
  }

  // Check both MIME type and extension (iOS browsers may not set correct MIME for HEIC)
  const hasMimeType = ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number]);
  const hasExtension = hasValidExtension(file.name);

  if (!hasMimeType && !hasExtension) {
    return {
      isValid: false,
      error: "Nieprawidłowy typ pliku. Prześlij tylko obrazy JPEG, PNG lub HEIC.",
    };
  }

  return { isValid: true };
}
