import { CardContent } from "@/components/ui/card";
import { ErrorAlert } from "./ErrorAlert";
import { ErrorDetails } from "./ErrorDetails";
import { ErrorSuggestions } from "./ErrorSuggestions";
import { ErrorTips } from "./ErrorTips";
import type { ErrorConfig } from "@/lib/config/error-messages.config";
import type { APIErrorResponse } from "@/types";

interface ErrorContentProps {
  config: ErrorConfig;
  error: APIErrorResponse;
}

/**
 * Error content component
 * Orchestrates display of error information including alert, details, suggestions, and tips
 */
export function ErrorContent({ config, error }: ErrorContentProps) {
  return (
    <CardContent className="space-y-4">
      <ErrorAlert variant={config.variant} description={config.description} />

      {error.error.details && <ErrorDetails details={error.error.details} />}

      <ErrorSuggestions actions={config.actions} />

      {config.tips && <ErrorTips tips={config.tips} />}
    </CardContent>
  );
}
