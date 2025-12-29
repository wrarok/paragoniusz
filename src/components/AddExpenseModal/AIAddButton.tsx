import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AIAddButtonProps } from "../../types/modal.types";

/**
 * AIAddButton Component
 * Button that navigates to the AI receipt scanning flow
 * Feature flag checking is handled by parent component (ActionButtons)
 */
export function AIAddButton({ onClick, disabled = false }: AIAddButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-auto py-4 px-6 flex flex-col items-center gap-2 hover:bg-accent"
      variant="outline"
    >
      <div className="flex items-center gap-3 w-full">
        <div className="rounded-full bg-primary/10 p-2">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold">Zeskanuj paragon (AI)</div>
          <div className="text-xs text-muted-foreground">Pozwól AI wydobyć wydatki z paragonu</div>
        </div>
      </div>
    </Button>
  );
}
