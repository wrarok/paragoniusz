/**
 * Feature Flags System
 *
 * Universal TypeScript module for managing feature flags
 * across different environments (local, integration, production).
 *
 * Flags are static (build time) and global per environment.
 * Environment takes precedence over flags.
 */

// Feature flag types
export type FeatureFlagKey =
  | "AI_RECEIPT_PROCESSING"
  | "BATCH_OPERATIONS"
  | "ADVANCED_PROFILE_FEATURES"
  | "ADVANCED_ANALYTICS";

// Environment types
export type Environment = "local" | "integration" | "production";

// Feature flags configuration per environment
type FeatureFlagsConfig = Record<FeatureFlagKey, boolean>;

// Configuration for all environments
type EnvironmentConfig = Record<Environment, FeatureFlagsConfig>;

/**
 * Feature flags configuration for all environments
 *
 * Strategy per environment:
 * - local: All flags enabled for development
 * - integration: Test flags enabled, production flags disabled
 * - production: Only stable flags enabled
 */
const FEATURE_FLAGS_CONFIG: EnvironmentConfig = {
  local: {
    AI_RECEIPT_PROCESSING: true,
    BATCH_OPERATIONS: true,
    ADVANCED_PROFILE_FEATURES: true,
    ADVANCED_ANALYTICS: true,
  },
  integration: {
    AI_RECEIPT_PROCESSING: true,
    BATCH_OPERATIONS: true,
    ADVANCED_PROFILE_FEATURES: false,
    ADVANCED_ANALYTICS: true,
  },
  production: {
    AI_RECEIPT_PROCESSING: false,
    BATCH_OPERATIONS: false,
    ADVANCED_PROFILE_FEATURES: false,
    ADVANCED_ANALYTICS: false,
  },
};

/**
 * Gets AI features override from environment variable
 * This allows runtime control of AI features via ENABLE_AI_FEATURES env var
 *
 * @returns true/false if override is set, null if not set
 */
function getAIFeaturesOverride(): boolean | null {
  let enableAI: string | undefined;

  try {
    // For client-side (browser) - requires PUBLIC_ prefix in Astro
    enableAI = import.meta.env?.PUBLIC_ENABLE_AI_FEATURES || import.meta.env?.ENABLE_AI_FEATURES;

    // For server-side - fallback to process.env
    if (!enableAI && typeof process !== "undefined" && process.env) {
      enableAI = process.env.ENABLE_AI_FEATURES;
    }
  } catch (error) {
    console.warn("[FeatureFlags] Could not access ENABLE_AI_FEATURES variable:", error);
  }

  if (!enableAI) {
    return null;
  }

  // Parse boolean value
  const normalizedValue = enableAI.toLowerCase().trim();
  if (normalizedValue === "true" || normalizedValue === "1") {
    return true;
  }
  if (normalizedValue === "false" || normalizedValue === "0") {
    return false;
  }

  console.warn(`[FeatureFlags] Invalid ENABLE_AI_FEATURES value: ${enableAI}. Use "true" or "false".`);
  return null;
}

/**
 * Gets current environment from ENV_NAME variable
 * Fallback to null if variable is not set
 *
 * Note: In browser context, only PUBLIC_ prefixed env vars are available
 * For server-side, both import.meta.env and process.env are checked
 */
function getCurrentEnvironment(): Environment | null {
  let envName: string | undefined;

  // Try different ways to access environment variables
  try {
    // For client-side (browser) - requires PUBLIC_ prefix in Astro
    envName = import.meta.env?.PUBLIC_ENV_NAME || import.meta.env?.ENV_NAME;

    // For server-side - fallback to process.env
    if (!envName && typeof process !== "undefined" && process.env) {
      envName = process.env.ENV_NAME;
    }
  } catch (error) {
    // Fallback for environments where import.meta or process are not available
    console.warn("[FeatureFlags] Could not access environment variables:", error);
  }

  if (!envName) {
    return null;
  }

  // Environment validation
  const validEnvironments: Environment[] = ["local", "integration", "production"];
  if (validEnvironments.includes(envName as Environment)) {
    return envName as Environment;
  }

  console.warn(`[FeatureFlags] Unknown environment: ${envName}. Available: ${validEnvironments.join(", ")}`);
  return null;
}

/**
 * Checks if a feature flag is enabled
 *
 * @param flagKey - Feature flag key
 * @returns true if flag is enabled, false otherwise
 *
 * Logic:
 * 1. For AI_RECEIPT_PROCESSING: Check ENABLE_AI_FEATURES override first
 * 2. If ENV_NAME is null -> return false
 * 3. If environment unknown -> return false
 * 4. Return flag value for given environment
 */
export function isFeatureEnabled(flagKey: FeatureFlagKey): boolean {
  // Check for AI features override (ENABLE_AI_FEATURES env var)
  if (flagKey === "AI_RECEIPT_PROCESSING") {
    const aiOverride = getAIFeaturesOverride();
    if (aiOverride !== null) {
      console.log(`[FeatureFlags] ${flagKey}: ${aiOverride} (ENABLE_AI_FEATURES override)`);
      return aiOverride;
    }
  }

  const environment = getCurrentEnvironment();

  // If ENV_NAME is null, set flag to false
  if (!environment) {
    console.log(`[FeatureFlags] ${flagKey}: false (no ENV_NAME)`);
    return false;
  }

  const flagValue = FEATURE_FLAGS_CONFIG[environment][flagKey];

  // Log flag value query
  console.log(`[FeatureFlags] ${flagKey}: ${flagValue} (env: ${environment})`);

  return flagValue;
}

/**
 * Gets all flags for current environment
 * Useful for debugging and monitoring
 */
export function getAllFeatureFlags(): Record<FeatureFlagKey, boolean> | null {
  const environment = getCurrentEnvironment();

  if (!environment) {
    console.log("[FeatureFlags] getAllFeatureFlags: null (no ENV_NAME)");
    return null;
  }

  const flags = FEATURE_FLAGS_CONFIG[environment];
  console.log(`[FeatureFlags] getAllFeatureFlags (env: ${environment}):`, flags);

  return flags;
}

/**
 * Gets current environment info
 * Useful for debugging
 */
export function getCurrentEnvironmentInfo(): {
  environment: Environment | null;
  isValid: boolean;
} {
  const environment = getCurrentEnvironment();
  return {
    environment,
    isValid: environment !== null,
  };
}

/**
 * Checks if all AI features are enabled
 * Useful for checking AI features readiness
 */
export function isAIFeaturesReady(): boolean {
  return isFeatureEnabled("AI_RECEIPT_PROCESSING");
}

/**
 * Checks if advanced features are available
 * Useful for conditional UI rendering
 */
export function hasAdvancedFeatures(): boolean {
  return (
    isFeatureEnabled("ADVANCED_PROFILE_FEATURES") ||
    isFeatureEnabled("ADVANCED_ANALYTICS") ||
    isFeatureEnabled("BATCH_OPERATIONS")
  );
}

// Export types for use in other modules
export type { FeatureFlagsConfig };
