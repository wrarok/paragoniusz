import { useState, useCallback } from "react";
import { uploadReceipt } from "@/lib/services/scan-flow.service";
import { validateFile } from "@/lib/validation/file-upload.validation";
import type { UploadReceiptResponseDTO, APIErrorResponse } from "@/types";

/**
 * Hook do zarządzania uploadem plików paragonów
 *
 * Obsługuje walidację i upload plików na serwer
 */
export function useFileUpload() {
  const [uploadedFile, setUploadedFile] = useState<UploadReceiptResponseDTO | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<APIErrorResponse | null>(null);

  /**
   * Waliduj i upload pliku
   *
   * @param file - Plik do uploadu
   * @returns Rezultat uploadu lub null w przypadku błędu
   */
  const validateAndUpload = useCallback(async (file: File) => {
    // Walidacja pliku
    const validation = validateFile(file);
    if (!validation.isValid) {
      const validationError: APIErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error,
        },
      };
      setError(validationError);
      return null;
    }

    // Upload pliku
    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadReceipt(file);
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
   * Resetuj stan (do ponownego uploadu)
   */
  const reset = useCallback(() => {
    setUploadedFile(null);
    setError(null);
    setIsUploading(false);
  }, []);

  /**
   * Resetuj tylko błąd (do obsługi retry)
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    /** Uploadowany plik (jeśli upload był pomyślny) */
    uploadedFile,
    /** Czy upload jest w trakcie */
    isUploading,
    /** Błąd walidacji lub API (jeśli wystąpił) */
    error,
    /** Waliduj i uploaduj plik */
    validateAndUpload,
    /** Resetuj cały stan */
    reset,
    /** Resetuj tylko błąd */
    resetError,
  };
}
