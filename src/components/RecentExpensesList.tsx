import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';
import { ExpenseCard } from './ExpenseCard';
import { useExpenseList } from './hooks/useExpenseList';
import type { ExpenseListDTO } from '../types';

interface RecentExpensesListProps {
  initialData?: ExpenseListDTO;
  limit?: number;
}

export function RecentExpensesList({ initialData, limit = 10 }: RecentExpensesListProps) {
  const { expenses, hasMore, isLoading, isLoadingMore, error, loadMore, deleteExpense } =
    useExpenseList({ initialData, limit });

  const handleDelete = useCallback(
    async (expenseId: string) => {
      const result = await deleteExpense(expenseId);
      if (!result.success && result.error) {
        // Error is already logged in the hook
        alert(`Failed to delete expense: ${result.error}`);
      }
    },
    [deleteExpense]
  );

  const handleEdit = useCallback((expenseId: string) => {
    window.location.href = `/expenses/${expenseId}/edit`;
  }, []);

  const handleAddExpense = useCallback(() => {
    // TODO: Navigate to add expense page when implemented
    console.log('Navigate to add expense page');
  }, []);

  if (isLoading) {
    return <SkeletonLoader variant="list" count={5} />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive" role="alert">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            message="Start tracking your expenses by adding your first one"
            ctaText="Add Your First Expense"
            onCtaClick={handleAddExpense}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Expenses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {expenses.map((expense) => (
          <ExpenseCard key={expense.id} expense={expense} onDelete={handleDelete} onEdit={handleEdit} />
        ))}
        {hasMore && (
          <div className="pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading...' : 'Show More'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}