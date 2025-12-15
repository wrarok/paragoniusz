import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AddExpenseModalTriggerProps } from "../../types/modal.types";

/**
 * AddExpenseModalTrigger Component
 * Button component that opens the Add Expense Modal
 * Typically placed in the navigation bar as a prominent + button
 */
export function AddExpenseModalTrigger({
  className,
  variant = "default",
  size = "icon",
  onClick,
}: AddExpenseModalTriggerProps & { onClick: () => void }) {
  return (
    <Button onClick={onClick} variant={variant} size={size} className={className} aria-label="Add new expense">
      <Plus className="h-5 w-5" aria-hidden="true" />
    </Button>
  );
}
