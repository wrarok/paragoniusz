import { z } from 'zod';

/**
 * Maximum file size for receipt uploads (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Allowed MIME types for receipt images
 */
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/heic'];

/**
 * Validation schema for receipt file upload
 * Validates file type and ensures file is not empty
 */
export const uploadReceiptSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'File cannot be empty')
    .refine(
      (file) => ALLOWED_FILE_TYPES.includes(file.type),
      'File must be JPEG, PNG, or HEIC format'
    ),
});

/**
 * Validation schema for process receipt request
 * Validates file_path format: receipts/{user_id}/{uuid}.{ext}
 */
export const processReceiptSchema = z.object({
  file_path: z
    .string()
    .min(1, 'File path is required')
    .regex(
      /^receipts\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i,
      'Invalid file path format. Expected: receipts/{user_id}/{uuid}.{ext}'
    ),
});