import { useState } from "react";
import { MoreVertical, Pencil, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ExpenseDTO } from "../types";

interface ExpenseCardProps {
  expense: ExpenseDTO;
  onDelete: (expenseId: string) => Promise<void>;
  onEdit?: (expenseId: string) => void;
}

export function ExpenseCard({ expense, onDelete, onEdit }: ExpenseCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(expense.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete expense:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = new Date(expense.expense_date).toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedAmount = parseFloat(expense.amount).toFixed(2);

  return (
    <>
      <div
        data-testid="expense-card"
        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span
              data-testid="expense-category"
              className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
              style={{
                backgroundColor: "hsl(var(--muted))",
                color: "hsl(var(--foreground))",
              }}
            >
              {expense.category.name}
            </span>
            {expense.created_by_ai && (
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
                style={{
                  backgroundColor: "hsl(var(--primary) / 0.1)",
                  color: "hsl(var(--primary))",
                }}
                title="Utworzone przez AI"
              >
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                AI
              </span>
            )}
            {expense.was_ai_suggestion_edited && (
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
                style={{
                  backgroundColor: "hsl(var(--secondary) / 0.5)",
                  color: "hsl(var(--secondary-foreground))",
                }}
                title="Sugestia AI została edytowana"
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
                Edytowane
              </span>
            )}
          </div>
          <p data-testid="expense-date" className="text-sm text-muted-foreground">
            {formattedDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-lg font-bold">
              {formattedAmount} {expense.currency}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Więcej opcji" data-testid="expense-menu-trigger">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(expense.id)} data-testid="expense-edit-button">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
                data-testid="expense-delete-button"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń wydatek</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć ten wydatek? Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
