import { supabase } from "@/integrations/supabase/client";
export async function newsletterApi<T>(
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("newsletter-admin", {
    body,
  });
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      try {
        message = (await error.context.json()).error || message;
      } catch {
        /* retain original */
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
