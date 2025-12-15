import type { DashboardSummaryDTO, ExpenseDTO } from "../types";

/**
 * Pie chart data point for recharts visualization
 */
export interface PieChartDataPoint {
  name: string;
  value: number;
  percentage: number;
  color: string;
  categoryId: string | null;
}

/**
 * Dashboard summary component state
 */
export interface DashboardState {
  summary: DashboardSummaryDTO | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Expense list component state with pagination
 */
export interface ExpenseListState {
  expenses: ExpenseDTO[];
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  offset: number;
}

/**
 * Result of delete expense operation
 */
export interface DeleteExpenseResult {
  success: boolean;
  error?: string;
}
