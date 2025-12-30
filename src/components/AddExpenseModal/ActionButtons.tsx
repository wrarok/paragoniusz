import type { ActionButtonsProps } from "../../types/modal.types";
import { ManualAddButton } from "./ManualAddButton";
import { AIAddButton } from "./AIAddButton";
import { ConsentInfoMessage } from "./ConsentInfoMessage";
import { useAIFeatures } from "../hooks/useFeatureFlag";
import { AIFeatureDisabled } from "../FeatureDisabled";

/**
 * ActionButtons Component
 * Container for action buttons that allow users to select expense addition method
 * Conditionally renders AI button based on user's consent status and feature flags
 */
export function ActionButtons({ profile, onSelectManual, onSelectAI }: ActionButtonsProps) {
  const hasAIConsent = profile.ai_consent_given;
  const isAIEnabled = useAIFeatures();

  return (
    <div className="space-y-3">
      {/* Manual Add Button - Always visible */}
      <ManualAddButton onClick={onSelectManual} />

      {/* AI Add Button - Only visible with consent AND when AI features are enabled */}
      {isAIEnabled && hasAIConsent && <AIAddButton onClick={onSelectAI} />}

      {/* AI Feature Disabled Message - When AI features are disabled */}
      {!isAIEnabled && (
        <AIFeatureDisabled
          title="AI Scanning Unavailable"
          description="AI receipt processing is currently disabled"
          variant="alert"
          customMessage="AI features are currently disabled. You can add expenses manually using the button above."
        />
      )}

      {/* Consent Info Message - Only visible when AI is enabled but user hasn't given consent */}
      {isAIEnabled && !hasAIConsent && (
        <ConsentInfoMessage
          onNavigateToSettings={() => {
            window.location.href = "/settings";
          }}
        />
      )}
    </div>
  );
}
