import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Phone, Mail, MessageSquare, MapPin, Wallet, ShieldCheck, ShieldX,
  CheckCircle, Circle, Send, UserPlus, Trash2, Loader2, Calendar,
  Briefcase, Globe, Award, FileText
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getLeadSource } from "@/lib/lead-source";
import { initials, fullName, type Lead, type PhoneAppointment } from "./types";

interface Props {
  lead: Lead | null;
  appt: PhoneAppointment | null;
  open: boolean;
  onClose: () => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onToggleContacted: (lead: Lead) => void;
  onSendRelance: (lead: Lead) => void;
  onInviteAsClient: (lead: Lead) => void;
  onConfirmAppt: (apptId: string) => void;
  onDelete: (lead: Lead) => void;
  invitingLeadId: string | null;
  confirmingApptId: string | null;
}

const formatStatutEmploi = (v: string | null): string => {
  if (!v) return "";
  const map: Record<string, string> = {
    salarie: "Salarié",
    salarié: "Salarié",
    independant: "Indépendant",
    indépendant: "Indépendant",
    etudiant: "Étudiant",
    étudiant: "Étudiant",
    retraite: "Retraité",
    retraité: "Retraité",
    sans_emploi: "Sans emploi",
    autre: "Autre",
  };
  return map[v.toLowerCase()] || v;
};

const formatPermis = (v: string | null): string => {
  if (!v) return "";
  if (["B", "C", "G", "L", "F", "N"].includes(v)) return `Permis ${v}`;
  if (v.toLowerCase() === "suisse") return "Suisse";
  return v;
};

type Tone = "ok" | "warn" | "ko" | "neutral";
const toneClasses: Record<Tone, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  ko: "text-rose-600 dark:text-rose-400",
  neutral: "text-muted-foreground",
};

const ToneIcon = ({ tone }: { tone: Tone }) => {
  if (tone === "ok") return <ShieldCheck className={cn("h-3.5 w-3.5", toneClasses.ok)} />;
  if (tone === "ko") return <ShieldX className={cn("h-3.5 w-3.5", toneClasses.ko)} />;
  if (tone === "warn") return <Circle className={cn("h-3.5 w-3.5", toneClasses.warn)} />;
  return <Circle className={cn("h-3.5 w-3.5", toneClasses.neutral)} />;
};

const FormRow = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: Tone }) => (
  <div className="grid grid-cols-[140px_1fr] gap-2 items-start">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("font-medium break-words inline-flex items-center gap-1.5", tone && toneClasses[tone])}>
      {tone && <ToneIcon tone={tone} />}
      <span>{value}</span>
    </span>
  </div>
);

