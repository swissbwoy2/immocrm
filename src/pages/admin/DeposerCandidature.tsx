import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Home, Send, CheckCircle2 } from "lucide-react";

interface Client {
  id: string;
  user_id: string;
  profiles?: { prenom: string; nom: string; email: string } | null;
}

interface Offre {
  id: string;
  adresse: string;
  prix: number;
  pieces?: number | null;
  type_bien?: string | null;
}

export default function AdminDeposerCandidature() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [loadingOffres, setLoadingOffres] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedOffreId, setSelectedOffreId] = useState<string>("");

  const preClientId = searchParams.get("clientId");
  const preOffreId = searchParams.get("offreId");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data: clientsData, error } = await supabase
          .from("clients")
          .select("id, user_id, profiles:user_id (prenom, nom, email)")
          .eq("statut", "actif")
          .limit(15000);
        if (error) throw error;
        if (clientsData) setClients(clientsData as Client[]);
      } catch (error) {
        console.error("Error loading clients:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadOffres = async () => {
      if (!selectedClientId) {
        setOffres([]);
        return;
      }
      setLoadingOffres(true);
      try {
        const { data, error } = await supabase
          .from("offres")
          .select("id, adresse, prix, pieces, type_bien")
          .eq("client_id", selectedClientId)
          .order("date_envoi", { ascending: false });
        if (error) throw error;
        setOffres(data || []);
      } catch (e) {
        console.error("Error loading offers:", e);
      } finally {
        setLoadingOffres(false);
      }
    };
    loadOffres();
  }, [selectedClientId]);

  useEffect(() => {
    if (!loading && preClientId && !selectedClientId) {
      const exists = clients.find((c) => c.id === preClientId);
      if (exists) setSelectedClientId(preClientId);
    }
  }, [loading, clients, preClientId, selectedClientId]);

  useEffect(() => {
    if (preOffreId && offres.length > 0 && !selectedOffreId) {
      const exists = offres.find((o) => o.id === preOffreId);
      if (exists) setSelectedOffreId(preOffreId);
    }
  }, [offres, preOffreId, selectedOffreId]);

  useEffect(() => {
    setSelectedOffreId("");
  }, [selectedClientId]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedOffre = offres.find((o) => o.id === selectedOffreId);

  const handleSubmit = async () => {
    if (!selectedClientId || !selectedOffreId) {
      toast.error("Sélectionnez un client et une offre");
      return;
    }
    setSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from("candidatures")
        .select("id")
        .eq("offre_id", selectedOffreId)
        .eq("client_id", selectedClientId)
        .maybeSingle();

      const payload = {
        statut: "en_attente",
        dossier_complet: true,
        date_depot: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from("candidatures")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("candidatures").insert({
          offre_id: selectedOffreId,
          client_id: selectedClientId,
          ...payload,
        });
        if (error) throw error;
      }

      await supabase
        .from("offres")
        .update({ statut: "candidature_deposee" })
        .eq("id", selectedOffreId);

      if (selectedClient) {
        await supabase.from("notifications").insert({
          user_id: selectedClient.user_id,
          type: "candidature_deposee",
          title: "Dossier déposé",
          message: "Votre dossier a été déposé à la régie.",
          link: "/client/mes-candidatures",
        });

        // Notifier aussi l'agent principal du client
        const { data: clientRow } = await supabase
          .from("clients")
          .select("agent_id")
          .eq("id", selectedClientId)
          .maybeSingle();
        if (clientRow?.agent_id) {
          const { data: agentRow } = await supabase
            .from("agents")
            .select("user_id")
            .eq("id", clientRow.agent_id)
            .maybeSingle();
          if (agentRow?.user_id) {
            await supabase.from("notifications").insert({
              user_id: agentRow.user_id,
              type: "candidature_deposee",
              title: "Candidature déposée par l'admin",
              message: `L'admin a déposé une candidature pour ${selectedClient.profiles?.prenom ?? ""} ${selectedClient.profiles?.nom ?? ""} sur ${selectedOffre?.adresse ?? ""}.`,
              link: "/agent/candidatures",
            });
          }
        }
      }

      toast.success("Candidature déposée", {
        description: `Dossier marqué comme déposé pour ${selectedOffre?.adresse}.`,
      });

      setSelectedClientId("");
      setSelectedOffreId("");
    } catch (e: any) {
      console.error("Error depositing candidature:", e);
      toast.error("Erreur", { description: e.message || "Impossible de déposer la candidature" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Déposer une candidature</h1>
        <p className="text-muted-foreground">
          Marquez une candidature comme déposée à la régie pour un client et une offre.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Client
            </CardTitle>
            <CardDescription>Sélectionnez le client concerné</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients
                  .slice()
                  .sort((a, b) => {
                    const an = `${a.profiles?.prenom ?? ""} ${a.profiles?.nom ?? ""}`.trim().toLowerCase();
                    const bn = `${b.profiles?.prenom ?? ""} ${b.profiles?.nom ?? ""}`.trim().toLowerCase();
                    return an.localeCompare(bn);
                  })
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.profiles?.prenom} {c.profiles?.nom}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" /> Offre envoyée
            </CardTitle>
            <CardDescription>
              {selectedClientId
                ? "Choisissez l'offre pour laquelle déposer la candidature"
                : "Sélectionnez d'abord un client"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedOffreId}
              onValueChange={setSelectedOffreId}
              disabled={!selectedClientId || loadingOffres}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingOffres
                      ? "Chargement..."
                      : offres.length === 0 && selectedClientId
                      ? "Aucune offre envoyée à ce client"
                      : "Sélectionner une offre"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {offres.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.adresse} — {o.pieces ?? "?"} pcs — CHF {Number(o.prix).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOffre && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedOffre.adresse}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedOffre.type_bien} • {selectedOffre.pieces} pièces • CHF{" "}
                  {Number(selectedOffre.prix).toLocaleString()}/mois
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedClient && selectedOffre && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p>
                    Vous confirmez avoir déposé le dossier de{" "}
                    <strong>
                      {selectedClient.profiles?.prenom} {selectedClient.profiles?.nom}
                    </strong>{" "}
                    à la régie pour l'offre <strong>{selectedOffre.adresse}</strong>.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Le client recevra une notification de confirmation. Le workflow
                    (bail reçu, client accepté…) se poursuit depuis la page Candidatures.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleSubmit}
          disabled={submitting || !selectedClientId || !selectedOffreId}
          size="lg"
          className="w-full gap-2"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Marquer la candidature comme déposée
        </Button>
      </div>
    </div>
  );
}
