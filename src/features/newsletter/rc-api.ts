import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Isolate the new schema until the generated Supabase definitions are refreshed.
export const rcDb = supabase as unknown as SupabaseClient;
export const RC_STATUSES = { new: "À traiter", in_progress: "En cours", offer_sent: "Offre transmise", closed: "Clôturée" } as const;
export type RcStatus = keyof typeof RC_STATUSES;
export type RcRequest = {
  id: string; user_id: string | null; first_name: string; last_name: string; current_address: string;
  email: string; phone: string; insured_people: number; birth_date: string; nationality: string;
  status: RcStatus; created_at: string; consent_at: string;
};
