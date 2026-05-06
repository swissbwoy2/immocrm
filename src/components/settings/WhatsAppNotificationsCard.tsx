import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Prefs {
  whatsapp_enabled: boolean;
  offer_alerts_enabled: boolean;
  visit_reminders_enabled: boolean;
  agent_messages_enabled: boolean;
  document_alerts_enabled: boolean;
  candidature_updates_enabled: boolean;
}

const DEFAULT_PREFS: Prefs = {
  whatsapp_enabled: true,
  offer_alerts_enabled: true,
  visit_reminders_enabled: true,
  agent_messages_enabled: true,
  document_alerts_enabled: true,
  candidature_updates_enabled: true,
};

function isValidPhone(p: string) {
  const cleaned = p.replace(/[^\d+]/g, "");
  return /^\+?\d{8,15}$/.test(cleaned);
}

export function WhatsAppNotificationsCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [optIn, setOptIn] = useState(false);
  const [phone, setPhone] = useState("");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [{ data: profile }, { data: client }] = await Promise.all([
          supabase
            .from("profiles")
            .select("whatsapp_phone, whatsapp_opt_in, telephone")
            .eq("id", user.id)
            .maybeSingle(),
          supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle(),
        ]);

        setOptIn(!!profile?.whatsapp_opt_in);
        setPhone(profile?.whatsapp_phone || profile?.telephone || "");

        if (client?.id) {
          setClientId(client.id);
          const { data: pr } = await supabase
            .from("notification_preferences")
            .select("*")
            .eq("client_id", client.id)
            .maybeSingle();
          if (pr) {
            setPrefs({
              whatsapp_enabled: pr.whatsapp_enabled,
              offer_alerts_enabled: pr.offer_alerts_enabled,
              visit_reminders_enabled: pr.visit_reminders_enabled,
              agent_messages_enabled: pr.agent_messages_enabled,
              document_alerts_enabled: pr.document_alerts_enabled,
              candidature_updates_enabled: pr.candidature_updates_enabled,
            });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;
    if (optIn && !isValidPhone(phone)) {
      toast.error("Numéro WhatsApp invalide. Format attendu : +41 79 123 45 67");
      return;
    }
    setSaving(true);
    try {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          whatsapp_phone: phone || null,
          whatsapp_opt_in: optIn,
          whatsapp_opt_in_date: optIn ? new Date().toISOString() : null,
          whatsapp_opt_in_source: optIn ? "client_settings" : null,
        })
        .eq("id", user.id);
      if (pErr) throw pErr;

      if (clientId) {
        const { error: prefErr } = await supabase
          .from("notification_preferences")
          .upsert({ client_id: clientId, ...prefs }, { onConflict: "client_id" });
        if (prefErr) throw prefErr;
      }

      toast.success("Préférences WhatsApp enregistrées");
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Notifications WhatsApp
        </CardTitle>
        <CardDescription>
          Recevez les informations importantes liées à votre recherche de logement directement sur WhatsApp.
          Vous pouvez désactiver ces notifications à tout moment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="wa-phone">Numéro WhatsApp</Label>
          <Input
            id="wa-phone"
            placeholder="+41 79 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Activer les notifications WhatsApp</Label>
            <p className="text-sm text-muted-foreground">
              J'accepte de recevoir des notifications importantes (offres, visites, dossier, messages agent).
            </p>
          </div>
          <Switch checked={optIn} onCheckedChange={setOptIn} />
        </div>

        {optIn && (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Catégories de notifications</p>
            {[
              { k: "offer_alerts_enabled", label: "Nouvelles offres immobilières" },
              { k: "visit_reminders_enabled", label: "Rappels de visite" },
              { k: "agent_messages_enabled", label: "Messages importants de l'agent" },
              { k: "document_alerts_enabled", label: "Documents manquants ou expirés" },
              { k: "candidature_updates_enabled", label: "Suivi de candidature" },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between">
                <Label className="text-sm">{row.label}</Label>
                <Switch
                  checked={(prefs as any)[row.k]}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [row.k]: v }))}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Aucune donnée sensible (pièces d'identité, fiches de salaire, etc.) n'est envoyée par WhatsApp.
            Les messages contiennent uniquement des liens vers votre espace sécurisé Logisorama.
          </span>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
