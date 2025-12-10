import { cleanupTestUsers } from './helpers/auth.helpers';

/**
 * Global teardown function
 * Runs once after all tests complete
 * Cleans up test users created during test runs
 */
async function globalTeardown() {
  console.log('\n='.repeat(60));
  console.log('🧹 Running Global Teardown');
  console.log('='.repeat(60));

  try {
    await cleanupTestUsers();
    console.log('✅ Global teardown completed successfully\n');
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
    // Don't throw - we don't want teardown failures to fail the entire test suite
  }
}

export default globalTeardown;