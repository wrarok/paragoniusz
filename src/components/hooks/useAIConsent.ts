import { useState, useCallback } from "react";
import { checkAIConsent, grantAIConsent } from "@/lib/services/scan-flow.service";
import type { APIErrorResponse } from "@/types";

/**
 * Hook do zarządzania zgodą AI użytkownika
 *
 * Obsługuje sprawdzanie i udzielanie zgody na przetwarzanie AI
 */
export function useAIConsent() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIErrorResponse | null>(null);

  /**
   * Sprawdź czy użytkownik ma udzieloną zgodę AI
   *
   * @returns true jeśli zgoda została udzielona, false w przeciwnym razie
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
   * Udziel zgody AI
   *
   * @returns true jeśli zgoda została pomyślnie udzielona, false w przypadku błędu
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
   * Resetuj błąd (opcjonalne, do obsługi retry)
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    /** Czy użytkownik ma udzieloną zgodę AI (null = nie sprawdzono jeszcze) */
    hasConsent,
    /** Czy operacja jest w trakcie wykonywania */
    isLoading,
    /** Błąd API (jeśli wystąpił) */
    error,
    /** Sprawdź status zgody */
    checkConsent,
    /** Udziel zgody AI */
    grantConsent,
    /** Resetuj błąd */
    resetError,
  };
}
