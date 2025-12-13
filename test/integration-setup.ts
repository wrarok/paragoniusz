/**
 * Integration Tests Setup
 * 
 * This file configures the environment for integration tests.
 * Manually loads environment variables from .env.test
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Manually load .env.test file
try {
  const envPath = resolve(process.cwd(), '.env.test');
  const envFile = readFileSync(envPath, 'utf-8');
  
  envFile.split('\n').forEach(line => {
    // Skip empty lines and comments
    if (!line || line.trim().startsWith('#')) return;
    
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
  
  console.log('✅ Loaded .env.test file');
} catch (error) {
  console.error('❌ Failed to load .env.test file:', error);
  throw new Error('.env.test file not found. Please create it in the project root.');
}

// Verify required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'E2E_USERNAME',
  'E2E_PASSWORD',
  'E2E_USERNAME_ID',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}. Please check your .env.test file.`
    );
  }
}

// Export TEST_USER configuration for convenience
export const TEST_USER = {
  email: process.env.E2E_USERNAME!,
  password: process.env.E2E_PASSWORD!,
  id: process.env.E2E_USERNAME_ID!,
};

console.log('🧪 Integration tests environment loaded');
console.log(`📧 Test User: ${TEST_USER.email}`);
console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL}`);