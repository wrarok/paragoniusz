import { getSupabaseAdmin } from '../../db/supabase.client';
import type { SupabaseClient } from '../../db/supabase.client';
import type { Database } from '../../db/database.types';
import type { ProfileDTO, UpdateProfileCommand } from '../../types';

/**
 * ProfileService handles all profile-related business logic
 *
 * This service provides methods for retrieving and managing user profiles.
 * All database operations are protected by Row Level Security (RLS) policies
 * that ensure users can only access their own profile data.
 */
export class ProfileService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Retrieves a user's profile by their user ID
   * 
   * @param userId - The UUID of the user whose profile to retrieve
   * @returns The user's profile or null if not found
   * @throws Error if database query fails
   * 
   * Note: RLS policy "Allow individual read access" ensures that
   * users can only retrieve their own profile (auth.uid() = id)
   */
  async getProfile(userId: string): Promise<ProfileDTO | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // If no rows found, Supabase returns an error with code 'PGRST116'
      // We handle this case by returning null instead of throwing
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Updates a user's profile with the provided data
   *
   * @param userId - The UUID of the user whose profile to update
   * @param updateData - The profile fields to update
   * @returns The updated profile
   * @throws Error if profile not found or database query fails
   *
   * Note: RLS policy ensures users can only update their own profile (auth.uid() = id)
   * The updated_at timestamp is automatically updated by the database
   */
  async updateProfile(userId: string, updateData: UpdateProfileCommand): Promise<ProfileDTO> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({
        ai_consent_given: updateData.ai_consent_given,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      // If no rows found, Supabase returns an error with code 'PGRST116'
      if (error.code === 'PGRST116') {
        throw new Error('Profile not found');
      }
      throw error;
    }

    if (!data) {
      throw new Error('Profile not found');
    }

    return data;
  }

  /**
   * Permanently deletes a user account and all associated data
   *
   * This operation:
   * 1. Deletes the user from auth.users table using Admin API
   * 2. Database CASCADE automatically deletes:
   *    - Profile record (profiles.id → auth.users.id ON DELETE CASCADE)
   *    - All expenses (expenses.user_id → profiles.id ON DELETE CASCADE)
   *
   * @param userId - The UUID of the user to delete
   * @throws Error if deletion fails
   *
   * Note: This operation is irreversible and requires service role permissions
   */
  async deleteProfile(userId: string): Promise<void> {
    // Get the admin client (lazy-loaded)
    // This will throw an error if SUPABASE_SERVICE_ROLE_KEY is not configured
    const adminClient = getSupabaseAdmin();
    
    // Use Supabase Admin API to delete the auth user
    // This requires the service role key with elevated permissions
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    
    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
    
    // CASCADE will automatically delete:
    // - Profile record (profiles.id → auth.users.id)
    // - All expenses (expenses.user_id → profiles.id)
  }
}