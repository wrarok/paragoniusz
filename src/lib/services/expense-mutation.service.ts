/**
 * Expense Mutation Service
 * 
 * Handles all API calls related to expense mutations (create, update, delete).
 * Provides a clean abstraction over the API layer.
 */

import { APIClientService } from './api-client.service';
import type { CreateExpenseCommand, UpdateExpenseCommand, ExpenseDTO } from '@/types';

export class ExpenseMutationService {
  /**
   * Create a new expense
   * 
   * @param command - Expense creation data
   * @returns Created expense DTO
   * @throws Error if creation fails
   */
  static async create(command: CreateExpenseCommand): Promise<ExpenseDTO> {
    return APIClientService.post<ExpenseDTO>('/api/expenses', command);
  }

  /**
   * Update an existing expense
   * 
   * @param id - Expense ID
   * @param command - Expense update data
   * @returns Updated expense DTO
   * @throws Error if update fails or expense not found
   */
  static async update(id: string, command: UpdateExpenseCommand): Promise<ExpenseDTO> {
    return APIClientService.patch<ExpenseDTO>(`/api/expenses/${id}`, command);
  }

  /**
   * Delete an expense
   * 
   * @param id - Expense ID
   * @throws Error if deletion fails or expense not found
   */
  static async delete(id: string): Promise<void> {
    return APIClientService.delete<void>(`/api/expenses/${id}`);
  }
}