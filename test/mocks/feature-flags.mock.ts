/**
 * Feature Flags Mock for Testing
 * 
 * Provides controlled feature flag values for unit and integration tests
 * Prevents tests from failing due to environment variable dependencies
 */

import { vi } from 'vitest';
import type { FeatureFlagKey } from '../../src/features/feature-flags';

// Default test configuration - all flags enabled for comprehensive testing
const DEFAULT_TEST_FLAGS = {
  AI_RECEIPT_PROCESSING: true,
  BATCH_OPERATIONS: true,
  ADVANCED_PROFILE_FEATURES: true,
  ADVANCED_ANALYTICS: true,
};

// Mock environment for tests
let mockEnvironment: string | null = 'local';
let mockFlags = { ...DEFAULT_TEST_FLAGS };

/**
 * Mock the feature flags module for testing
 * Call this in test setup to ensure consistent behavior
 */
export function mockFeatureFlags() {
  vi.mock('../../src/features/feature-flags', () => ({
    isFeatureEnabled: vi.fn((flagKey: FeatureFlagKey) => {
      return mockFlags[flagKey] ?? false;
    }),
    getAllFeatureFlags: vi.fn(() => mockFlags),
    getCurrentEnvironmentInfo: vi.fn(() => ({
      environment: mockEnvironment,
      isValid: mockEnvironment !== null,
    })),
    isAIFeaturesReady: vi.fn(() => mockFlags.AI_RECEIPT_PROCESSING),
    hasAdvancedFeatures: vi.fn(() => 
      mockFlags.ADVANCED_PROFILE_FEATURES || 
      mockFlags.ADVANCED_ANALYTICS || 
      mockFlags.BATCH_OPERATIONS
    ),
  }));
}

/**
 * Set specific flag values for testing
 * 
 * @param flags - Partial flag configuration to override defaults
 * 
 * @example
 * ```typescript
 * // Test with AI disabled
 * setTestFlags({ AI_RECEIPT_PROCESSING: false });
 * 
 * // Test with all flags disabled
 * setTestFlags({
 *   AI_RECEIPT_PROCESSING: false,
 *   BATCH_OPERATIONS: false,
 *   ADVANCED_PROFILE_FEATURES: false,
 *   ADVANCED_ANALYTICS: false,
 * });
 * ```
 */
export function setTestFlags(flags: Partial<typeof DEFAULT_TEST_FLAGS>) {
  mockFlags = { ...DEFAULT_TEST_FLAGS, ...flags };
}

/**
 * Set test environment
 * 
 * @param env - Environment name or null
 */
export function setTestEnvironment(env: string | null) {
  mockEnvironment = env;
}

/**
 * Reset flags to default test configuration
 */
export function resetTestFlags() {
  mockFlags = { ...DEFAULT_TEST_FLAGS };
  mockEnvironment = 'local';
}

/**
 * Get current test flag values
 */
export function getTestFlags() {
  return { ...mockFlags };
}