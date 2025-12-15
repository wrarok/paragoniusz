import { useState, useEffect } from "react";
import type { ProfileDTO, APIErrorResponse } from "../../types";
import type { ProfileState } from "../../types/settings.types";

/**
 * Custom hook for fetching and managing user profile data
 * Fetches profile from GET /api/profiles/me on mount
 */
export function useProfile() {
  const [state, setState] = useState<ProfileState>({
    profile: null,
    isLoading: true,
    error: null,
  });

  const fetchProfile = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch("/api/profiles/me");

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login on unauthorized
          window.location.assign("/login");
          return;
        }

        const errorData: APIErrorResponse = await response.json();
        setState({
          profile: null,
          isLoading: false,
          error: errorData.error.message || "Failed to load profile",
        });
        return;
      }

      const profile: ProfileDTO = await response.json();
      setState({
        profile,
        isLoading: false,
        error: null,
      });
    } catch {
      setState({
        profile: null,
        isLoading: false,
        error: "Unable to load profile. Please check your connection.",
      });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile: state.profile,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchProfile,
  };
}