export function LeadDetailSheet({
  lead, appt, open, onClose, onUpdateNotes, onToggleContacted,
  onSendRelance, onInviteAsClient, onConfirmAppt, onDelete,
  invitingLeadId, confirmingApptId,
}: Props) {
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || "");
      setSavedNotes(lead.notes || "");
    }
  }, [lead?.id]);

  // Debounced auto-save
  useEffect(() => {
    if (!lead || notes === savedNotes) return;
    const t = setTimeout(() => {
      onUpdateNotes(lead.id, notes);
      setSavedNotes(notes);
    }, 800);
    return () => clearTimeout(t);
  }, [notes, lead?.id]);

  if (!lead) return null;
  const src = getLeadSource(lead);

  const canInvite = ["landing_analyse_dossier", "landing_quickform", "landing_quickform_achat"].includes(lead.source || "");
  const isLouer = lead.type_recherche === "Louer";
  const isAcheter = lead.type_recherche === "Acheter";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] overflow-y-auto p-0 max-md:!inset-x-0 max-md:!inset-y-auto max-md:!bottom-0 max-md:!top-auto max-md:!h-[92vh] max-md:!w-full max-md:!max-w-full max-md:rounded-t-2xl max-md:border-t max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/15 to-primary/5 p-6 border-b">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold flex items-center justify-center text-lg flex-shrink-0">
              {initials(lead)}
            </div>
            <div className="flex-1 min-w-0">
              <SheetHeader className="space-y-1 text-left">
                <SheetTitle className="text-lg truncate">{fullName(lead)}</SheetTitle>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={cn("text-[10px]", src.badgeClass)}>{src.label}</Badge>
                  {lead.type_recherche && <Badge variant="secondary" className="text-[10px]">{lead.type_recherche}</Badge>}
                  {lead.contacted ? (
                    <Badge className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Contacté</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Non contacté</Badge>
                  )}
                </div>
              </SheetHeader>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact actions */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</h4>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" asChild className="justify-start gap-2 h-auto py-2.5">
                <a href={`mailto:${lead.email}`}>
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="truncate">{lead.email}</span>
                </a>
              </Button>
              {lead.telephone && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" asChild className="justify-start gap-2 h-auto py-2.5">
                    <a href={`tel:${lead.telephone}`}>
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="truncate">Appeler</span>
                    </a>
                  </Button>
                  <Button variant="outline" asChild className="justify-start gap-2 h-auto py-2.5">
                    <a
                      href={`https://wa.me/${lead.telephone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageSquare className="h-4 w-4 text-emerald-500" />
                      <span className="truncate">WhatsApp</span>
                    </a>
                  </Button>
                </div>
              )}
              {(lead.localite || lead.budget) && (
                <div className="text-xs text-muted-foreground flex flex-wrap gap-3 pt-1">
                  {lead.localite && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.localite}</span>}
                  {lead.budget && <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" />{lead.budget}</span>}
                </div>
              )}
            </div>
          </section>

          {/* RDV téléphonique */}
          {appt && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rendez-vous téléphonique</h4>
              <div className={cn(
                "rounded-lg p-3 border",
                appt.status === "confirme"
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-amber-500/10 border-amber-500/30"
              )}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(appt.slot_start), "EEEE d MMMM yyyy à HH'h'mm", { locale: fr })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Statut : {appt.status === "confirme" ? "Confirmé" : "En attente"}
                </div>
                {appt.status === "en_attente" && (
                  <Button
                    size="sm"
                    className="w-full mt-3 gap-2"
                    onClick={() => onConfirmAppt(appt.id)}
                    disabled={confirmingApptId === appt.id}
                  >
                    {confirmingApptId === appt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Confirmer + envoyer .ics
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* Réponses du formulaire */}
          {lead.type_recherche !== "Vendre" && (
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Réponses du formulaire
              </h4>
              <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
                {/* Statut qualification */}
                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                  {lead.is_qualified === true ? (
                    <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1"><ShieldCheck className="h-3 w-3" />Qualifié</Badge>
                  ) : lead.is_qualified === false ? (
                    <Badge variant="destructive" className="gap-1"><ShieldX className="h-3 w-3" />Non qualifié</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1"><Circle className="h-3 w-3" />À évaluer</Badge>
                  )}
                </div>

                {/* Recherche */}
                {lead.type_recherche && <FormRow label="Type de recherche" value={lead.type_recherche} />}
                {lead.type_bien && <FormRow label="Type de bien" value={lead.type_bien} />}
                {lead.localite && (
                  <FormRow label="Région" value={<span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.localite}</span>} />
                )}
                {lead.budget && (
                  <FormRow label={isAcheter ? "Budget achat" : "Budget mensuel"} value={<span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" />{lead.budget}</span>} />
                )}

                {/* Locataires */}
                {isLouer && (lead.statut_emploi || lead.permis_nationalite || lead.poursuites !== null || lead.a_garant !== null) && (
                  <div className="pt-2 border-t border-border/40 space-y-2">
                    {lead.statut_emploi && (
                      <FormRow
                        label="Statut professionnel"
                        value={<span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{formatStatutEmploi(lead.statut_emploi)}</span>}
                        tone={lead.statut_emploi === "salarie" || lead.statut_emploi === "salarié" ? "ok" : "warn"}
                      />
                    )}
                    {lead.permis_nationalite && (
                      <FormRow
                        label="Permis / Nationalité"
                        value={<span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{formatPermis(lead.permis_nationalite)}</span>}
                        tone={["B", "C", "Suisse"].includes(lead.permis_nationalite) ? "ok" : "warn"}
                      />
                    )}
                    {lead.poursuites !== null && (
                      <FormRow
                        label="Extrait de poursuites"
                        value={lead.poursuites ? "Oui" : "Aucune"}
                        tone={lead.poursuites ? "ko" : "ok"}
                      />
                    )}
                    {lead.a_garant !== null && (
                      <FormRow
                        label="Garant disponible"
                        value={lead.a_garant ? "Oui" : "Non"}
                        tone={lead.a_garant ? "ok" : "neutral"}
                      />
                    )}
                  </div>
                )}

                {/* Acheteurs */}
                {isAcheter && (lead.accord_bancaire !== null || lead.apport_personnel) && (
                  <div className="pt-2 border-t border-border/40 space-y-2">
                    {lead.accord_bancaire !== null && (
                      <FormRow
                        label="Accord bancaire"
                        value={lead.accord_bancaire ? "Oui" : "Non"}
                        tone={lead.accord_bancaire ? "ok" : "warn"}
                      />
                    )}
                    {lead.apport_personnel && (
                      <FormRow
                        label="Apport personnel"
                        value={<span className="inline-flex items-center gap-1"><Award className="h-3 w-3" />{lead.apport_personnel}</span>}
                      />
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Origine */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Origine</h4>
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              {[
                ["Source", src.label],
                ["Source brute", lead.source],
                ["Formulaire", lead.formulaire],
                ["UTM Source", lead.utm_source],
                ["UTM Medium", lead.utm_medium],
                ["UTM Campaign", lead.utm_campaign],
                ["UTM Content", lead.utm_content],
                ["UTM Term", lead.utm_term],
              ].filter(([, v]) => !!v).map(([k, v]) => (
                <div key={k as string} className="grid grid-cols-[110px_1fr] gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium break-all">{v}</span>
                </div>
              ))}
              {lead.created_at && (
                <div className="grid grid-cols-[110px_1fr] gap-2 pt-1 border-t border-border/40 mt-2">
                  <span className="text-muted-foreground">Créé le</span>
                  <span className="font-medium">{format(new Date(lead.created_at), "d MMM yyyy HH:mm", { locale: fr })}</span>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Actions */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Actions</h4>
            {canInvite && (
              <Button
                className="w-full justify-start gap-2"
                onClick={() => onInviteAsClient(lead)}
                disabled={invitingLeadId === lead.id}
              >
                {invitingLeadId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Inviter comme client
              </Button>
            )}
            {!lead.contacted && (
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onSendRelance(lead)}>
                <Send className="h-4 w-4 text-primary" />
                Envoyer email de relance
              </Button>
            )}
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onToggleContacted(lead)}>
              {lead.contacted ? <Circle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
              {lead.contacted ? "Marquer non contacté" : "Marquer contacté"}
            </Button>
          </section>

          {/* Notes */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Notes
              {notes !== savedNotes && <span className="text-[10px] text-muted-foreground/60 italic ml-auto">enregistrement…</span>}
            </h4>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter des notes de suivi (sauvegarde automatique)…"
              rows={4}
            />
          </section>

          <Separator />

          {/* Danger */}
          <section>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm("Supprimer définitivement ce lead ?")) {
                  onDelete(lead);
                  onClose();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer ce lead
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
