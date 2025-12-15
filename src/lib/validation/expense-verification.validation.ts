import { z } from "zod";

/**
 * Schema walidacji dla pojedynczego wydatku w procesie weryfikacji
 */
export const expenseItemSchema = z.object({
  id: z.string(),
  category_id: z.string().uuid("Nieprawidłowy identyfikator kategorii"),
  category_name: z.string().optional(),
  amount: z
    .number({
      required_error: "Kwota jest wymagana",
      invalid_type_error: "Kwota musi być liczbą",
    })
    .positive("Kwota musi być dodatnia")
    .max(999999.99, "Kwota nie może przekraczać 999,999.99")
    .refine(
      (val) => {
        // Sprawdź czy kwota ma maksymalnie 2 miejsca po przecinku
        const decimalPart = val.toString().split(".")[1];
        return !decimalPart || decimalPart.length <= 2;
      },
      {
        message: "Kwota może mieć maksymalnie 2 miejsca po przecinku",
      }
    ),
  items: z.array(z.string()).default([]),
  isEdited: z.boolean().default(false),
});

/**
 * Schema walidacji dla całego formularza weryfikacji wydatków
 */
export const expenseVerificationFormSchema = z.object({
  receipt_date: z
    .string({
      required_error: "Data paragonu jest wymagana",
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
        message: "Data nie może być z przyszłości",
      }
    ),
  currency: z.string().default("PLN"),
  expenses: z.array(expenseItemSchema).min(1, "Musisz mieć przynajmniej jeden wydatek do zapisania"),
});

/**
 * Typ wartości formularza weryfikacji wydatków (output z schema po walidacji)
 * Używamy z.output aby uzyskać typ z wartościami domyślnymi
 */
export type ExpenseVerificationFormValues = z.output<typeof expenseVerificationFormSchema>;

/**
 * Typ pojedynczego wydatku (output z schema po walidacji)
 */
export type ExpenseItemFormValues = z.output<typeof expenseItemSchema>;
