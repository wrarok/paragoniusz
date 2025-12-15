import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { FormErrorMessageProps } from "../../types/auth.types";

/**
 * Form-level error message component
 */
export function FormErrorMessage({ error, className = "" }: FormErrorMessageProps) {
  if (!error) {
    return null;
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
