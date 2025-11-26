import { useEffect, useCallback } from 'react';

/**
 * Hook that listens for expense-deleted events and triggers a refresh callback
 * This allows dashboard components to automatically update when expenses are deleted
 */
export function useDashboardRefresh(onRefresh: () => void | Promise<void>) {
  const handleExpenseDeleted = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  useEffect(() => {
    window.addEventListener('expense-deleted', handleExpenseDeleted);
    return () => window.removeEventListener('expense-deleted', handleExpenseDeleted);
  }, [handleExpenseDeleted]);
}