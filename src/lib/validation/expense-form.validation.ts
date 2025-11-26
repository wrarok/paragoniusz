import { z } from 'zod';

/**
 * Error messages for expense form validation
 */
export const EXPENSE_FORM_ERRORS = {
  AMOUNT: {
    REQUIRED: 'Amount is required',
    INVALID: 'Amount must be a valid number',
    POSITIVE: 'Amount must be greater than 0',
    MAX_DECIMALS: 'Amount must have maximum 2 decimal places',
    MAX_VALUE: 'Amount cannot exceed 99,999,999.99',
  },
  CATEGORY: {
    REQUIRED: 'Category is required',
    INVALID: 'Please select a valid category',
  },
  DATE: {
    REQUIRED: 'Date is required',
    INVALID: 'Please enter a valid date',
    FUTURE: 'Date cannot be in the future',
    OLD_WARNING: 'This date is more than 1 year old',
  },
  CURRENCY: {
    INVALID: 'Invalid currency code',
  },
  FORM: {
    NO_CHANGES: 'No changes detected',
  },
} as const;

/**
 * Regex pattern for validating amount format
 * Allows: "45", "45.5", "45.50"
 */
const AMOUNT_REGEX = /^\d+(\.\d{0,2})?$/;

/**
 * Maximum allowed amount value
 */
const MAX_AMOUNT = 99999999.99;

/**
 * Schema for validating amount field
 * Amount is kept as string for better input handling
 */
export const amountSchema = z
  .string()
  .min(1, EXPENSE_FORM_ERRORS.AMOUNT.REQUIRED)
  .regex(AMOUNT_REGEX, EXPENSE_FORM_ERRORS.AMOUNT.INVALID)
  .refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: EXPENSE_FORM_ERRORS.AMOUNT.POSITIVE }
  )
  .refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num <= MAX_AMOUNT;
    },
    { message: EXPENSE_FORM_ERRORS.AMOUNT.MAX_VALUE }
  );

/**
 * Schema for validating category_id field
 */
export const categoryIdSchema = z
  .string()
  .uuid(EXPENSE_FORM_ERRORS.CATEGORY.INVALID)
  .min(1, EXPENSE_FORM_ERRORS.CATEGORY.REQUIRED);

/**
 * Schema for validating expense_date field
 * Date must be in YYYY-MM-DD format and not in the future
 */
export const expenseDateSchema = z
  .string()
  .min(1, EXPENSE_FORM_ERRORS.DATE.REQUIRED)
  .refine(
    (val) => {
      // Check if date is valid
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: EXPENSE_FORM_ERRORS.DATE.INVALID }
  )
  .refine(
    (val) => {
      // Check if date is not in the future
      const date = new Date(val);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      return date <= today;
    },
    { message: EXPENSE_FORM_ERRORS.DATE.FUTURE }
  );

/**
 * Schema for validating currency field
 * Currently only PLN is supported in MVP
 */
export const currencySchema = z
  .string()
  .length(3, EXPENSE_FORM_ERRORS.CURRENCY.INVALID)
  .default('PLN');

/**
 * Complete form schema for creating/editing expenses
 */
export const expenseFormSchema = z.object({
  category_id: categoryIdSchema,
  amount: amountSchema,
  expense_date: expenseDateSchema,
  currency: currencySchema,
});

/**
 * Type for expense form data (inferred from schema)
 */
export type ExpenseFormSchemaType = z.infer<typeof expenseFormSchema>;

/**
 * Validates a single field and returns error message if invalid
 */
export function validateField(
  field: keyof ExpenseFormSchemaType,
  value: string
): string | undefined {
  try {
    switch (field) {
      case 'amount':
        amountSchema.parse(value);
        break;
      case 'category_id':
        categoryIdSchema.parse(value);
        break;
      case 'expense_date':
        expenseDateSchema.parse(value);
        break;
      case 'currency':
        currencySchema.parse(value);
        break;
    }
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message;
    }
    return 'Validation error';
  }
}

/**
 * Validates entire form and returns all errors
 */
export function validateForm(data: ExpenseFormSchemaType): Record<string, string> | null {
  try {
    expenseFormSchema.parse(data);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      return errors;
    }
    return { _form: 'Validation error' };
  }
}

/**
 * Checks if date is older than 1 year (warning, not error)
 */
export function isDateOlderThanOneYear(dateString: string): boolean {
  const date = new Date(dateString);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return date < oneYearAgo;
}

/**
 * Converts form amount (string) to API amount (number)
 */
export function convertAmountToNumber(amount: string): number {
  return parseFloat(amount);
}

/**
 * Converts API amount (number) to form amount (string)
 */
export function convertAmountToString(amount: number): string {
  return amount.toString();
}