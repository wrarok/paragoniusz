import { cleanupTestUsers } from './helpers/auth.helpers';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test
// This is critical because globalTeardown runs in separate context
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

/**
 * Global teardown function
 * Runs once after all tests complete
 * Cleans up test users created during test runs
 */
async function globalTeardown() {
  console.log('\n' + '='.repeat(60));
  console.log('🧹 Running Global Teardown');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'NOT SET'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'NOT SET'}`);
  console.log('='.repeat(60) + '\n');

  try {
    await cleanupTestUsers();
    console.log('✅ Global teardown completed successfully\n');
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
    console.error('Stack trace:', (error as Error).stack);
    // Log but don't throw - we don't want teardown failures to fail the entire test suite
    console.error('\n⚠️  WARNING: Test user cleanup failed! Manual cleanup may be required.\n');
  }
}

export default globalTeardown;