import { z } from 'zod';

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