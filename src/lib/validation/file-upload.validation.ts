import { z } from "zod";

/**
 * Maksymalny rozmiar pliku w MB
 */
export const MAX_FILE_SIZE_MB = 10;

/**
 * Maksymalny rozmiar pliku w bajtach
 */
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Dozwolone typy plików
 */
export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/heic"] as const;

/**
 * Schema walidacji dla uploadowanych plików paragonów
 *
 * Sprawdza:
 * - Czy plik jest instancją File
 * - Czy plik nie jest pusty (size > 0)
 * - Czy rozmiar nie przekracza MAX_FILE_SIZE_BYTES
 * - Czy typ pliku jest na liście dozwolonych
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

    if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
      return false;
    }

    return true;
  },
  {
    message: `Plik musi być w formacie ${ALLOWED_FILE_TYPES.join(", ")} i nie przekraczać ${MAX_FILE_SIZE_MB}MB`,
  }
);

/**
 * Typ wyniku walidacji pliku
 */
export type FileValidationResult = { isValid: true } | { isValid: false; error: string };

/**
 * Funkcja pomocnicza do walidacji pliku z bardziej szczegółowymi komunikatami błędów
 */
export function validateFile(file: File | null | undefined): FileValidationResult {
  if (!file) {
    return { isValid: false, error: "Nie wybrano pliku" };
  }

  if (!(file instanceof File)) {
    return { isValid: false, error: "Nieprawidłowy obiekt pliku" };
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

  if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
    return {
      isValid: false,
      error: "Nieprawidłowy typ pliku. Prześlij tylko obrazy JPEG, PNG lub HEIC.",
    };
  }

  return { isValid: true };
}
