import { PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ManualAddButtonProps } from '../../types/modal.types';

/**
 * ManualAddButton Component
 * Button that navigates to the manual expense entry form
 */
export function ManualAddButton({ onClick, disabled = false }: ManualAddButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full h-auto py-4 px-6 flex flex-col items-center gap-2 hover:bg-accent"
      variant="outline"
    >
      <div className="flex items-center gap-3 w-full">
        <div className="rounded-full bg-primary/10 p-2">
          <PencilLine className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold">Add Manually</div>
          <div className="text-xs text-muted-foreground">
            Enter expense details yourself
          </div>
        </div>
      </div>
    </Button>
  );
}