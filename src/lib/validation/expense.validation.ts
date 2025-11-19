import { z } from 'zod';

/**
 * Validation schema for expense query parameters
 * Used in: GET /api/expenses
 * 
 * Validates:
 * - limit: 1-100, default 50
 * - offset: >= 0, default 0
 * - from_date: YYYY-MM-DD format
 * - to_date: YYYY-MM-DD format
 * - category_id: valid UUID
 * - sort: one of the allowed sort options
 * 
 * Additional validation:
 * - Ensures from_date is not after to_date
 */
export const ExpenseQuerySchema = z
  .object({
    limit: z
      .union([z.string(), z.number(), z.null()])
      .transform((val) => (val === null ? 50 : Number(val)))
      .pipe(z.number().int().min(1).max(100)),
    offset: z
      .union([z.string(), z.number(), z.null()])
      .transform((val) => (val === null ? 0 : Number(val)))
      .pipe(z.number().int().min(0)),
    from_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional()
      .transform((val) => val ?? undefined),
    to_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional()
      .transform((val) => val ?? undefined),
    category_id: z
      .string()
      .uuid()
      .nullable()
      .optional()
      .transform((val) => val ?? undefined),
    sort: z
      .enum(['expense_date.asc', 'expense_date.desc', 'amount.asc', 'amount.desc'])
      .nullable()
      .transform((val) => val ?? 'expense_date.desc'),
  })
  .refine(
    (data) => {
      // Validate that from_date is not after to_date
      if (data.from_date && data.to_date) {
        return new Date(data.from_date) <= new Date(data.to_date);
      }
      return true;
    },
    {
      message: 'from_date must be before or equal to to_date',
      path: ['from_date'],
    }
  );

/**
 * Validation schema for expense ID path parameter
 * Used in: GET /api/expenses/{id}, PATCH /api/expenses/{id}, DELETE /api/expenses/{id}
 */
export const ExpenseIdSchema = z.object({
  id: z.string().uuid({
    message: 'Invalid expense ID format. Must be a valid UUID.'
  })
});

/**
 * Validation schema for creating a single expense manually
 * Used in: POST /api/expenses
 */
export const CreateExpenseSchema = z.object({
  category_id: z.string().uuid({
    message: 'Category ID must be a valid UUID'
  }),
  amount: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) : val)
    .pipe(
      z.number()
        .positive({ message: 'Amount must be greater than 0' })
        .max(99999999.99, { message: 'Amount cannot exceed 99,999,999.99' })
        .refine(
          (val) => {
            const decimalPlaces = (val.toString().split('.')[1] || '').length;
            return decimalPlaces <= 2;
          },
          { message: 'Amount must have maximum 2 decimal places' }
        )
    ),
  expense_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
    .refine(
      (date) => !isNaN(Date.parse(date)),
      { message: 'Invalid date' }
    )
    .refine(
      (date) => new Date(date) <= new Date(),
      { message: 'Expense date cannot be in the future' }
    ),
  currency: z.string()
    .length(3, { message: 'Currency must be a 3-letter code' })
    .toUpperCase()
    .default('PLN')
    .refine(
      (curr) => curr === 'PLN',
      { message: 'Only PLN currency is supported in MVP' }
    )
    .optional()
});

/**
 * Validation schema for updating an expense
 * Used in: PATCH /api/expenses/{id}
 *
 * All fields are optional, but at least one must be provided
 * Reuses validation logic from CreateExpenseSchema where applicable
 */
export const UpdateExpenseSchema = z.object({
  category_id: z.string().uuid({
    message: 'Category ID must be a valid UUID'
  }).optional(),
  
  amount: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) : val)
    .pipe(
      z.number()
        .positive({ message: 'Amount must be greater than 0' })
        .max(99999999.99, { message: 'Amount cannot exceed 99,999,999.99' })
        .refine(
          (val) => {
            const decimalPlaces = (val.toString().split('.')[1] || '').length;
            return decimalPlaces <= 2;
          },
          { message: 'Amount must have maximum 2 decimal places' }
        )
    ).optional(),
    
  expense_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' })
    .refine(
      (date) => !isNaN(Date.parse(date)),
      { message: 'Invalid date' }
    )
    .refine(
      (date) => new Date(date) <= new Date(),
      { message: 'Expense date cannot be in the future' }
    ).optional(),
    
  currency: z.string()
    .length(3, { message: 'Currency must be a 3-letter code' })
    .toUpperCase()
    .refine(
      (curr) => curr === 'PLN',
      { message: 'Only PLN currency is supported in MVP' }
    ).optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);