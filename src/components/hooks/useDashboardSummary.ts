import { useState, useEffect } from "react";
import type { DashboardSummaryDTO } from "../../types";
import type { DashboardState } from "../../types/dashboard.types";

interface UseDashboardSummaryOptions {
  initialData?: DashboardSummaryDTO;
  month?: string; // YYYY-MM format
}

export function useDashboardSummary({ initialData, month }: UseDashboardSummaryOptions = {}) {
  const [state, setState] = useState<DashboardState>({
    summary: initialData || null,
    isLoading: !initialData,
    error: null,
  });

  useEffect(() => {
    const fetchSummary = async () => {
      if (initialData && !month) {
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const params = new URLSearchParams();
        if (month) {
          params.append("month", month);
        }

        const url = `/api/dashboard/summary${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }
          throw new Error(`Failed to fetch dashboard summary: ${response.statusText}`);
        }

        const data: DashboardSummaryDTO = await response.json();
        setState({ summary: data, isLoading: false, error: null });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard summary";
        setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
        console.error("Error fetching dashboard summary:", error);
      }
    };

    fetchSummary();
  }, [month, initialData]);

  const refresh = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = new URLSearchParams();
      if (month) {
        params.append("month", month);
      }

      const url = `/api/dashboard/summary${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(`Failed to fetch dashboard summary: ${response.statusText}`);
      }

      const data: DashboardSummaryDTO = await response.json();
      setState({ summary: data, isLoading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard summary";
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      console.error("Error refreshing dashboard summary:", error);
    }
  };

  return {
    ...state,
    refresh,
  };
}
