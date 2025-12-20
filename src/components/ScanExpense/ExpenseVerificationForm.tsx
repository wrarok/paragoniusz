/**
 * Expense Verification Form - Refactored Version
 *
 * Form for verifying and editing AI-extracted expenses from receipts.
 * Uses React Hook Form with custom controlled components.
 *
 * **Refactored to use custom components (272 LOC → ~130 LOC)**
 * - Custom controlled components for fields
 * - Extracted ExpenseVerificationItem
 * - Custom useExpenseFieldArray hook
 */

import { useForm, type SubmitHandler, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  expenseVerificationFormSchema,
  type ExpenseVerificationFormValues,
} from "@/lib/validation/expense-verification.validation";
import type { CategoryDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ControlledDateInput } from "@/components/form-controls";
import { ExpenseVerificationItem } from "./ExpenseVerificationItem";
import { useExpenseFieldArray } from "../hooks/useExpenseFieldArray";

interface ExpenseVerificationFormProps {
  /** Domyślne wartości formularza (dane z AI) */
  defaultValues: ExpenseVerificationFormValues;
  /** Lista dostępnych kategorii */
  categories: CategoryDTO[];
  /** Callback wywoływany po submit */
  onSubmit: (data: ExpenseVerificationFormValues) => Promise<void>;
  /** Callback wywoływany po kliknięciu Anuluj */
  onCancel: () => void;
}

/**
 * Formularz weryfikacji wydatków z paragonu
 *
 * Używa React Hook Form z custom komponentami do zarządzania stanem.
 * Pozwala użytkownikowi edytować sugerowane przez AI wydatki przed zapisaniem.
 */
export function ExpenseVerificationForm({
  defaultValues,
  categories,
  onSubmit,
  onCancel,
}: ExpenseVerificationFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(expenseVerificationFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const { fields, markAsEdited, removeExpense, canRemoveExpense } = useExpenseFieldArray({
    control: control as Control<ExpenseVerificationFormValues>,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit as SubmitHandler<ExpenseVerificationFormValues>)} className="space-y-6">
      {/* Receipt Date */}
      <ControlledDateInput control={control} name="receipt_date" label="Data paragonu" />

      {/* Expense Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            Wydatki z paragonu (<span data-testid="expense-count">{fields.length}</span>)
          </Label>
          <div className="text-right">
            <Label className="text-sm text-muted-foreground">Łączna kwota:</Label>
            <div className="text-lg font-semibold" data-testid="total-amount">
              {fields.reduce((sum, field) => sum + (field.amount || 0), 0).toFixed(2)} PLN
            </div>
          </div>
        </div>

        {/* Empty State */}
        {fields.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">Brak wydatków do wyświetlenia</CardContent>
          </Card>
        )}

        {/* Expense Items */}
        {fields.map((field, index) => (
          <ExpenseVerificationItem
            key={field.id}
            index={index}
            control={control as Control<ExpenseVerificationFormValues>}
            errors={errors.expenses?.[index]}
            categories={categories}
            items={field.items}
            isEdited={field.isEdited}
            onMarkEdited={() => markAsEdited(index)}
            onRemove={() => removeExpense(index)}
            canRemove={canRemoveExpense}
          />
        ))}

        {/* Global Array Error */}
        {errors.expenses?.root && <p className="text-destructive text-sm">{errors.expenses.root.message}</p>}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Zapisywanie..." : "Zweryfikuj i zapisz"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1">
          Anuluj
        </Button>
      </div>

      {/* Dirty State Indicator */}
      {isDirty && !isSubmitting && (
        <p className="text-sm text-muted-foreground text-center">Masz niezapisane zmiany w formularzu</p>
      )}
    </form>
  );
}
