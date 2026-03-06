import { supabase } from "@/integrations/supabase/client";

export async function logMandateEvent(
  mandateId: string,
  eventType: string,
  eventDescription: string,
  isClientVisible: boolean = false,
  metadata: Record<string, any> = {}
) {
  try {
    const { error } = await supabase.rpc("log_mandate_event", {
      p_mandate_id: mandateId,
      p_event_type: eventType,
      p_event_description: eventDescription,
      p_actor_type: "mandant",
      p_metadata: JSON.stringify(metadata),
      p_is_client_visible: isClientVisible,
    });
    if (error) console.error("Audit log error:", error);
  } catch (err) {
    console.error("Audit log exception:", err);
  }
}

export async function recordCheckpoint(mandateId: string, checkpointKey: string) {
  try {
    const { error } = await supabase.rpc("record_signature_checkpoint", {
      p_mandate_id: mandateId,
      p_checkpoint_key: checkpointKey,
    });
    if (error) console.error("Checkpoint error:", error);
  } catch (err) {
    console.error("Checkpoint exception:", err);
  }
}
