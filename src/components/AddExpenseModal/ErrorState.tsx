import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ErrorStateProps } from '../../types/modal.types';

/**
 * ErrorState Component
 * Displays error messages with appropriate actions based on error type
 */
export function ErrorState({ error, onRetry, onClose }: ErrorStateProps) {
  const isRetryable = error.error.code === 'INTERNAL_ERROR' || error.error.code === 'NETWORK_ERROR';

  return (
    <div className="space-y-4" role="alert" aria-live="assertive">
      {/* Error Icon and Message */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
        </div>
        
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">
            {error.error.code === 'PROFILE_NOT_FOUND' 
              ? 'Profile Not Found' 
              : error.error.code === 'NETWORK_ERROR'
              ? 'Connection Error'
              : 'Something Went Wrong'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {error.error.message}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        {isRetryable && onRetry && (
          <Button 
            onClick={onRetry}
            className="w-full"
            variant="default"
          >
            Try Again
          </Button>
        )}
        
        <Button 
          onClick={onClose}
          className="w-full"
          variant={isRetryable ? 'outline' : 'default'}
        >
          Close
        </Button>

        {error.error.code === 'PROFILE_NOT_FOUND' && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            If this issue persists, please contact support.
          </p>
        )}
      </div>
    </div>
  );
}