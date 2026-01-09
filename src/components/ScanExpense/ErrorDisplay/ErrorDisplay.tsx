import { Card } from "@/components/ui/card";
import { ErrorHeader } from "./ErrorHeader";
import { ErrorContent } from "./ErrorContent";
import { ErrorActions } from "./ErrorActions";
import { getErrorConfig } from "@/lib/config/error-messages.config";
import type { APIErrorResponse } from "@/types";

interface ErrorDisplayProps {
  error: APIErrorResponse;
  onRetry: () => void;
  onAddManually: () => void;
  onCancel: () => void;
}

/**
 * Error display component (Refactored)
 *
 * Displays error information in a structured format with:
 * - Error icon and title
 * - Detailed error message
 * - Technical details (collapsible)
 * - Suggested actions
 * - Optional tips for improvement
 *
 * This component uses Strategy Pattern with centralized configuration
 * to eliminate the large switch statement and improve maintainability.
 *
 * **Refactoring Summary:**
 * - Original: 206 LOC with giant switch statement
 * - Refactored: ~50 LOC with composition of smaller components
 * - Benefits: Better testability, easier to add new error types, reusable sub-components
 */
export function ErrorDisplay({ error, onRetry, onAddManually, onCancel }: ErrorDisplayProps) {
  // Get error configuration from centralized config
  // Supports custom message override for validation errors
  const config = getErrorConfig(error.error.code, error.error.message);
  const Icon = config.icon;

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="error-display">
      <ErrorHeader icon={Icon} title={config.title} />
      <ErrorContent config={config} error={error} />
      <ErrorActions config={config} onRetry={onRetry} onAddManually={onAddManually} onCancel={onCancel} />
    </Card>
  );
}
