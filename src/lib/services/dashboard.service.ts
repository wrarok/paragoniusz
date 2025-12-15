import type { SupabaseClient } from "../../db/supabase.client";
import type { DashboardSummaryDTO, CategorySummaryDTO, AIMetricsDTO } from "../../types";

/**
 * Service for handling dashboard summary operations
 * Aggregates expense data and calculates statistics for a given period
 */
export class DashboardService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get dashboard summary for a specific date range
   * @param userId - The authenticated user's ID
   * @param fromDate - Start date in YYYY-MM-DD format
   * @param toDate - End date in YYYY-MM-DD format
   * @returns Dashboard summary with aggregated expense data
   */
  async getSummary(userId: string, fromDate: string, toDate: string): Promise<DashboardSummaryDTO> {
    // Query expenses with category join
    const { data: expenses, error } = await this.supabase
      .from("expenses")
      .select("id, amount, currency, created_by_ai, was_ai_suggestion_edited, category_id, categories(id, name)")
      .eq("user_id", userId)
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate);

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }

    // Handle empty result set
    if (!expenses || expenses.length === 0) {
      return this.createEmptyResponse(fromDate, toDate);
    }

    // Calculate total amount and get currency from first expense
    const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const currency = expenses[0].currency;
    const expenseCount = expenses.length;

    // Group expenses by category
    const categoryMap = new Map<
      string | null,
      {
        id: string | null;
        name: string;
        amount: number;
        count: number;
      }
    >();

    expenses.forEach((expense) => {
      const categoryId = expense.category_id;
      const categoryName = expense.categories?.name || "Other";

      const existing = categoryMap.get(categoryId);
      if (existing) {
        existing.amount += Number(expense.amount);
        existing.count += 1;
      } else {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          amount: Number(expense.amount),
          count: 1,
        });
      }
    });

    // Convert to array, calculate percentages, and sort by amount descending
    const categories: CategorySummaryDTO[] = Array.from(categoryMap.values())
      .map((cat) => ({
        category_id: cat.id,
        category_name: cat.name,
        amount: cat.amount.toFixed(2),
        percentage: Number(((cat.amount / totalAmount) * 100).toFixed(1)),
        count: cat.count,
      }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));

    // Calculate AI metrics
    const aiCreatedCount = expenses.filter((e) => e.created_by_ai).length;
    const aiEditedCount = expenses.filter((e) => e.was_ai_suggestion_edited).length;
    const aiCreatedPercentage = Number(((aiCreatedCount / expenseCount) * 100).toFixed(1));

    // AI accuracy: percentage of AI-created expenses that were NOT edited
    const aiAccuracyPercentage =
      aiCreatedCount > 0 ? Number((((aiCreatedCount - aiEditedCount) / aiCreatedCount) * 100).toFixed(1)) : 0;

    const aiMetrics: AIMetricsDTO = {
      ai_created_count: aiCreatedCount,
      ai_created_percentage: aiCreatedPercentage,
      ai_edited_count: aiEditedCount,
      ai_accuracy_percentage: aiAccuracyPercentage,
    };

    // Extract month from fromDate (YYYY-MM)
    const month = fromDate.substring(0, 7);

    return {
      period: {
        month,
        from_date: fromDate,
        to_date: toDate,
      },
      total_amount: totalAmount.toFixed(2),
      currency,
      expense_count: expenseCount,
      categories,
      ai_metrics: aiMetrics,
    };
  }

  /**
   * Create an empty response for periods with no expenses
   * @param fromDate - Start date in YYYY-MM-DD format
   * @param toDate - End date in YYYY-MM-DD format
   * @returns Empty dashboard summary with zero values
   */
  private createEmptyResponse(fromDate: string, toDate: string): DashboardSummaryDTO {
    const month = fromDate.substring(0, 7);
    return {
      period: {
        month,
        from_date: fromDate,
        to_date: toDate,
      },
      total_amount: "0.00",
      currency: "PLN",
      expense_count: 0,
      categories: [],
      ai_metrics: {
        ai_created_count: 0,
        ai_created_percentage: 0,
        ai_edited_count: 0,
        ai_accuracy_percentage: 0,
      },
    };
  }
}
