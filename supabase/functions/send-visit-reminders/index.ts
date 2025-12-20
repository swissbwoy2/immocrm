import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VisiteWithDetails {
  id: string;
  date_visite: string;
  adresse: string;
  agent_id: string;
  client_id: string;
  est_deleguee: boolean;
  notes: string | null;
  offres: {
    pieces: number;
    surface: number;
    prix: number;
  }[] | null;
}

// Helper function to calculate calendar day difference accounting for timezone
function getCalendarDaysDiff(date1: Date, date2: Date, timezone: string = "Europe/Zurich"): number {
  const d1 = new Date(date1.toLocaleString("en-US", { timeZone: timezone }));
  const d2 = new Date(date2.toLocaleString("en-US", { timeZone: timezone }));
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

// Generate a unique lock key for the current execution window
function getLockKey(): string {
  const now = new Date();
  // Round to 5-minute window to prevent concurrent executions
  const windowStart = new Date(Math.floor(now.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000));
  return `visit_reminders_${windowStart.toISOString()}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const lockKey = getLockKey();
    console.log(`[${now.toISOString()}] Starting visit reminders check with lock: ${lockKey}`);

    // Try to acquire a distributed lock using a temporary table or advisory lock
    // Using advisory lock for PostgreSQL to prevent concurrent execution
    const { data: lockResult, error: lockError } = await supabase.rpc('pg_try_advisory_lock', {
      lock_key: 123456789 // Fixed key for visit reminders
    });

    if (lockError) {
      console.log("Could not acquire advisory lock, using fallback approach");
    } else if (lockResult === false) {
      console.log("Another instance is already running, skipping this execution");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Skipped - another instance running",
          reminders_sent: 0,
          timestamp: now.toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Récupérer toutes les visites planifiées à venir
    const { data: visites, error: visitesError } = await supabase
      .from("visites")
      .select(`
        id,
        date_visite,
        adresse,
        agent_id,
        client_id,
        est_deleguee,
        notes,
        offres (pieces, surface, prix)
      `)
      .eq("statut", "planifiee")
      .gte("date_visite", now.toISOString())
      .order("date_visite", { ascending: true });

    if (visitesError) {
      console.error("Error fetching visites:", visitesError);
      throw visitesError;
    }

    console.log(`Found ${visites?.length || 0} upcoming visits`);

    const remindersToSend: Array<{
      visite: VisiteWithDetails;
      reminderType: string;
      recipientId: string;
      recipientRole: 'agent' | 'client' | 'admin';
      urgencyLevel: "critical" | "high" | "normal";
    }> = [];

    // Batch fetch all required data to reduce queries
    const agentIds = [...new Set((visites || []).map(v => v.agent_id).filter(Boolean))];
    const clientIds = [...new Set((visites || []).map(v => v.client_id).filter(Boolean))];
    const visiteIds = (visites || []).map(v => v.id);

    // Fetch agents in batch
    const { data: agentsData } = await supabase
      .from("agents")
      .select("id, user_id")
      .in("id", agentIds);
    const agentMap = new Map(agentsData?.map(a => [a.id, a.user_id]) || []);

    // Fetch clients in batch
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, user_id")
      .in("id", clientIds);
    const clientMap = new Map(clientsData?.map(c => [c.id, c.user_id]) || []);

    // Fetch admins once
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminUserIds = admins?.map(a => a.user_id) || [];

    // Fetch all existing reminders in batch to avoid N+1 queries
    const { data: existingReminders } = await supabase
      .from("visit_reminders")
      .select("visite_id, user_id, reminder_type")
      .in("visite_id", visiteIds);
    
    const existingReminderSet = new Set(
      existingReminders?.map(r => `${r.visite_id}:${r.user_id}:${r.reminder_type}`) || []
    );

    for (const visite of visites || []) {
      const visiteDate = new Date(visite.date_visite);
      const timeDiff = visiteDate.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));
      const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
      const daysDiff = getCalendarDaysDiff(now, visiteDate);

      // Déterminer les types de rappels à envoyer
      const remindersNeeded: Array<{ type: string; urgency: "critical" | "high" | "normal" }> = [];

      // Only send ONE type of reminder per visite to avoid spam
      if (minutesDiff <= 30 && minutesDiff > 0) {
        remindersNeeded.push({ type: "30min_before", urgency: "critical" });
      } else if (minutesDiff <= 60 && minutesDiff > 30) {
        remindersNeeded.push({ type: "1h_before", urgency: "critical" });
      } else if (minutesDiff <= 180 && minutesDiff > 60) {
        remindersNeeded.push({ type: "3h_before", urgency: "critical" });
      } else if (daysDiff === 0 && hoursDiff > 3) {
        remindersNeeded.push({ type: "day_of", urgency: "high" });
      } else if (daysDiff === 1) {
        remindersNeeded.push({ type: "day_before", urgency: "high" });
      } else if (daysDiff >= 2 && daysDiff <= 7) {
        remindersNeeded.push({ type: "week_before", urgency: "normal" });
      }

      for (const reminder of remindersNeeded) {
        // Agent
        const agentUserId = agentMap.get(visite.agent_id);
        if (agentUserId) {
          const key = `${visite.id}:${agentUserId}:${reminder.type}`;
          if (!existingReminderSet.has(key)) {
            remindersToSend.push({
              visite: visite as VisiteWithDetails,
              reminderType: reminder.type,
              recipientId: agentUserId,
              recipientRole: 'agent',
              urgencyLevel: reminder.urgency,
            });
            existingReminderSet.add(key); // Prevent duplicates within same run
          }
        }

        // Client
        if (visite.client_id) {
          const clientUserId = clientMap.get(visite.client_id);
          if (clientUserId) {
            const key = `${visite.id}:${clientUserId}:${reminder.type}`;
            if (!existingReminderSet.has(key)) {
              remindersToSend.push({
                visite: visite as VisiteWithDetails,
                reminderType: reminder.type,
                recipientId: clientUserId,
                recipientRole: 'client',
                urgencyLevel: reminder.urgency,
              });
              existingReminderSet.add(key);
            }
          }
        }

        // Admins - only for critical/high urgency to reduce admin spam
        if (reminder.urgency !== "normal") {
          for (const adminUserId of adminUserIds) {
            const key = `${visite.id}:${adminUserId}:${reminder.type}`;
            if (!existingReminderSet.has(key)) {
              remindersToSend.push({
                visite: visite as VisiteWithDetails,
                reminderType: reminder.type,
                recipientId: adminUserId,
                recipientRole: 'admin',
                urgencyLevel: reminder.urgency,
              });
              existingReminderSet.add(key);
            }
          }
        }
      }
    }

    console.log(`Sending ${remindersToSend.length} reminders`);

    // Batch process reminders
    const reminderRecords: Array<{
      visite_id: string;
      user_id: string;
      reminder_type: string;
    }> = [];

    for (const reminder of remindersToSend) {
      const { visite, reminderType, recipientId, recipientRole, urgencyLevel } = reminder;
      const visiteDate = new Date(visite.date_visite);

      let title: string;
      let message: string;
      let emoji: string;

      switch (urgencyLevel) {
        case "critical":
          emoji = "🚨";
          title = `${emoji} URGENT: Visite imminente!`;
          message = getReminderMessage(reminderType, visite, visiteDate);
          break;
        case "high":
          emoji = reminderType === "day_before" ? "📅" : "⚠️";
          title = reminderType === "day_before" 
            ? `${emoji} Rappel visite demain`
            : `${emoji} Rappel visite aujourd'hui`;
          message = getReminderMessage(reminderType, visite, visiteDate);
          break;
        default:
          emoji = "📅";
          title = `${emoji} Rappel visite à venir`;
          message = getReminderMessage(reminderType, visite, visiteDate);
      }

      const link = getRecipientLink(recipientRole);

      // Use create_notification RPC which now has built-in dedup protection
      const { error: notifError } = await supabase.rpc("create_notification", {
        p_user_id: recipientId,
        p_type: "visit_reminder",
        p_title: title,
        p_message: message,
        p_link: link,
        p_metadata: {
          visite_id: visite.id,
          reminder_type: reminderType,
          urgency: urgencyLevel,
        },
      });

      if (notifError) {
        console.error(`Error creating notification for ${recipientId}:`, notifError);
        continue;
      }

      // Add to batch for visit_reminders table
      reminderRecords.push({
        visite_id: visite.id,
        user_id: recipientId,
        reminder_type: reminderType,
      });

      console.log(`Sent ${reminderType} reminder to ${recipientId} (${recipientRole}) for visit ${visite.id}`);
    }

    // Batch insert reminder records
    if (reminderRecords.length > 0) {
      const { error: insertError } = await supabase
        .from("visit_reminders")
        .upsert(reminderRecords, { 
          onConflict: 'visite_id,user_id,reminder_type',
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error("Error batch inserting reminder records:", insertError);
      }
    }

    // Release advisory lock (ignore errors)
    try {
      await supabase.rpc('pg_advisory_unlock', { lock_key: 123456789 });
    } catch {
      // Ignore unlock errors
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: remindersToSend.length,
        timestamp: now.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-visit-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getReminderMessage(
  reminderType: string,
  visite: VisiteWithDetails,
  visiteDate: Date
): string {
  const formattedDate = visiteDate.toLocaleDateString("fr-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formattedTime = visiteDate.toLocaleTimeString("fr-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const baseInfo = `${visite.adresse}\n${formattedDate} à ${formattedTime}`;
  const visiteType = visite.est_deleguee ? " (Visite déléguée)" : "";

  switch (reminderType) {
    case "30min_before":
      return `⏰ Dans 30 minutes!\n${baseInfo}${visiteType}`;
    case "1h_before":
      return `⏰ Dans 1 heure!\n${baseInfo}${visiteType}`;
    case "3h_before":
      return `⏰ Dans 3 heures!\n${baseInfo}${visiteType}`;
    case "day_of":
      return `Visite prévue aujourd'hui\n${baseInfo}${visiteType}`;
    case "day_before":
      return `Visite prévue demain\n${baseInfo}${visiteType}`;
    case "week_before":
      return `Visite prévue cette semaine\n${baseInfo}${visiteType}`;
    default:
      return `Rappel de visite\n${baseInfo}${visiteType}`;
  }
}

function getRecipientLink(role: 'agent' | 'client' | 'admin'): string {
  switch (role) {
    case 'agent':
      return '/agent/visites';
    case 'client':
      return '/client/visites';
    case 'admin':
      return '/admin/calendrier';
    default:
      return '/';
  }
}
