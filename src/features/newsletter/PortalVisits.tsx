import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const db = supabase as unknown as SupabaseClient;
type Config = {
  enabled: boolean;
  last_checked_at: string | null;
  last_error: string | null;
};
type Row = {
  id: string;
  source: string;
  email: string | null;
  status: string;
  reason: string | null;
  created_at: string;
  annonces_publiques: { titre: string } | null;
  newsletters: { status: string } | null;
};
const labels: Record<string, string> = {
  review: "À vérifier",
  queued: "Mis en file",
  skipped: "Exclu / doublon",
  completed: "Traité par le prestataire",
  cancelled: "Annulé",
};
export default function PortalVisits() {
  const [config, setConfig] = useState<Config | null>(null),
    [rows, setRows] = useState<Row[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => {
    const [a, b] = await Promise.all([
      db.from("portal_visit_automation").select(
        "enabled,last_checked_at,last_error",
      ).eq("mailbox", "info@immo-rama.ch").single(),
      db.from("portal_visit_requests").select(
        "id,source,email,status,reason,created_at,annonces_publiques(titre),newsletters(status)",
      ).order("created_at", { ascending: false }).limit(30),
    ]);
    if (a.error || b.error) {
      setError((a.error || b.error)!.message);
      return;
    }
    setConfig(a.data);
    setRows(b.data as unknown as Row[]);
    setError("");
  };
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 60000);
    return () => clearInterval(timer);
  }, []);
  const toggle = async () => {
    setBusy(true);
    const r = await db.rpc("portal_visit_configure", {
      p_enabled: !config?.enabled,
    });
    if (r.error) setError(r.error.message);
    else await load();
    setBusy(false);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demandes de visite reçues par email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>
            <strong>info@immo-rama.ch</strong> · {config?.enabled
              ? "Automatisation active"
              : "Automatisation suspendue"}
          </p>
          <Button variant="outline" disabled={busy || !config} onClick={toggle}>
            {config?.enabled
              ? "Suspendre les nouvelles demandes"
              : "Activer les nouvelles demandes"}
          </Button>
        </div>
        <p>
          Immobilier.ch et SMG : réponse avec l’annonce reconnue, puis six
          emails à partir du lendemain. Un parcours existant est conservé. Les
          doublons pour un même bien sont exclus pendant 24 heures. Les messages
          antérieurs à l’activation ne sont pas envoyés.
        </p>
        <p className="text-muted-foreground">
          Relève chaque minute ; l’envoi dépend ensuite de la file et du
          prestataire. Dernier contrôle : {config?.last_checked_at
            ? new Date(config.last_checked_at).toLocaleString("fr-CH", {
              timeZone: "Europe/Zurich",
            })
            : "pas encore effectué"}. Les contacts ou annonces ambigus restent à
          vérifier.
        </p>
        {(error || config?.last_error) && (
          <p role="alert" className="text-destructive">
            {error || config?.last_error}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-2">Date / source</th>
                <th className="p-2">Prospect / bien</th>
                <th className="p-2">Traitement</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">
                    {new Date(r.created_at).toLocaleString("fr-CH", {
                      timeZone: "Europe/Zurich",
                    })}
                    <div className="text-muted-foreground">{r.source}</div>
                  </td>
                  <td className="p-2">
                    {r.email || "Contact à identifier"}
                    <div className="text-muted-foreground">
                      {r.annonces_publiques?.titre}
                    </div>
                  </td>
                  <td className="p-2">
                    {labels[
                      r.newsletters?.status === "completed"
                        ? "completed"
                        : r.newsletters?.status === "cancelled"
                        ? "cancelled"
                        : r.status
                    ]}
                    <div className="text-muted-foreground">{r.reason}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="py-3 text-muted-foreground">
              Les nouvelles demandes traitées apparaîtront ici.
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          « Traité » ne confirme pas la réception. Consultez Suivi &amp;
          statistiques pour les détails de livraison.
        </p>
      </CardContent>
    </Card>
  );
}
