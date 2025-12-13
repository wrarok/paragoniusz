import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

/**
 * Complete step - displays success message after saving expenses
 */
export function CompleteStep() {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="py-12 text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <div>
          <p className="text-lg font-medium">Wydatki zostały zapisane pomyślnie!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Przekierowywanie do panelu głównego...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}