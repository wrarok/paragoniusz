/**
 * Expense Form Zod Schema
 * 
 * Validation schema for expense form using Zod.
 * Used with React Hook Form's zodResolver.
 */

import { z } from 'zod';

/**
 * Expense form validation schema
 */
export const expenseFormSchema = z.object({
  category_id: z
    .string({
      required_error: 'Kategoria jest wymagana',
      invalid_type_error: 'Kategoria musi być tekstem',
    })
    .superRefine((val, ctx) => {
      // First check if empty
      if (!val || val.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Kategoria jest wymagana',
        });
        return;
      }
      // Then check UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nieprawidłowy format kategorii',
        });
      }
    }),

  amount: z
    .string({
      required_error: 'Kwota jest wymagana',
      invalid_type_error: 'Kwota musi być tekstem',
    })
    .min(1, 'Kwota jest wymagana')
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num);
      },
      {
        message: 'Kwota musi być liczbą',
      }
    )
    .refine(
      (val) => {
        const num = parseFloat(val);
        return num > 0;
      },
      {
        message: 'Kwota musi być większa od 0',
      }
    )
    .refine(
      (val) => {
        const num = parseFloat(val);
        return num <= 999999.99;
      },
      {
        message: 'Kwota nie może przekraczać 999,999.99',
      }
    )
    .refine(
      (val) => {
        const num = parseFloat(val);
        const decimalPlaces = (val.split('.')[1] || '').length;
        return decimalPlaces <= 2;
      },
      {
        message: 'Kwota może mieć maksymalnie 2 miejsca po przecinku',
      }
    ),

  expense_date: z
    .string({
      required_error: 'Data jest wymagana',
      invalid_type_error: 'Data musi być tekstem',
    })
    .min(1, 'Data jest wymagana')
    .refine(
      (val) => {
        // Parse as local date (YYYY-MM-DD)
        const [year, month, day] = val.split('-').map(Number);
        if (!year || !month || !day) return false;
        const date = new Date(year, month - 1, day);
        return !isNaN(date.getTime());
      },
      {
        message: 'Nieprawidłowy format daty',
      }
    )
    .refine(
      (val) => {
        // Parse as local date and compare with local today
        const [year, month, day] = val.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today in local time
        return date <= today;
      },
      {
        message: 'Data nie może być w przyszłości',
      }
    ),

  currency: z.enum(['PLN', 'EUR', 'USD'], {
    errorMap: () => ({
      message: 'Nieprawidłowa waluta. Wybierz PLN, EUR lub USD',
    }),
  }),
});

/**
 * Inferred TypeScript type from schema
 */
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;