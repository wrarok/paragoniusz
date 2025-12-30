/**
 * React hook for feature flags
 *
 * Provides a convenient way to check feature flags in React components.
 * This hook wraps the feature flags system for use in client-side components.
 */

import { useMemo } from "react";
import { isFeatureEnabled, type FeatureFlagKey } from "../../features/feature-flags";

/**
 * Hook to check if a feature flag is enabled
 *
 * @param flagKey - The feature flag key to check
 * @returns boolean indicating if the feature is enabled
 *
 * @example
 * ```tsx
 * const AIButton = () => {
 *   const isAIEnabled = useFeatureFlag('AI_RECEIPT_PROCESSING');
 *
 *   if (!isAIEnabled) return null;
 *
 *   return <button>Scan Receipt</button>;
 * };
 * ```
 */
export function useFeatureFlag(flagKey: FeatureFlagKey): boolean {
  return useMemo(() => {
    return isFeatureEnabled(flagKey);
  }, [flagKey]);
}

/**
 * Hook to check multiple feature flags at once
 *
 * @param flagKeys - Array of feature flag keys to check
 * @returns Object with flag keys as properties and boolean values
 *
 * @example
 * ```tsx
 * const Dashboard = () => {
 *   const flags = useFeatureFlags(['AI_RECEIPT_PROCESSING', 'ADVANCED_ANALYTICS']);
 *
 *   return (
 *     <div>
 *       {flags.AI_RECEIPT_PROCESSING && <ScanButton />}
 *       {flags.ADVANCED_ANALYTICS && <AnalyticsChart />}
 *     </div>
 *   );
 * };
 * ```
 */
export function useFeatureFlags(flagKeys: FeatureFlagKey[]): Record<FeatureFlagKey, boolean> {
  return useMemo(() => {
    const flags: Partial<Record<FeatureFlagKey, boolean>> = {};

    flagKeys.forEach((key) => {
      flags[key] = isFeatureEnabled(key);
    });

    return flags as Record<FeatureFlagKey, boolean>;
  }, [flagKeys]);
}

/**
 * Hook to check if AI features are ready
 * Convenience hook for AI-related components
 *
 * @returns boolean indicating if AI features are enabled
 */
export function useAIFeatures(): boolean {
  return useFeatureFlag("AI_RECEIPT_PROCESSING");
}

/**
 * Hook to check if advanced features are available
 * Convenience hook for advanced functionality
 *
 * @returns boolean indicating if any advanced features are enabled
 */
export function useAdvancedFeatures(): boolean {
  const flags = useFeatureFlags(["ADVANCED_PROFILE_FEATURES", "ADVANCED_ANALYTICS", "BATCH_OPERATIONS"]);

  return Object.values(flags).some(Boolean);
}
