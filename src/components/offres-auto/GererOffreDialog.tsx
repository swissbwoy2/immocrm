import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DashBadge } from "@/components/client/dashboard/DashPrimitives";
import { DETAIL_DIALOG, DetailHeader, DetailBody, DetailSection, DetailNotice, DetailActions } from "@/components/details/DetailPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { ExternalLink, Loader2, Save, CalendarPlus, User, MessageSquare, FileCheck, Trash2, AlertTriangle, Users, Pencil, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AdresseMap } from '@/components/maps/AdresseMap';
import { sourceDe, sourceLabel } from './offresAutoModel';

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
  groupe,
}: {
  offre: OffreRow | null;
  /** Toutes les offres de la même annonce (un client par offre). Les infos du bien et la visite sont appliquées à tous. */
  groupe?: OffreRow[] | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  visitAgentIdOverride?: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [prix, setPrix] = useState<string>("");
  const [adresse, setAdresse] = useState<string>("");
  const [pieces, setPieces] = useState<string>("");
  const [statut, setStatut] = useState<string>("envoyee");
  const [commentaires, setCommentaires] = useState<string>("");
  const [visitDate, setVisitDate] = useState<string>("");
  const [visitTime, setVisitTime] = useState<string>("");
  const [visitEndTime, setVisitEndTime] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [statutsGroupe, setStatutsGroupe] = useState<Record<string, string>>({});

  const autres = (groupe ?? []).filter(o => o && o.id !== offre?.id);
  const STATUTS_FERMES = ["refusee", "refuse", "candidature_deposee", "acceptee", "signature_effectuee", "bail_conclu"];

  const existingVisit = offre?.visites?.[0];

  useEffect(() => {
    if (!offre) return;
    setPrix(offre.prix != null ? String(offre.prix) : "");
    setAdresse(offre.adresse ?? "");
    setPieces(offre.pieces != null ? String(offre.pieces) : "");
    setStatut(offre.statut ?? "envoyee");
    setCommentaires(offre.commentaires ?? "");
    setStatutsGroupe(Object.fromEntries((groupe ?? []).map(o => [o.id, o.statut ?? "envoyee"])));
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

      // 1b) Même annonce chez les autres clients : on applique les infos du bien (pas les commentaires, propres à chaque client)
      if (autres.length > 0) {
        const { error: eSib } = await supabase
          .from("offres")
          .update({ prix: parsedPrix, adresse: adresse.trim(), pieces: parsedPieces })
          .in("id", autres.map(o => o.id));
        if (eSib) throw eSib;
        for (const o of autres) {
          const nv = statutsGroupe[o.id];
          if (nv && nv !== (o.statut ?? "envoyee")) {
            const { error: eSt } = await supabase.from("offres").update({ statut: nv }).eq("id", o.id);
            if (eSt) throw eSt;
          }
        }
      }

      // 2) Visit upsert if a date+time provided
      if (visitDate && visitTime) {
        const dateISO = new Date(`${visitDate}T${visitTime}:00`).toISOString();
        const endISO = visitEndTime ? new Date(`${visitDate}T${visitEndTime}:00`).toISOString() : null;
        // La visite vaut pour tous les clients de l'annonce qui ne l'ont pas refusée
        const ouvertes: OffreRow[] = [offre, ...autres.filter(o => !STATUTS_FERMES.includes(statutsGroupe[o.id] ?? o.statut ?? ""))];
        // Un client peut avoir reçu le même bien depuis plusieurs portails : une seule visite par client
        // (on garde l'offre qui a déjà une visite, sinon la première).
        const parClient = new Map<string, OffreRow>();
        for (const o of ouvertes) {
          const k = o.client_id || o.id;
          const deja = parClient.get(k);
          if (!deja || (!deja.visites?.[0]?.id && o.visites?.[0]?.id)) parClient.set(k, o);
        }
        const cibles = Array.from(parClient.values());
        for (const o of cibles) {
          const ev = o.visites?.[0];
          if (ev?.id) {
            const { error: eV } = await supabase
              .from("visites")
              .update({
                date_visite: dateISO,
                date_visite_fin: endISO,
                adresse: adresse.trim(),
              })
              .eq("id", ev.id);
            if (eV) throw eV;
          } else {
            const { error: eV } = await supabase.from("visites").insert({
              offre_id: o.id,
              client_id: o.client_id,
              agent_id: visitAgentIdOverride ?? o.agent_id ?? null,
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
      }

      // 3) Touch offre updated_at to force recompute of needs_agent_action even if visit trigger didn't
      await supabase.from("offres").update({ updated_at: new Date().toISOString() } as any).in("id", [offre.id, ...autres.map(o => o.id)]);

      toast.success(autres.length > 0 ? `Annonce mise à jour pour ${autres.length + 1} clients` : "Offre mise à jour");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  const clientName = `${offre._client?.prenom ?? ""} ${offre._client?.nom ?? ""}`.trim() || "—";

  const HIDDEN_STATUTS = ["candidature_deposee", "acceptee", "signature_effectuee", "bail_conclu", "refusee"];
  const showMarkDeposee = !!offre && !HIDDEN_STATUTS.includes(offre.statut ?? "");

  async function markCandidatureDeposee() {
    if (!offre) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("candidatures")
        .select("id")
        .eq("offre_id", offre.id)
        .maybeSingle();
      if (!existing) {
        const { error: eIns } = await supabase.from("candidatures").insert({
          offre_id: offre.id,
          client_id: offre.client_id,
          statut: "en_attente",
          date_depot: new Date().toISOString(),
          dossier_complet: true,
        } as any);
        if (eIns) throw eIns;
      }
      const { error: eOff } = await supabase
        .from("offres")
        .update({ statut: "candidature_deposee" })
        .eq("id", offre.id);
      if (eOff) throw eOff;
      toast.success("Candidature déposée");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteOffre() {
    if (!offre) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("offres").delete().eq("id", offre.id);
      if (error) throw error;
      toast.success("Offre supprimée");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DETAIL_DIALOG}>
        <DetailHeader
          titleAs={DialogTitle}
          descriptionAs={DialogDescription}
          eyebrow="Gérer l'offre"
          title={clientName}
          subtitle={
            <span className="flex flex-col gap-0.5">
              {offre._client?.email && <span className="break-all">{offre._client.email}</span>}
              {phone && (
                <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 font-medium text-primary">
                  <Phone className="h-3.5 w-3.5" /> {phone}
                </a>
              )}
            </span>
          }
          badge={existingVisit ? <DashBadge tone="success">Visite fixée</DashBadge> : undefined}
        />

        <DetailBody>
          {/* Raccourcis : fiche client, conversation, annonce */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button asChild variant="outline" className="min-h-11">
              <Link to={`/admin/clients/${offre.client_id}`}>
                <User className="mr-1.5 h-4 w-4" /> Fiche client
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link to={`/admin/messagerie?client=${offre.client_id}`}>
                <MessageSquare className="mr-1.5 h-4 w-4" /> Conversation
              </Link>
            </Button>
            {offre.lien_annonce && (
              <Button asChild variant="outline" className="col-span-2 min-h-11 sm:col-span-1">
                <a href={offre.lien_annonce} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-4 w-4" /> Annonce
                </a>
              </Button>
            )}
          </div>

          {offre.needs_agent_action && offre.missing_info && (
            <DetailNotice icon={AlertTriangle} tone="warning">
              <span className="font-semibold">À compléter : </span>{offre.missing_info}
            </DetailNotice>
          )}
          {(offre.concierge_nom || offre.concierge_tel) && (
            <DetailNotice icon={Phone}>
              Contact : {offre.concierge_nom ?? ""} {offre.concierge_tel ? `— ${offre.concierge_tel}` : ""}
            </DetailNotice>
          )}

          {autres.length > 0 && (
            <DetailSection title={`Même annonce chez ${autres.length} autre${autres.length > 1 ? "s" : ""} client${autres.length > 1 ? "s" : ""}`} icon={Users}>
              <p className="text-sm text-muted-foreground">
                Adresse, prix, pièces et visite enregistrés ici s'appliquent à tous (sauf aux clients qui ont refusé ou déjà postulé). Le statut se règle client par client.
              </p>
              <div className="mt-2 divide-y divide-border/50">
                {autres.map(o => (
                  <div key={o.id} className="flex min-h-[52px] items-center justify-between gap-2 py-2">
                    <span className="min-w-0 truncate text-[15px]">{`${o._client?.prenom ?? ""} ${o._client?.nom ?? ""}`.trim() || o._client?.email || "Client"}<span className="text-xs text-muted-foreground"> · {sourceLabel(sourceDe(o.lien_annonce))}</span></span>
                    <Select value={statutsGroupe[o.id] ?? o.statut ?? "envoyee"} onValueChange={v => setStatutsGroupe(prev => ({ ...prev, [o.id]: v }))}>
                      <SelectTrigger className="h-10 w-[160px] shrink-0 sm:w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="envoyee">Envoyée</SelectItem>
                        <SelectItem value="interesse">Intéressé</SelectItem>
                        <SelectItem value="souhaite_postuler">Souhaite postuler</SelectItem>
                        <SelectItem value="refusee">Refusée</SelectItem>
                        <SelectItem value="candidature">Candidature</SelectItem>
                        {!["envoyee","interesse","souhaite_postuler","refusee","candidature"].includes(statutsGroupe[o.id] ?? o.statut ?? "envoyee") && (
                          <SelectItem value={statutsGroupe[o.id] ?? o.statut ?? "envoyee"}>{statutsGroupe[o.id] ?? o.statut}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Édition offre */}
          <DetailSection title="Offre" icon={Pencil}>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Adresse</Label>
                <Input value={adresse} onChange={e => setAdresse(e.target.value)} />
                <AdresseMap address={offre?.adresse} height="compact" className="mt-2" />
              </div>
              <div className="space-y-1.5">
                <Label>Prix (CHF, CC)</Label>
                <Input type="number" value={prix} onChange={e => setPrix(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Pièces</Label>
                <Input type="number" step="0.5" value={pieces} onChange={e => setPieces(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
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
              <div className="col-span-2 space-y-1.5">
                <Label>Note de suivi (visible par le client)</Label>
                <Textarea rows={3} value={commentaires} onChange={e => setCommentaires(e.target.value)} placeholder="Ex. Visite du 20.10.2026 passée : annonceur recontacté pour une nouvelle date, en attente." />
              </div>
            </div>
          </DetailSection>

          {/* Fixer la visite */}
          <DetailSection
            title="Fixer la visite"
            icon={CalendarPlus}
            action={existingVisit ? <DashBadge tone="muted">Sera mise à jour</DashBadge> : undefined}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label>Date</Label>
                <Input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Heure</Label>
                <Input type="time" value={visitTime} onChange={e => setVisitTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fin (optionnel)</Label>
                <Input type="time" value={visitEndTime} onChange={e => setVisitEndTime(e.target.value)} />
              </div>
            </div>
          </DetailSection>

          <div className="flex justify-center pt-1">
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="min-h-11 text-destructive hover:text-destructive" disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Supprimer l'offre
                </Button>
              }
              title="Supprimer l'offre"
              description="Supprimer définitivement cette offre ? Cette action est irréversible et retire aussi la candidature/visite liée."
              confirmText="Supprimer"
              cancelText="Annuler"
              variant="destructive"
              onConfirm={deleteOffre}
            />
          </div>
        </DetailBody>

        <DetailActions>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className={showMarkDeposee ? "max-sm:hidden" : undefined}>Annuler</Button>
          {showMarkDeposee && (
            <Button variant="outline" onClick={markCandidatureDeposee} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
              Marquer candidature déposée
            </Button>
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </DetailActions>
      </DialogContent>
    </Dialog>
  );
}
