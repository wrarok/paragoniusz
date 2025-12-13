import { AIConsentModal } from '../AIConsentModal';

type ConsentStepProps = {
  onAccept: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
};

/**
 * Consent step - displays AI consent modal
 */
export function ConsentStep({ onAccept, onCancel, isLoading }: ConsentStepProps) {
  return (
    <AIConsentModal
      isOpen={true}
      onAccept={onAccept}
      onCancel={onCancel}
      isLoading={isLoading}
    />
  );
}