import { z } from "zod";

/**
 * Validation schema for single expense in verification process
 */
export const expenseItemSchema = z.object({
  id: z.string(),
  category_id: z.string().uuid("Invalid category identifier"),
  category_name: z.string().optional(),
  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .positive("Amount must be positive")
    .max(999999.99, "Amount cannot exceed 999,999.99")
    .refine(
      (val) => {
        // Check max 2 decimal places
        const decimalPart = val.toString().split(".")[1];
        return !decimalPart || decimalPart.length <= 2;
      },
      {
        message: "Amount can have at most 2 decimal places",
      }
    ),
  items: z.array(z.string()).default([]),
  isEdited: z.boolean().default(false),
});

/**
 * Validation schema for expense verification form
 */
export const expenseVerificationFormSchema = z.object({
  receipt_date: z
    .string({
      required_error: "Receipt date is required",
    })
    .refine(
      (date) => {
        try {
          const parsedDate = new Date(date);
          const now = new Date();
          return parsedDate <= now;
        } catch {
          return false;
        }
      },
      {
        message: "Date cannot be in the future",
      }
    ),
  currency: z.string().default("PLN"),
  expenses: z.array(expenseItemSchema).min(1, "You must have at least one expense to save"),
});

/**
 * Expense verification form values type (schema output with defaults)
 */
export type ExpenseVerificationFormValues = z.output<typeof expenseVerificationFormSchema>;

/**
 * Single expense type (schema output)
 */
export type ExpenseItemFormValues = z.output<typeof expenseItemSchema>;
