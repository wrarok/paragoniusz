import { useMemo, useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonLoader } from "./SkeletonLoader";
import { useDashboardRefresh } from "./hooks/useDashboardRefresh";
import type { CategorySummaryDTO, DashboardSummaryDTO } from "../types";
import type { PieChartDataPoint } from "../types/dashboard.types";

interface ExpensePieChartProps {
  categories: CategorySummaryDTO[];
  isLoading?: boolean;
}

// Predefined color palette for categories
const COLORS = [
  "#f59e0b", // Amber
  "#3b82f6", // Blue
  "#10b981", // Green
  "#8b5cf6", // Purple
  "#ef4444", // Red
  "#6b7280", // Gray for "Other" category
];

export function ExpensePieChart({
  categories: initialCategories,
  isLoading: initialLoading = false,
}: ExpensePieChartProps) {
  const [categories, setCategories] = useState<CategorySummaryDTO[]>(initialCategories);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard summary to get updated categories
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dashboard/summary");

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error(`Failed to fetch dashboard summary: ${response.statusText}`);
      }

      const data: DashboardSummaryDTO = await response.json();
      setCategories(data.categories);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load chart data";
      setError(errorMessage);
      console.error("Error fetching categories:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for expense-deleted events and refresh
  useDashboardRefresh(fetchCategories);

  // Update categories when initial props change
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const chartData = useMemo<PieChartDataPoint[]>(() => {
    if (!categories || categories.length === 0) {
      return [];
    }

    return categories.map((category, index) => ({
      name: category.category_name,
      value: parseFloat(category.amount),
      percentage: category.percentage,
      color: COLORS[index % COLORS.length],
      categoryId: category.category_id,
    }));
  }, [categories]);

  if (isLoading) {
    return <SkeletonLoader variant="chart" />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rozkład wydatków</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-destructive" role="alert">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rozkład wydatków</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">Brak danych o wydatkach</div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { payload: PieChartDataPoint }[];
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PieChartDataPoint;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value.toFixed(2)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: { payload?: { value: string; color: string }[] }) => {
    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload?.map((entry, index: number) => (
          <li key={`legend-${index}`} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-sm text-muted-foreground">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rozkład wydatków</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry: unknown) => {
                const data = entry as PieChartDataPoint;
                return `${data.percentage.toFixed(0)}%`;
              }}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
