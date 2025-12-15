import { Card, CardContent } from "@/components/ui/card";

/**
 * Saving step - displays loading indicator while saving expenses
 */
export function SavingStep() {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="py-12 text-center space-y-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
        <div>
          <p className="text-lg font-medium">Zapisywanie wydatków...</p>
          <p className="text-sm text-muted-foreground mt-1">Proszę czekać...</p>
        </div>
      </CardContent>
    </Card>
  );
}
