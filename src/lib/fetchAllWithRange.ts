import { supabase } from "@/integrations/supabase/client";

const BATCH_SIZE = 900; // Stay under 1000 server limit with margin

/**
 * Fetches ALL rows from a Supabase table by paginating with .range().
 * Bypasses the server-side 1000-row limit.
 */
export async function fetchAllWithRange<T = any>(
  tableName: string,
  options?: {
    select?: string;
    order?: { column: string; ascending?: boolean };
    filter?: (query: any) => any;
  }
): Promise<{ data: T[]; error: any }> {
  const allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(tableName)
      .select(options?.select || '*');

    // Apply custom filters
    if (options?.filter) {
      query = options.filter(query);
    }

    // Apply ordering
    if (options?.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending ?? true,
      });
    }

    const { data, error } = await query.range(from, from + BATCH_SIZE - 1);

    if (error) {
      console.error(`fetchAllWithRange error on ${tableName} (from=${from}):`, error);
      // Return what we have so far + the error
      return { data: allData, error };
    }

    if (data && data.length > 0) {
      allData.push(...(data as T[]));
    }

    // If we got fewer rows than batch size, we've reached the end
    if (!data || data.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      from += BATCH_SIZE;
    }
  }

  return { data: allData, error: null };
}
