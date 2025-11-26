import { useAddExpenseModal } from '../hooks/useAddExpenseModal';
import { AddExpenseModal } from './AddExpenseModal';
import { AddExpenseModalTrigger } from './AddExpenseModalTrigger';

/**
 * AddExpenseModalContainer Component
 * Container component that combines the trigger button and modal
 * Manages all state through the useAddExpenseModal hook
 */
export function AddExpenseModalContainer() {
  const {
    isOpen,
    isLoading,
    error,
    profile,
    openModal,
    closeModal,
    selectManual,
    selectAI,
    retry,
  } = useAddExpenseModal();

  return (
    <>
      <AddExpenseModalTrigger onClick={openModal} />
      <AddExpenseModal
        isOpen={isOpen}
        onOpenChange={closeModal}
        onSelectManual={selectManual}
        onSelectAI={selectAI}
        isLoading={isLoading}
        error={error}
        profile={profile}
        onRetry={retry}
        onClose={closeModal}
      />
    </>
  );
}

// Export individual components for flexibility
export { AddExpenseModal } from './AddExpenseModal';
export { AddExpenseModalTrigger } from './AddExpenseModalTrigger';
export { LoadingState } from './LoadingState';
export { ErrorState } from './ErrorState';
export { ActionButtons } from './ActionButtons';
export { ManualAddButton } from './ManualAddButton';
export { AIAddButton } from './AIAddButton';
export { ConsentInfoMessage } from './ConsentInfoMessage';