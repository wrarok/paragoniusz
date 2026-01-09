import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ErrorTipsProps {
  tips: string[];
}

/**
 * Error tips component
 * Shows helpful tips to improve success rate (e.g., for timeout errors)
 */
export function ErrorTips({ tips }: ErrorTipsProps) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <p className="font-medium mb-1">Wskazówki dla lepszych rezultatów:</p>
        <ul className="list-disc list-inside space-y-0.5 text-sm">
          {tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
