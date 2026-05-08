import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Row {
  id: string;
  date_visite: string;
  statut: string;
  agent_id: string | null;
  client_id: string | null;
  offre_id: string | null;
  agent_name?: string;
  client_name?: string;
  offre_titre?: string;
  hours_late: number;
}

export default function AdminComptesRendus() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: visites } = await supabase
      .from("visites")
      .select("id, date_visite, statut, agent_id, client_id, offre_id")
      .eq("statut", "effectuee")
      .gte("date_visite", since)
      .lte("date_visite", new Date().toISOString())
      .order("date_visite", { ascending: false })
      .limit(2000);

    const ids = (visites || []).map(v => v.id);
    let envoyes = new Set<string>();
    if (ids.length) {
      const { data: crs } = await supabase
        .from("visite_comptes_rendus")
        .select("visite_id, envoye_au_client_at")
        .in("visite_id", ids)
        .not("envoye_au_client_at", "is", null);
      (crs || []).forEach((c: any) => envoyes.add(c.visite_id));
    }

    const enRetard = (visites || []).filter(v => !envoyes.has(v.id));
    const agentIds = Array.from(new Set(enRetard.map(v => v.agent_id).filter(Boolean))) as string[];
    const clientIds = Array.from(new Set(enRetard.map(v => v.client_id).filter(Boolean))) as string[];
    const offreIds = Array.from(new Set(enRetard.map(v => v.offre_id).filter(Boolean))) as string[];

    const [{ data: agents }, { data: clients }, { data: offres }] = await Promise.all([
      agentIds.length
        ? supabase.from("agents").select("id, user_id, profiles:agents_user_id_fkey(prenom, nom)").in("id", agentIds)
        : Promise.resolve({ data: [] as any[] }),
      clientIds.length
        ? supabase.from("clients").select("id, user_id").in("id", clientIds)
        : Promise.resolve({ data: [] as any[] }),
      offreIds.length
        ? supabase.from("offres").select("id, titre, adresse").in("id", offreIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const clientUserIds = (clients || []).map((c: any) => c.user_id).filter(Boolean);
    const { data: clientProfiles } = clientUserIds.length
      ? await supabase.from("profiles").select("id, prenom, nom").in("id", clientUserIds)
      : { data: [] as any[] };

    const agentMap = new Map((agents || []).map((a: any) => [a.id, `${a.profiles?.prenom || ""} ${a.profiles?.nom || ""}`.trim()]));
    const clientUserMap = new Map((clients || []).map((c: any) => [c.id, c.user_id]));
    const profileMap = new Map((clientProfiles || []).map((p: any) => [p.id, `${p.prenom || ""} ${p.nom || ""}`.trim()]));
    const offreMap = new Map((offres || []).map((o: any) => [o.id, o.titre || o.adresse]));

    const now = Date.now();
    const enriched: Row[] = enRetard.map(v => ({
      ...v,
      agent_name: v.agent_id ? agentMap.get(v.agent_id) : "-",
      client_name: v.client_id ? profileMap.get(clientUserMap.get(v.client_id)) || "-" : "-",
      offre_titre: v.offre_id ? offreMap.get(v.offre_id) : "-",
      hours_late: Math.floor((now - new Date(v.date_visite).getTime()) / (1000 * 60 * 60)),
    }));

    setRows(enriched);
    setLoading(false);
  };

  const enRetardCount = rows.filter(r => r.hours_late > 24).length;
  const aFaireCount = rows.filter(r => r.hours_late <= 24).length;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Comptes-rendus de visite</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total à traiter</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{rows.length}</div></CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">En retard ({"> 24h"})</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-destructive">{enRetardCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">À faire ({"< 24h"})</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{aFaireCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Visites sans compte-rendu</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Tous les comptes-rendus sont à jour 🎉</p>
          ) : (
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.id} className="flex items-center justify-between border rounded p-3 hover:bg-muted/40">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.hours_late > 24 ? (
                        <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />En retard ({r.hours_late}h)</Badge>
                      ) : (
                        <Badge variant="secondary">À faire ({r.hours_late}h)</Badge>
                      )}
                      <span className="font-medium">{r.agent_name}</span>
                      <span className="text-muted-foreground">→ {r.client_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {r.offre_titre} — {format(new Date(r.date_visite), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open(`/agent/visites/${r.id}/compte-rendu`, "_blank")}>
                    Voir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
