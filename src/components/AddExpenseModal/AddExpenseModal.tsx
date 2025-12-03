import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AddExpenseModalProps } from '../../types/modal.types';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { ActionButtons } from './ActionButtons';

/**
 * AddExpenseModal Component
 * Main modal container that manages the expense addition method selection
 * Fetches user profile to determine AI consent status and displays appropriate action buttons
 */
export function AddExpenseModal({
  isOpen,
  onOpenChange,
  onSelectManual,
  onSelectAI,
  isLoading,
  error,
  profile,
  onRetry,
  onClose,
}: AddExpenseModalProps & {
  isLoading: boolean;
  error: any;
  profile: any;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        aria-describedby="add-expense-description"
      >
        <DialogHeader>
          <DialogTitle>Dodaj wydatek</DialogTitle>
          <p id="add-expense-description" className="sr-only">
            Wybierz sposób dodawania wydatku: ręcznie lub skanując paragon z pomocą AI
          </p>
        </DialogHeader>

        <div className="py-4">
          {/* Loading State */}
          {isLoading && <LoadingState message="Ładowanie profilu..." />}

          {/* Error State */}
          {!isLoading && error && (
            <ErrorState 
              error={error} 
              onRetry={onRetry}
              onClose={onClose}
            />
          )}

          {/* Success State - Action Buttons */}
          {!isLoading && !error && profile && (
            <ActionButtons
              profile={profile}
              onSelectManual={onSelectManual}
              onSelectAI={onSelectAI}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}