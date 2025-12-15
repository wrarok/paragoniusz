/**
 * Expense Form Transformer
 *
 * Handles data transformations between different expense data formats:
 * - Form values (ExpenseFormValues) - used in React Hook Form
 * - API commands (CreateExpenseCommand, UpdateExpenseCommand) - sent to API
 * - DTOs (ExpenseDTO) - received from API
 */

import type { ExpenseFormValues } from "@/lib/validation/expense-form.schema";
import type { ExpenseDTO, CreateExpenseCommand, UpdateExpenseCommand } from "@/types";

/**
 * Transform form data to create command
 *
 * Converts string amount to number and prepares data for API
 *
 * @param formData - Form data from UI
 * @returns Command object for creating expense
 */
function toCreateCommand(formData: ExpenseFormValues): CreateExpenseCommand {
  return {
    category_id: formData.category_id,
    amount: parseFloat(formData.amount),
    expense_date: formData.expense_date,
    currency: formData.currency,
  };
}

/**
 * Transform form data to update command
 *
 * Converts string amount to number and prepares data for API
 *
 * @param formData - Form data from UI
 * @returns Command object for updating expense
 */
function toUpdateCommand(formData: ExpenseFormValues): UpdateExpenseCommand {
  return {
    category_id: formData.category_id,
    amount: parseFloat(formData.amount),
    expense_date: formData.expense_date,
    currency: formData.currency,
  };
}

/**
 * Transform DTO to form data
 *
 * Prepares expense data from API for display in form
 *
 * @param dto - Expense DTO from API
 * @returns Form data for UI
 */
function fromDTO(dto: ExpenseDTO): ExpenseFormValues {
  return {
    category_id: dto.category_id,
    amount: dto.amount, // Already string from API
    expense_date: dto.expense_date,
    currency: dto.currency as "PLN" | "EUR" | "USD", // Type assertion for currency
  };
}

/**
 * ExpenseFormTransformer object with all transformation methods
 */
export const ExpenseFormTransformer = {
  toCreateCommand,
  toUpdateCommand,
  fromDTO,
};
