import type {
  ExpenseDTO,
  CreateExpenseCommand,
  UpdateExpenseCommand,
  BatchExpenseItem,
  CategoryDTO,
} from '../../types';
import type { DatabaseExpense, InsertExpense } from '../repositories/expense.repository';

/**
 * Transformer for converting between database entities and DTOs
 * 
 * Eliminates duplication of transformation logic (previously 5x in original code).
 * Provides single source of truth for data transformation.
 * All transformation logic is centralized here for consistency and maintainability.
 */
export class ExpenseTransformer {
  /**
   * Transform single database expense to DTO
   * 
   * Converts database types (e.g., number amount) to DTO types (e.g., string amount).
   * Ensures nested category is properly formatted.
   * 
   * @param dbExpense - Database expense entity with nested category
   * @returns ExpenseDTO ready for API response
   */
  static toDTO(dbExpense: DatabaseExpense): ExpenseDTO {
    return {
      id: dbExpense.id,
      user_id: dbExpense.user_id,
      category_id: dbExpense.category_id,
      amount: dbExpense.amount.toString(),
      expense_date: dbExpense.expense_date,
      currency: dbExpense.currency,
      created_by_ai: dbExpense.created_by_ai,
      was_ai_suggestion_edited: dbExpense.was_ai_suggestion_edited,
      created_at: dbExpense.created_at,
      updated_at: dbExpense.updated_at,
      category: {
        id: dbExpense.category!.id,
        name: dbExpense.category!.name,
      } as CategoryDTO,
    };
  }

  /**
   * Transform array of database expenses to DTOs
   * 
   * Efficiently maps multiple expenses using the single entity transformer.
   * 
   * @param dbExpenses - Array of database expense entities
   * @returns Array of ExpenseDTOs
   */
  static toDTOList(dbExpenses: DatabaseExpense[]): ExpenseDTO[] {
    return dbExpenses.map((expense) => this.toDTO(expense));
  }

  /**
   * Transform CreateExpenseCommand to InsertExpense
   *
   * Prepares data for database insertion from API command.
   * Sets default values and ensures all required fields are present.
   *
   * @param command - Validated create expense command from API
   * @param userId - User ID from authentication context
   * @returns InsertExpense ready for repository
   */
  static toInsertData(command: CreateExpenseCommand, userId: string): InsertExpense {
    return {
      user_id: userId,
      category_id: command.category_id!,
      amount: command.amount!,
      expense_date: command.expense_date!,
      currency: command.currency || 'PLN',
      created_by_ai: false,
      was_ai_suggestion_edited: false,
    };
  }

  /**
   * Transform batch items to insert data
   *
   * Converts array of batch expense items (typically from AI processing)
   * to database insert format with user ID and parsed amounts.
   *
   * @param items - Array of batch expense items
   * @param userId - User ID from authentication context
   * @returns Array of InsertExpense ready for batch repository operation
   */
  static toBatchInsertData(items: BatchExpenseItem[], userId: string): InsertExpense[] {
    return items.map((item) => ({
      user_id: userId,
      category_id: item.category_id!,
      amount: parseFloat(item.amount),
      expense_date: item.expense_date!,
      currency: item.currency || 'PLN',
      created_by_ai: item.created_by_ai ?? false,
      was_ai_suggestion_edited: item.was_ai_suggestion_edited ?? false,
    }));
  }

  /**
   * Transform UpdateExpenseCommand to partial InsertExpense
   * 
   * Only includes fields that are provided in the update command.
   * Ensures partial updates don't overwrite fields with undefined values.
   * 
   * @param command - Validated update expense command from API
   * @returns Partial InsertExpense with only provided fields
   */
  static toUpdateData(command: UpdateExpenseCommand): Partial<InsertExpense> {
    const updateData: Partial<InsertExpense> = {};

    if (command.category_id !== undefined) {
      updateData.category_id = command.category_id;
    }
    if (command.amount !== undefined) {
      updateData.amount = command.amount;
    }
    if (command.expense_date !== undefined) {
      updateData.expense_date = command.expense_date;
    }
    if (command.currency !== undefined) {
      updateData.currency = command.currency;
    }

    return updateData;
  }
}