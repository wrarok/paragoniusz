import { useState, useEffect, useCallback } from 'react';
import type { APIErrorResponse, ProfileDTO } from '../../types';

/**
 * Custom hook for managing Add Expense Modal state
 * Handles modal open/close, profile fetching, loading, and error states
 */
export function useAddExpenseModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIErrorResponse | null>(null);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);

  /**
   * Fetch user profile from API
   * Called automatically when modal opens
   */
  const fetchProfile = useCallback(async () => {
    // If profile is already cached, don't refetch
    if (profile) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/profiles/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Handle different error status codes
        if (response.status === 401) {
          // Unauthorized - redirect to login
          window.location.href = '/login';
          return;
        }

        // Parse error response
        const errorData: APIErrorResponse = await response.json();
        setError(errorData);
        setIsLoading(false);
        return;
      }

      const profileData: ProfileDTO = await response.json();
      setProfile(profileData);
      setError(null);
    } catch (err) {
      // Network error or other unexpected error
      setError({
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to connect to server. Please check your internet connection and try again.',
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  /**
   * Effect to fetch profile when modal opens
   */
  useEffect(() => {
    if (isOpen && !profile && !isLoading) {
      fetchProfile();
    }
  }, [isOpen, profile, isLoading, fetchProfile]);

  /**
   * Open the modal
   */
  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * Close the modal and clear error state
   */
  const closeModal = useCallback(() => {
    setIsOpen(false);
    setError(null);
  }, []);

  /**
   * Handle manual expense entry selection
   * Closes modal and navigates to manual form
   */
  const selectManual = useCallback(() => {
    closeModal();
    // Navigate to manual expense form
    window.location.href = '/expenses/new';
  }, [closeModal]);

  /**
   * Handle AI receipt scan selection
   * Closes modal and navigates to scan flow
   */
  const selectAI = useCallback(() => {
    closeModal();
    // Navigate to AI receipt scan flow
    window.location.href = '/expenses/scan';
  }, [closeModal]);

  /**
   * Retry profile fetch after error
   */
  const retry = useCallback(() => {
    setError(null);
    setProfile(null); // Clear cache to force refetch
    fetchProfile();
  }, [fetchProfile]);

  return {
    isOpen,
    isLoading,
    error,
    profile,
    openModal,
    closeModal,
    selectManual,
    selectAI,
    retry,
  };
}