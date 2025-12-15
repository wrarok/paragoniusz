import { z } from "zod";

/**
 * Maximum file size for receipt uploads (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Allowed MIME types for receipt images
 */
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/heic"];

/**
 * Validation schema for receipt file upload
 * Validates file type and ensures file is not empty
 */
export const uploadReceiptSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "Nie podano pliku")
    .refine((file) => ALLOWED_FILE_TYPES.includes(file.type), "File must be JPEG, PNG, or HEIC format"),
});

/**
 * Validation schema for process receipt request
 * Validates file_path format: receipts/{user_id}/{uuid}.{ext}
 */
export const processReceiptSchema = z.object({
  file_path: z
    .string()
    .min(1, "File path is required")
    .regex(
      /^receipts\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i,
      "Invalid file path format. Expected: receipts/{user_id}/{uuid}.{ext}"
    ),
});

/**
 * Zod schema for a single receipt item extracted by AI
 */
export const receiptItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  amount: z.number().positive("Amount must be positive"),
  category: z.string().min(1, "Category is required"),
});

/**
 * Zod schema for complete receipt data extracted by AI
 */
export const receiptDataSchema = z.object({
  items: z.array(receiptItemSchema).min(1, "At least one item is required"),
  total: z.number().positive("Total must be positive"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

/**
 * TypeScript type inferred from receiptItemSchema
 */
export type ReceiptItem = z.infer<typeof receiptItemSchema>;

/**
 * TypeScript type inferred from receiptDataSchema
 */
export type ReceiptData = z.infer<typeof receiptDataSchema>;

/**
 * JSON Schema for OpenRouter API - Receipt Item
 * This is the format required by OpenRouter's response_format parameter
 */
const receiptItemJsonSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    amount: { type: "number" },
    category: { type: "string" },
  },
  required: ["name", "amount", "category"],
  additionalProperties: false,
} as const;

/**
 * JSON Schema for OpenRouter API - Complete Receipt
 * This schema is used in the response_format parameter when calling OpenRouter
 *
 * @example
 * ```typescript
 * const result = await openRouter.chatCompletion({
 *   systemMessage: "Extract receipt data",
 *   userMessage: [...],
 *   responseSchema: {
 *     name: 'receipt_extraction',
 *     schema: receiptExtractionJsonSchema
 *   }
 * });
 * ```
 */
export const receiptExtractionJsonSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: receiptItemJsonSchema,
    },
    total: { type: "number" },
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
  },
  required: ["items", "total", "date"],
  additionalProperties: false,
} as const;
