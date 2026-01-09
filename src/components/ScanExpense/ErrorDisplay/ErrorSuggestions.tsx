import type { ErrorConfig } from "@/lib/config/error-messages.config";

interface ErrorSuggestionsProps {
  actions: ErrorConfig["actions"];
}

/**
 * Error suggestions component
 * Shows a list of suggested actions the user can take
 */
export function ErrorSuggestions({ actions }: ErrorSuggestionsProps) {
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p className="font-medium">Co możesz zrobić:</p>
      <ul className="list-disc list-inside space-y-1 ml-2">
        {actions.retry && <li>Spróbuj przesłać paragon ponownie z wyraźniejszym obrazem</li>}
        {actions.manual && <li>Dodaj wydatki ręcznie bez pomocy AI</li>}
        <li>Wróć do panelu głównego i spróbuj ponownie później</li>
      </ul>
    </div>
  );
}
