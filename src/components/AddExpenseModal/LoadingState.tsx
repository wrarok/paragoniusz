import { Skeleton } from '@/components/ui/skeleton';
import type { LoadingStateProps } from '../../types/modal.types';

/**
 * LoadingState Component
 * Displays skeleton loaders while fetching user profile data
 */
export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label={message}>
      <p className="text-sm text-muted-foreground text-center mb-4">{message}</p>
      
      {/* Skeleton for action buttons */}
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}