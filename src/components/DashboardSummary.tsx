import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonLoader } from "./SkeletonLoader";
import { useDashboardSummary } from "./hooks/useDashboardSummary";
import { useDashboardRefresh } from "./hooks/useDashboardRefresh";
import type { DashboardSummaryDTO } from "../types";

interface DashboardSummaryProps {
  initialData?: DashboardSummaryDTO;
  month?: string; // YYYY-MM format
}

export function DashboardSummary({ initialData, month }: DashboardSummaryProps) {
  const { summary, isLoading, error, refresh } = useDashboardSummary({ initialData, month });

  // Listen for expense-deleted events and refresh
  useDashboardRefresh(refresh);

  if (isLoading) {
    return <SkeletonLoader variant="summary" />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie miesięczne</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive" role="alert">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const formattedAmount = parseFloat(summary.total_amount).toFixed(2);
  const monthDisplay = new Date(summary.period.from_date).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-muted-foreground">{monthDisplay}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-4xl font-bold tracking-tight">
            {formattedAmount}
            <span className="ml-2 text-2xl font-normal text-muted-foreground">{summary.currency}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-medium"
            style={{
              backgroundColor: "hsl(var(--muted))",
              color: "hsl(var(--foreground))",
            }}
          >
            {summary.expense_count}{" "}
            {summary.expense_count === 1 ? "wydatek" : summary.expense_count < 5 ? "wydatki" : "wydatków"}
          </span>
          {summary.ai_metrics.ai_created_count > 0 && (
            <span
              className="inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-medium"
              style={{
                backgroundColor: "hsl(var(--primary) / 0.1)",
                color: "hsl(var(--primary))",
              }}
              title={`${summary.ai_metrics.ai_created_percentage.toFixed(0)}% utworzonych przez AI`}
            >
              {summary.ai_metrics.ai_created_count} z AI
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
