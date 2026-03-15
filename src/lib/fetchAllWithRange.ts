import { supabase } from "@/integrations/supabase/client";

const BATCH_SIZE = 900;

/**
 * Fetches ALL rows from a Supabase query by paginating with .range().
 * Bypasses the server-side 1000-row limit.
 * 
 * Usage:
 *   const { data, error } = await fetchAllPaginated(
 *     () => supabase.from('visites').select('*, offres(*)').order('date_visite', { ascending: true })
 *   );
 */
export async function fetchAllPaginated<T = any>(
  queryBuilder: () => any
): Promise<{ data: T[]; error: any }> {
  const allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await queryBuilder().range(from, from + BATCH_SIZE - 1);

    if (error) {
      console.error(`fetchAllPaginated error (from=${from}):`, error);
      return { data: allData, error };
    }

    if (data && data.length > 0) {
      allData.push(...(data as T[]));
    }

    if (!data || data.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      from += BATCH_SIZE;
    }
  }

  return { data: allData, error: null };
}
