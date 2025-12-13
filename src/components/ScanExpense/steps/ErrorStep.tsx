import { ErrorDisplay } from '../ErrorDisplay';
import type { APIErrorResponse } from '@/types';

type ErrorStepProps = {
  error: APIErrorResponse;
  onRetry: () => void;
  onAddManually: () => void;
  onCancel: () => void;
};

/**
 * Error step - displays error message with retry/manual options
 */
export function ErrorStep({ error, onRetry, onAddManually, onCancel }: ErrorStepProps) {
  return (
    <ErrorDisplay
      error={error}
      onRetry={onRetry}
      onAddManually={onAddManually}
      onCancel={onCancel}
    />
  );
}