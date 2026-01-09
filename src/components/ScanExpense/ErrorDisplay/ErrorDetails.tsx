interface ErrorDetailsProps {
  details: unknown;
}

/**
 * Error technical details component
 * Shows collapsible technical error information
 */
export function ErrorDetails({ details }: ErrorDetailsProps) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Szczegóły techniczne</summary>
      <pre className="mt-2 p-3 bg-muted rounded-md overflow-x-auto text-xs">{JSON.stringify(details, null, 2)}</pre>
    </details>
  );
}
