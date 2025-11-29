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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`[${now.toISOString()}] Checking for visit reminders...`);

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
      recipients: string[];
      urgencyLevel: "critical" | "high" | "normal";
    }> = [];

    for (const visite of visites || []) {
      const visiteDate = new Date(visite.date_visite);
      const timeDiff = visiteDate.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));
      const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      // Déterminer les types de rappels à envoyer
      const remindersNeeded: Array<{ type: string; urgency: "critical" | "high" | "normal" }> = [];

      // Visite dans la journée - rappels urgents
      if (minutesDiff <= 30 && minutesDiff > 0) {
        remindersNeeded.push({ type: "30min_before", urgency: "critical" });
      } else if (minutesDiff <= 60 && minutesDiff > 30) {
        remindersNeeded.push({ type: "1h_before", urgency: "critical" });
      } else if (minutesDiff <= 180 && minutesDiff > 60) {
        remindersNeeded.push({ type: "3h_before", urgency: "critical" });
      }
      // Visite le jour même (mais pas dans les 3h)
      else if (daysDiff === 0 && hoursDiff > 3) {
        remindersNeeded.push({ type: "day_of", urgency: "high" });
      }
      // Visite demain
      else if (daysDiff === 1) {
        remindersNeeded.push({ type: "day_before", urgency: "high" });
      }
      // Visite dans la semaine
      else if (daysDiff >= 2 && daysDiff <= 7) {
        remindersNeeded.push({ type: "week_before", urgency: "normal" });
      }

      for (const reminder of remindersNeeded) {
        // Récupérer les destinataires
        const recipients: string[] = [];

        // Agent
        const { data: agent } = await supabase
          .from("agents")
          .select("user_id")
          .eq("id", visite.agent_id)
          .single();
        
        if (agent?.user_id) {
          recipients.push(agent.user_id);
        }

        // Client assigné à la visite
        if (visite.client_id) {
          const { data: client } = await supabase
            .from("clients")
            .select("user_id")
            .eq("id", visite.client_id)
            .single();
          
          if (client?.user_id) {
            recipients.push(client.user_id);
          }
        }

        // Admins
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");
        
        for (const admin of admins || []) {
          if (!recipients.includes(admin.user_id)) {
            recipients.push(admin.user_id);
          }
        }

        // Vérifier si le rappel a déjà été envoyé pour chaque destinataire
        for (const recipientId of recipients) {
          const { data: existingReminder } = await supabase
            .from("visit_reminders")
            .select("id")
            .eq("visite_id", visite.id)
            .eq("user_id", recipientId)
            .eq("reminder_type", reminder.type)
            .maybeSingle();

          if (!existingReminder) {
            remindersToSend.push({
              visite: visite as VisiteWithDetails,
              reminderType: reminder.type,
              recipients: [recipientId],
              urgencyLevel: reminder.urgency,
            });
          }
        }
      }
    }

    console.log(`Sending ${remindersToSend.length} reminders`);

    // Envoyer les notifications
    for (const reminder of remindersToSend) {
      const { visite, reminderType, recipients, urgencyLevel } = reminder;
      const visiteDate = new Date(visite.date_visite);

      // Formater le message selon l'urgence
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
          emoji = "⚠️";
          title = `${emoji} Rappel visite aujourd'hui`;
          message = getReminderMessage(reminderType, visite, visiteDate);
          break;
        default:
          emoji = "📅";
          title = `${emoji} Rappel visite à venir`;
          message = getReminderMessage(reminderType, visite, visiteDate);
      }

      for (const recipientId of recipients) {
        // Créer la notification
        const { error: notifError } = await supabase.rpc("create_notification", {
          p_user_id: recipientId,
          p_type: "visit_reminder",
          p_title: title,
          p_message: message,
          p_link: getRecipientLink(recipientId, visite),
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

        // Marquer le rappel comme envoyé
        const { error: insertError } = await supabase.from("visit_reminders").insert({
          visite_id: visite.id,
          user_id: recipientId,
          reminder_type: reminderType,
        });

        if (insertError && !insertError.message.includes("duplicate")) {
          console.error(`Error inserting reminder record:`, insertError);
        }

        console.log(`Sent ${reminderType} reminder to ${recipientId} for visit ${visite.id}`);
      }
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

async function getRecipientLink(userId: string, visite: VisiteWithDetails): Promise<string> {
  // Par défaut, retourner le lien selon le contexte
  // Les clients vont vers /client/visites, les agents vers /agent/visites
  return "/agent/visites"; // Sera ajusté côté frontend selon le rôle
}
