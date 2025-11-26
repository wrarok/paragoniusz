import type { ActionButtonsProps } from '../../types/modal.types';
import { ManualAddButton } from './ManualAddButton';
import { AIAddButton } from './AIAddButton';
import { ConsentInfoMessage } from './ConsentInfoMessage';

/**
 * ActionButtons Component
 * Container for action buttons that allow users to select expense addition method
 * Conditionally renders AI button based on user's consent status
 */
export function ActionButtons({ profile, onSelectManual, onSelectAI }: ActionButtonsProps) {
  const hasAIConsent = profile.ai_consent_given;

  return (
    <div className="space-y-3">
      {/* Manual Add Button - Always visible */}
      <ManualAddButton onClick={onSelectManual} />

      {/* AI Add Button - Only visible with consent */}
      {hasAIConsent && <AIAddButton onClick={onSelectAI} />}

      {/* Consent Info Message - Only visible without consent */}
      {!hasAIConsent && (
        <ConsentInfoMessage 
          onNavigateToSettings={() => {
            window.location.href = '/settings';
          }} 
        />
      )}
    </div>
  );
}