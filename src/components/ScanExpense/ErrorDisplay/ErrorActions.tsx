import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { RefreshCw, PlusCircle, X } from "lucide-react";
import type { ErrorConfig } from "@/lib/config/error-messages.config";

interface ErrorActionsProps {
  config: ErrorConfig;
  onRetry: () => void;
  onAddManually: () => void;
  onCancel: () => void;
}

/**
 * Error actions component
 * Renders action buttons based on error configuration
 */
export function ErrorActions({ config, onRetry, onAddManually, onCancel }: ErrorActionsProps) {
  return (
    <CardFooter className="flex flex-col sm:flex-row gap-3">
      {config.actions.cancel && (
        <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto" data-testid="error-cancel-button">
          <X className="h-4 w-4 mr-2" />
          Anuluj
        </Button>
      )}
      {config.actions.manual && (
        <Button
          variant="outline"
          onClick={onAddManually}
          className="w-full sm:flex-1"
          data-testid="error-manual-button"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Dodaj ręcznie
        </Button>
      )}
      {config.actions.retry && (
        <Button onClick={onRetry} className="w-full sm:flex-1" data-testid="error-retry-button">
          <RefreshCw className="h-4 w-4 mr-2" />
          Spróbuj ponownie
        </Button>
      )}
    </CardFooter>
  );
}
