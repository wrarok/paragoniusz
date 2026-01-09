import { useState, useCallback } from "react";
import { uploadReceipt } from "@/lib/services/scan-flow.service";
import { validateFile } from "@/lib/validation/file-upload.validation";
import { compressImage, isCompressionSupported } from "@/lib/utils/image-compression";
import type { UploadReceiptResponseDTO, APIErrorResponse } from "@/types";

/**
 * Hook for managing receipt file uploads
 *
 * Handles validation, compression and upload to server
 */
export function useFileUpload() {
  const [uploadedFile, setUploadedFile] = useState<UploadReceiptResponseDTO | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<APIErrorResponse | null>(null);

  /**
   * Validate and upload file
   *
   * @param file - File to upload
   * @returns Upload result or null on error
   */
  const validateAndUpload = useCallback(async (file: File) => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      // Type assertion needed because TypeScript discriminated unions don't narrow well
      const errorMessage = (validation as { isValid: false; error: string }).error;
      const validationError: APIErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: errorMessage,
        },
      };
      setError(validationError);
      return null;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Compress image if supported (especially important for mobile photos)
      let fileToUpload = file;
      if (isCompressionSupported()) {
        try {
          fileToUpload = await compressImage(file);
        } catch (compressionError) {
          console.warn("Image compression failed, using original file:", compressionError);
          // Continue with original file if compression fails
        }
      }

      const result = await uploadReceipt(fileToUpload);
      setUploadedFile(result);
      return result;
    } catch (err) {
      const apiError = err as APIErrorResponse;
      setError(apiError);
      console.error("Error uploading file:", apiError);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Reset state for new upload
   */
  const reset = useCallback(() => {
    setUploadedFile(null);
    setError(null);
    setIsUploading(false);
  }, []);

  /**
   * Reset only error for retry
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    /** Uploaded file (if successful) */
    uploadedFile,
    /** Upload in progress */
    isUploading,
    /** Validation or API error (if occurred) */
    error,
    /** Validate and upload file */
    validateAndUpload,
    /** Reset entire state */
    reset,
    /** Reset only error */
    resetError,
  };
}
