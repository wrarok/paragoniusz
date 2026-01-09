import { ReceiptSummaryCard } from "./ReceiptSummaryCard";
import { ExpensesListSection } from "./ExpensesListSection";
import { ExpensesSummaryFooter } from "./ExpensesSummaryFooter";
import { useExpenseValidation, useCalculatedTotal } from "@/components/hooks/useExpenseValidation";
import type { CategoryDTO } from "@/types";
import type { EditableExpense } from "@/types/scan-flow.types";

interface ExpenseVerificationListProps {
  expenses: EditableExpense[];
  categories: CategoryDTO[];
  receiptDate: string;
  totalAmount: string;
  currency: string;
  onUpdateExpense: (id: string, updates: Partial<EditableExpense>) => void;
  onRemoveExpense: (id: string) => void;
  onUpdateReceiptDate: (newDate: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function ExpenseVerificationList({
  expenses,
  categories,
  receiptDate,
  totalAmount,
  currency,
  onUpdateExpense,
  onRemoveExpense,
  onUpdateReceiptDate,
  onSave,
  onCancel,
  isSaving,
}: ExpenseVerificationListProps) {
  const validation = useExpenseValidation(expenses);
  const calculatedTotal = useCalculatedTotal(expenses);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <ReceiptSummaryCard
        receiptDate={receiptDate}
        totalAmount={totalAmount}
        currency={currency}
        validation={validation}
        onUpdateReceiptDate={onUpdateReceiptDate}
      />

      <ExpensesListSection
        expenses={expenses}
        categories={categories}
        calculatedTotal={calculatedTotal}
        currency={currency}
        onUpdateExpense={onUpdateExpense}
        onRemoveExpense={onRemoveExpense}
      />

      <ExpensesSummaryFooter
        calculatedTotal={calculatedTotal}
        originalTotal={totalAmount}
        currency={currency}
        receiptDate={receiptDate}
        expenseCount={expenses.length}
        validation={validation}
        isSaving={isSaving}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
}
