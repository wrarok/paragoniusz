/**
 * E2E Test Environment Configuration
 * 
 * Ensures consistent environment variables for Playwright tests
 * Prevents E2E tests from failing due to missing feature flag configuration
 */

/**
 * Set up environment variables for E2E tests
 * Call this before running Playwright tests
 */
export function setupE2EEnvironment() {
  // Ensure feature flags are enabled for E2E tests
  // This allows testing the full functionality including AI features
  process.env.PUBLIC_ENV_NAME = 'local';
  process.env.ENV_NAME = 'local';
  
  // Log configuration for debugging
  console.log('🧪 E2E Environment configured:');
  console.log(`   PUBLIC_ENV_NAME: ${process.env.PUBLIC_ENV_NAME}`);
  console.log(`   ENV_NAME: ${process.env.ENV_NAME}`);
}

/**
 * Set up environment for testing disabled features
 * Use this when testing fallback UI and disabled feature behavior
 */
export function setupDisabledFeaturesEnvironment() {
  process.env.PUBLIC_ENV_NAME = 'prod';
  process.env.ENV_NAME = 'prod';
  
  console.log('🧪 E2E Environment configured for disabled features:');
  console.log(`   PUBLIC_ENV_NAME: ${process.env.PUBLIC_ENV_NAME}`);
  console.log(`   ENV_NAME: ${process.env.ENV_NAME}`);
}

/**
 * Reset environment to undefined state
 * Use this to test behavior when no environment is configured
 */
export function resetE2EEnvironment() {
  delete process.env.PUBLIC_ENV_NAME;
  delete process.env.ENV_NAME;
  
  console.log('🧪 E2E Environment reset - no feature flags configured');
}