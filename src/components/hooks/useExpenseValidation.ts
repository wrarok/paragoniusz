import { useMemo } from "react";
import { parseAmount } from "@/lib/utils/formatters";
import type { EditableExpense } from "@/types/scan-flow.types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function useExpenseValidation(expenses: EditableExpense[]): ValidationResult {
  return useMemo(() => {
    if (expenses.length === 0) {
      return {
        isValid: false,
        errors: ["Wymagany jest co najmniej jeden wydatek"],
      };
    }

    const errors: string[] = [];
    let hasInvalidAmount = false;
    let hasInvalidCategory = false;

    expenses.forEach((expense) => {
      const amount = parseAmount(expense.amount);
      if (!expense.amount || amount <= 0) {
        hasInvalidAmount = true;
      }

      if (!expense.category_id) {
        hasInvalidCategory = true;
      }
    });

    if (hasInvalidAmount) {
      errors.push("Wszystkie wydatki muszą mieć prawidłową kwotę większą niż 0");
    }

    if (hasInvalidCategory) {
      errors.push("Wszystkie wydatki muszą mieć wybraną kategorię");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [expenses]);
}

export function useCalculatedTotal(expenses: EditableExpense[]): number {
  return useMemo(() => {
    return expenses.reduce((sum, expense) => {
      const amount = parseAmount(expense.amount);
      return sum + amount;
    }, 0);
  }, [expenses]);
}
