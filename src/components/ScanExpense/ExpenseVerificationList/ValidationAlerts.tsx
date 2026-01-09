import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ValidationResult } from "@/components/hooks/useExpenseValidation";

interface ValidationAlertsProps {
  validation: ValidationResult;
}

export function ValidationAlerts({ validation }: ValidationAlertsProps) {
  if (validation.isValid) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          Wszystkie wydatki są prawidłowe i gotowe do zapisania
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <p className="font-medium mb-1">Napraw następujące problemy:</p>
        <ul className="list-disc list-inside space-y-0.5">
          {validation.errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
