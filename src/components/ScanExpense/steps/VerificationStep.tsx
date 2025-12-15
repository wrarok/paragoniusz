import { Card, CardContent } from "@/components/ui/card";
import { ExpenseVerificationForm } from "../ExpenseVerificationForm";
import type { ExpenseVerificationFormValues } from "@/lib/validation/expense-verification.validation";
import type { CategoryDTO } from "@/types";

interface VerificationStepProps {
  defaultValues: ExpenseVerificationFormValues;
  categories: CategoryDTO[];
  onSubmit: (data: ExpenseVerificationFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * Verification step - displays form to verify and edit AI-extracted expenses
 */
export function VerificationStep({ defaultValues, categories, onSubmit, onCancel }: VerificationStepProps) {
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent className="pt-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Zweryfikuj wydatki</h2>
          <p className="text-muted-foreground">Sprawdź i edytuj wydatki wyodrębnione z paragonu przed zapisaniem</p>
        </div>

        <ExpenseVerificationForm
          defaultValues={defaultValues}
          categories={categories}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </CardContent>
    </Card>
  );
}
