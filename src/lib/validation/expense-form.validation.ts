import { z } from "zod";

/**
 * Error messages for expense form validation
 */
export const EXPENSE_FORM_ERRORS = {
  AMOUNT: {
    REQUIRED: "Kwota jest wymagana",
    INVALID: "Kwota musi być prawidłową liczbą",
    POSITIVE: "Kwota musi być większa od 0",
    MAX_DECIMALS: "Kwota może mieć maksymalnie 2 miejsca dziesiętne",
    MAX_VALUE: "Kwota nie może przekroczyć 99 999 999,99",
  },
  CATEGORY: {
    REQUIRED: "Kategoria jest wymagana",
    INVALID: "Wybierz prawidłową kategorię",
  },
  DATE: {
    REQUIRED: "Data jest wymagana",
    INVALID: "Wprowadź prawidłową datę",
    FUTURE: "Data nie może być w przyszłości",
    OLD_WARNING: "Ta data jest starsza niż 1 rok",
  },
  CURRENCY: {
    INVALID: "Nieprawidłowy kod waluty",
  },
  FORM: {
    NO_CHANGES: "Nie wykryto zmian",
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
  .min(1, EXPENSE_FORM_ERRORS.CATEGORY.REQUIRED)
  .uuid(EXPENSE_FORM_ERRORS.CATEGORY.INVALID);

/**
 * Schema for validating expense_date field
 * Date must be in YYYY-MM-DD format and not in the future
 */
export const expenseDateSchema = z
  .string()
  .min(1, EXPENSE_FORM_ERRORS.DATE.REQUIRED)
  .refine(
    (val) => {
      // Check if date is valid - parse as local date
      const [year, month, day] = val.split("-").map(Number);
      if (!year || !month || !day) return false;
      const date = new Date(year, month - 1, day);
      return !isNaN(date.getTime());
    },
    { message: EXPENSE_FORM_ERRORS.DATE.INVALID }
  )
  .refine(
    (val) => {
      // Check if date is not in the future - parse as local date
      const [year, month, day] = val.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today in local time
      return date <= today;
    },
    { message: EXPENSE_FORM_ERRORS.DATE.FUTURE }
  );

/**
 * Schema for validating currency field
 * Currently only PLN is supported in MVP
 */
export const currencySchema = z.string().length(3, EXPENSE_FORM_ERRORS.CURRENCY.INVALID).default("PLN");

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
export function validateField(field: keyof ExpenseFormSchemaType, value: string): string | undefined {
  try {
    switch (field) {
      case "amount":
        amountSchema.parse(value);
        break;
      case "category_id":
        categoryIdSchema.parse(value);
        break;
      case "expense_date":
        expenseDateSchema.parse(value);
        break;
      case "currency":
        currencySchema.parse(value);
        break;
    }
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message;
    }
    return "Validation error";
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
    return { _form: "Błąd walidacji" };
  }
}

/**
 * Checks if date is older than 1 year (warning, not error)
 */
export function isDateOlderThanOneYear(dateString: string): boolean {
  // Parse as local date (YYYY-MM-DD)
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return false;

  const date = new Date(year, month - 1, day);
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
