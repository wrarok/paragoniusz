import { useState, useEffect, useCallback } from "react";
import type { ExpenseListDTO } from "../../types";
import type { ExpenseListState, DeleteExpenseResult } from "../../types/dashboard.types";

interface UseExpenseListOptions {
  initialData?: ExpenseListDTO;
  limit?: number;
}

export function useExpenseList({ initialData, limit = 10 }: UseExpenseListOptions = {}) {
  const [state, setState] = useState<ExpenseListState>({
    expenses: initialData?.data || [],
    hasMore: initialData ? initialData.data.length < initialData.total : false,
    isLoading: !initialData,
    isLoadingMore: false,
    error: null,
    offset: initialData?.data.length || 0,
  });

  useEffect(() => {
    const fetchExpenses = async () => {
      if (initialData) {
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: "0",
          sort: "expense_date.desc",
        });

        const response = await fetch(`/api/expenses?${params.toString()}`);

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }
          throw new Error(`Failed to fetch expenses: ${response.statusText}`);
        }

        const data: ExpenseListDTO = await response.json();
        setState({
          expenses: data.data,
          hasMore: data.data.length < data.total,
          isLoading: false,
          isLoadingMore: false,
          error: null,
          offset: data.data.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load expenses";
        setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
        console.error("Error fetching expenses:", error);
      }
    };

    fetchExpenses();
  }, [initialData, limit]);

  const loadMore = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore) {
      return;
    }

    setState((prev) => ({ ...prev, isLoadingMore: true, error: null }));

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: state.offset.toString(),
        sort: "expense_date.desc",
      });

      const response = await fetch(`/api/expenses?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(`Failed to load more expenses: ${response.statusText}`);
      }

      const data: ExpenseListDTO = await response.json();
      setState((prev) => ({
        ...prev,
        expenses: [...prev.expenses, ...data.data],
        hasMore: prev.expenses.length + data.data.length < data.total,
        isLoadingMore: false,
        offset: prev.expenses.length + data.data.length,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load more expenses";
      setState((prev) => ({ ...prev, isLoadingMore: false, error: errorMessage }));
      console.error("Error loading more expenses:", error);
    }
  }, [state.isLoadingMore, state.hasMore, state.offset, limit]);

  const deleteExpense = useCallback(async (expenseId: string): Promise<DeleteExpenseResult> => {
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return { success: false, error: "Unauthorized" };
        }
        if (response.status === 404) {
          // Remove from local state even if not found on server
          setState((prev) => ({
            ...prev,
            expenses: prev.expenses.filter((exp) => exp.id !== expenseId),
          }));
          return { success: true };
        }
        throw new Error(`Failed to delete expense: ${response.statusText}`);
      }

      // Remove from local state
      setState((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((exp) => exp.id !== expenseId),
      }));

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent("expense-deleted", { detail: { expenseId } }));

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete expense";
      console.error("Error deleting expense:", error);
      return { success: false, error: errorMessage };
    }
  }, []);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: "0",
        sort: "expense_date.desc",
      });

      const response = await fetch(`/api/expenses?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(`Failed to refresh expenses: ${response.statusText}`);
      }

      const data: ExpenseListDTO = await response.json();
      setState({
        expenses: data.data,
        hasMore: data.data.length < data.total,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        offset: data.data.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to refresh expenses";
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      console.error("Error refreshing expenses:", error);
    }
  }, [limit]);

  // Listen for expense-deleted events from other components
  useEffect(() => {
    const handleExpenseDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ expenseId: string }>;
      setState((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((exp) => exp.id !== customEvent.detail.expenseId),
      }));
    };

    window.addEventListener("expense-deleted", handleExpenseDeleted);
    return () => window.removeEventListener("expense-deleted", handleExpenseDeleted);
  }, []);

  return {
    ...state,
    loadMore,
    deleteExpense,
    refresh,
  };
}
