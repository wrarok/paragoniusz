import { createClient } from '@supabase/supabase-js';

import type { Database } from '../db/database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
export type SupabaseClient = typeof supabaseClient;

/**
 * Lazy-loaded Supabase Admin client with elevated permissions
 * Uses service role key to bypass RLS and access admin APIs
 * Required for operations like deleting auth users
 *
 * Note: This is lazy-loaded to avoid initialization errors when
 * SUPABASE_SERVICE_ROLE_KEY is not set (e.g., in development)
 */
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabaseAdmin = () => {
  if (!_supabaseAdmin) {
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseServiceRoleKey || supabaseServiceRoleKey === '###') {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured. This is required for admin operations.');
    }
    
    _supabaseAdmin = createClient<Database>(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  
  return _supabaseAdmin;
};

export const DEFAULT_USER_ID = '1266a5e6-1684-4609-a2b3-8c29737efb8b';