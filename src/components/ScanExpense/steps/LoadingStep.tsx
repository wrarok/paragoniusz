import { Card, CardContent } from "@/components/ui/card";

/**
 * Loading step - displays a loading indicator while checking AI consent
 */
export function LoadingStep() {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">Ładowanie...</p>
      </CardContent>
    </Card>
  );
}
