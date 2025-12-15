import type { ProcessReceiptResponseDTO, ReceiptExpenseDTO } from "@/types";
import type { ExpenseVerificationFormValues } from "@/lib/validation/expense-verification.validation";

/**
 * Transforms processed receipt data from AI response into form values
 * for the expense verification form.
 *
 * @param data - Processed receipt data from AI
 * @returns Form values ready for verification
 */
export function toVerificationFormValues(data: ProcessReceiptResponseDTO): ExpenseVerificationFormValues {
  return {
    receipt_date: data.receipt_date,
    currency: data.currency,
    expenses: data.expenses.map((expense: ReceiptExpenseDTO, index: number) => ({
      id: `expense-${index}`,
      category_id: expense.category_id,
      category_name: expense.category_name,
      amount: parseFloat(expense.amount),
      items: expense.items,
      isEdited: false,
    })),
  };
}
