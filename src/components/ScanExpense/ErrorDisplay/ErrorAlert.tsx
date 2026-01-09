import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ErrorAlertProps {
  variant: "default" | "destructive";
  description: string;
}

/**
 * Error alert component
 * Displays the main error message in an alert box
 */
export function ErrorAlert({ variant, description }: ErrorAlertProps) {
  return (
    <Alert variant={variant}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Szczegóły błędu</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
