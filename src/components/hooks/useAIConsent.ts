import { useState, useCallback } from "react";
import { checkAIConsent, grantAIConsent } from "@/lib/services/scan-flow.service";
import type { APIErrorResponse } from "@/types";

/**
 * Hook for managing user AI consent
 *
 * Handles checking and granting AI consent
 */
export function useAIConsent() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIErrorResponse | null>(null);

  /**
   * Check if user has granted AI consent
   *
   * @returns true if consent granted, false otherwise
   */
  const checkConsent = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const profile = await checkAIConsent();
      setHasConsent(profile.ai_consent_given);
      return profile.ai_consent_given;
    } catch (err) {
      const apiError = err as APIErrorResponse;
      setError(apiError);
      console.error("Error checking AI consent:", apiError);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Grant AI consent
   *
   * @returns true if consent granted successfully, false on error
   */
  const grantConsent = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const profile = await grantAIConsent();
      setHasConsent(profile.ai_consent_given);
      return true;
    } catch (err) {
      const apiError = err as APIErrorResponse;
      setError(apiError);
      console.error("Error granting AI consent:", apiError);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Reset error for retry
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    /** User has granted AI consent (null = not checked yet) */
    hasConsent,
    /** Operation in progress */
    isLoading,
    /** API error (if occurred) */
    error,
    /** Check consent status */
    checkConsent,
    /** Grant AI consent */
    grantConsent,
    /** Reset error */
    resetError,
  };
}
