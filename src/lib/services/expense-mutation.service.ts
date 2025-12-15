/**
 * Expense Mutation Service
 *
 * Handles all API calls related to expense mutations (create, update, delete).
 * Provides a clean abstraction over the API layer.
 */

import { post, patch, delete_ } from "./api-client.service";
import type { CreateExpenseCommand, UpdateExpenseCommand, ExpenseDTO } from "@/types";

/**
 * Create a new expense
 *
 * @param command - Expense creation data
 * @returns Created expense DTO
 * @throws Error if creation fails
 */
export async function createExpense(command: CreateExpenseCommand): Promise<ExpenseDTO> {
  return post<ExpenseDTO>("/api/expenses", command);
}

/**
 * Update an existing expense
 *
 * @param id - Expense ID
 * @param command - Expense update data
 * @returns Updated expense DTO
 * @throws Error if update fails or expense not found
 */
export async function updateExpense(id: string, command: UpdateExpenseCommand): Promise<ExpenseDTO> {
  return patch<ExpenseDTO>(`/api/expenses/${id}`, command);
}

/**
 * Delete an expense
 *
 * @param id - Expense ID
 * @throws Error if deletion fails or expense not found
 */
export async function deleteExpense(id: string): Promise<undefined> {
  return delete_<undefined>(`/api/expenses/${id}`);
}

/**
 * ExpenseMutationService object with all mutation methods
 *
 * This object provides a consistent interface for expense mutations
 * that can be imported and used as ExpenseMutationService.create(), etc.
 */
export const ExpenseMutationService = {
  create: createExpense,
  update: updateExpense,
  delete: deleteExpense,
};
