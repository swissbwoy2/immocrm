import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ExternalLink, Loader2, Save, CalendarPlus, User, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

type OffreRow = {
  id: string;
  adresse: string | null;
  prix: number | null;
  pieces: number | null;
  statut: string | null;
  commentaires: string | null;
  lien_annonce: string | null;
  client_id: string;
  needs_agent_action?: boolean | null;
  missing_info?: string | null;
  concierge_nom?: string | null;
  concierge_tel?: string | null;
  agent_id?: string | null;
  visites?: { id: string; date_visite: string | null; date_visite_fin?: string | null; statut: string | null }[];
  _client?: { prenom?: string | null; nom?: string | null; email?: string | null; telephone?: string | null };
};

export function GererOffreDialog({
  offre,
  open,
  onOpenChange,
  onSaved,
  visitAgentIdOverride,
}: {
  offre: OffreRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  visitAgentIdOverride?: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const [prix, setPrix] = useState<string>("");
  const [adresse, setAdresse] = useState<string>("");
  const [pieces, setPieces] = useState<string>("");
  const [statut, setStatut] = useState<string>("envoyee");
  const [commentaires, setCommentaires] = useState<string>("");
  const [visitDate, setVisitDate] = useState<string>("");
  const [visitTime, setVisitTime] = useState<string>("");
  const [visitEndTime, setVisitEndTime] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  const existingVisit = offre?.visites?.[0];

  useEffect(() => {
    if (!offre) return;
    setPrix(offre.prix != null ? String(offre.prix) : "");
    setAdresse(offre.adresse ?? "");
    setPieces(offre.pieces != null ? String(offre.pieces) : "");
    setStatut(offre.statut ?? "envoyee");
    setCommentaires(offre.commentaires ?? "");
    if (existingVisit?.date_visite) {
      const d = new Date(existingVisit.date_visite);
      setVisitDate(format(d, "yyyy-MM-dd"));
      setVisitTime(format(d, "HH:mm"));
    } else {
      setVisitDate("");
      setVisitTime("");
    }
    if (existingVisit?.date_visite_fin) {
      const df = new Date(existingVisit.date_visite_fin);
      setVisitEndTime(format(df, "HH:mm"));
    } else {
      setVisitEndTime("");
    }
    // Fetch client phone (not in the base row)
    setPhone("");
    (async () => {
      if (!offre.client_id) return;
      const { data: c } = await supabase.from("clients").select("user_id").eq("id", offre.client_id).maybeSingle();
      if (c?.user_id) {
        const { data: p } = await supabase.from("profiles").select("telephone").eq("id", c.user_id).maybeSingle();
        if (p?.telephone) setPhone(p.telephone);
      }
    })();
  }, [offre?.id]);

  if (!offre) return null;

  async function save() {
    if (!offre) return;
    setSaving(true);
    try {
      const parsedPrix = prix.trim() === "" ? null : Number(prix);
      const parsedPieces = pieces.trim() === "" ? null : Number(pieces);
      if (parsedPrix == null || Number.isNaN(parsedPrix)) throw new Error("Prix invalide");
      if (!adresse.trim()) throw new Error("Adresse requise");

      // 1) Update offre
      const { error: eOff } = await supabase
        .from("offres")
        .update({
          prix: parsedPrix,
          adresse: adresse.trim(),
          pieces: parsedPieces,
          statut,
          commentaires: commentaires || null,
        })
        .eq("id", offre.id);
      if (eOff) throw eOff;

      // 2) Visit upsert if a date+time provided
      if (visitDate && visitTime) {
        const dateISO = new Date(`${visitDate}T${visitTime}:00`).toISOString();
        const endISO = visitEndTime ? new Date(`${visitDate}T${visitEndTime}:00`).toISOString() : null;

        if (existingVisit?.id) {
          const { error: eV } = await supabase
            .from("visites")
            .update({
              date_visite: dateISO,
              date_visite_fin: endISO,
              adresse: adresse.trim(),
            })
            .eq("id", existingVisit.id);
          if (eV) throw eV;
        } else {
          const { error: eV } = await supabase.from("visites").insert({
            offre_id: offre.id,
            client_id: offre.client_id,
            agent_id: visitAgentIdOverride ?? offre.agent_id ?? null,
            date_visite: dateISO,
            date_visite_fin: endISO,
            adresse: adresse.trim(),
            statut: "proposee",
            source: "manuel",
            medias_coursier: [],
          } as any);
          if (eV) throw eV;
        }
      }

      // 3) Touch offre updated_at to force recompute of needs_agent_action even if visit trigger didn't
      await supabase.from("offres").update({ updated_at: new Date().toISOString() } as any).eq("id", offre.id);

      toast.success("Offre mise à jour");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  const clientName = `${offre._client?.prenom ?? ""} ${offre._client?.nom ?? ""}`.trim() || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer l'offre</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Infos client / annonce */}
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="font-medium">{clientName}</div>
                <div className="text-xs text-muted-foreground">{offre._client?.email ?? ""}</div>
                {phone && <div className="text-xs text-muted-foreground">📞 {phone}</div>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/admin/clients/${offre.client_id}`}>
                    <User className="h-3.5 w-3.5 mr-1" /> Fiche client
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/admin/messagerie?client=${offre.client_id}`}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> Conversation
                  </Link>
                </Button>
                {offre.lien_annonce && (
                  <Button asChild size="sm" variant="outline">
                    <a href={offre.lien_annonce} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Annonce
                    </a>
                  </Button>
                )}
              </div>
            </div>
            {offre.needs_agent_action && offre.missing_info && (
              <div className="text-xs">
                <Badge variant="outline" className="bg-amber-100 text-amber-800 mr-1">⚠️ À compléter</Badge>
                <span className="text-amber-700">{offre.missing_info}</span>
              </div>
            )}
            {(offre.concierge_nom || offre.concierge_tel) && (
              <div className="text-xs text-muted-foreground">
                Contact : {offre.concierge_nom ?? ""} {offre.concierge_tel ? `— ${offre.concierge_tel}` : ""}
              </div>
            )}
          </div>

          {/* Édition offre */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Adresse</Label>
              <Input value={adresse} onChange={e => setAdresse(e.target.value)} />
            </div>
            <div>
              <Label>Prix (CHF, CC)</Label>
              <Input type="number" value={prix} onChange={e => setPrix(e.target.value)} />
            </div>
            <div>
              <Label>Pièces</Label>
              <Input type="number" step="0.5" value={pieces} onChange={e => setPieces(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Statut</Label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="envoyee">Envoyée</SelectItem>
                  <SelectItem value="interesse">Intéressé</SelectItem>
                  <SelectItem value="souhaite_postuler">Souhaite postuler</SelectItem>
                  <SelectItem value="refusee">Refusée</SelectItem>
                  <SelectItem value="candidature">Candidature</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Commentaires</Label>
              <Textarea rows={3} value={commentaires} onChange={e => setCommentaires(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Fixer la visite */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" />
              <div className="font-medium">Fixer la visite</div>
              {existingVisit && <Badge variant="secondary">Visite existante — sera mise à jour</Badge>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
              </div>
              <div>
                <Label>Heure</Label>
                <Input type="time" value={visitTime} onChange={e => setVisitTime(e.target.value)} />
              </div>
              <div>
                <Label>Fin (optionnel)</Label>
                <Input type="time" value={visitEndTime} onChange={e => setVisitEndTime(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
