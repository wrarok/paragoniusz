import type { SupabaseClient } from '../../db/supabase.client';
import type { CategoryListDTO } from '../../types';

/**
 * Fetches all categories from the database
 * @param supabase - Supabase client instance
 * @returns CategoryListDTO with all categories and count
 * @throws Error if database query fails
 */
export async function getAllCategories(supabase: SupabaseClient): Promise<CategoryListDTO> {
  // Query database for all categories, selecting only required fields
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  // Return in CategoryListDTO format
  return {
    data: data || [],
    count: data?.length || 0,
  };
}