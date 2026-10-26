import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DashBadge } from "@/components/client/dashboard/DashPrimitives";
import {
  DETAIL_SHEET,
  DetailHeader,
  DetailBody,
  KeyFacts,
  DetailSection,
  DetailRow,
  DetailRows,
  DetailText,
  DetailActions,
  chfDetail,
  dateTimeCH,
} from "@/components/details/DetailPrimitives";
import {
  Phone, Mail, MessageSquare, MapPin, Wallet, ShieldCheck, ShieldX,
  CheckCircle, Circle, Send, UserPlus, Trash2, Loader2, Calendar,
  Briefcase, Globe, Award, FileText
} from "lucide-react";
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
  <div className="flex min-h-[44px] items-start justify-between gap-4 py-2.5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={cn("inline-flex items-center gap-1.5 break-words text-right text-[15px] font-medium", tone ? toneClasses[tone] : "text-foreground")}>
      {tone && <ToneIcon tone={tone} />}
      <span>{value}</span>
    </span>
  </div>
);

const QUALIF: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "danger" }> = {
  qualifie: { label: "Qualifié", tone: "success" },
  a_verifier: { label: "À vérifier", tone: "warning" },
  a_reorienter: { label: "À réorienter", tone: "neutral" },
  non_qualifie: { label: "Non qualifié", tone: "danger" },
};

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

  const qualif = lead.statut_qualification ? QUALIF[lead.statut_qualification] : null;
  const origine = [
    ["Source", src.label],
    ["Source brute", lead.source],
    ["Formulaire", lead.formulaire],
    ["UTM Source", lead.utm_source],
    ["UTM Medium", lead.utm_medium],
    ["UTM Campaign", lead.utm_campaign],
    ["UTM Content", lead.utm_content],
    ["UTM Term", lead.utm_term],
  ].filter(([, v]) => !!v) as [string, string][];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className={cn(
          DETAIL_SHEET,
          "sm:max-w-[480px] max-md:!inset-x-0 max-md:!inset-y-auto max-md:!bottom-0 max-md:!top-auto max-md:!h-[92dvh] max-md:!w-full max-md:!max-w-full max-md:rounded-t-3xl max-md:border-t max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom",
        )}
      >
        <DetailHeader
          titleAs={SheetTitle}
          descriptionAs={SheetDescription}
          className="pt-5 sm:pt-6"
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials(lead)}
              </span>
              Prospect
            </span>
          }
          title={fullName(lead)}
          subtitle={lead.created_at ? `Reçu le ${dateTimeCH(lead.created_at, { day: "numeric", month: "long", year: "numeric" })}` : undefined}
          badge={
            <>
              <Badge variant="outline" className={cn("rounded-full text-xs", src.badgeClass)}>{src.label}</Badge>
              {lead.type_recherche && <DashBadge tone="muted">{lead.type_recherche}</DashBadge>}
              {lead.contacted ? <DashBadge tone="success">Contacté</DashBadge> : <DashBadge tone="warning">Non contacté</DashBadge>}
            </>
          }
        />

        <DetailBody>
          {/* Contact */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild className="col-span-2 min-h-11 justify-start gap-2">
              <a href={`mailto:${lead.email}`}>
                <Mail className="h-4 w-4 text-primary" />
                <span className="truncate">{lead.email}</span>
              </a>
            </Button>
            {lead.telephone && (
              <>
                <Button variant="outline" asChild className="min-h-11 gap-2">
                  <a href={`tel:${lead.telephone}`}>
                    <Phone className="h-4 w-4 text-primary" />
                    Appeler
                  </a>
                </Button>
                <Button variant="outline" asChild className="min-h-11 gap-2">
                  <a href={`https://wa.me/${lead.telephone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">
                    <MessageSquare className="h-4 w-4 text-emerald-500" />
                    WhatsApp
                  </a>
                </Button>
              </>
            )}
          </div>

          <KeyFacts
            className="sm:grid-cols-2"
            items={[
              lead.localite ? { label: "Région", value: lead.localite, icon: MapPin } : null,
              lead.budget ? { label: isAcheter ? "Budget achat" : "Budget mensuel", value: lead.budget, icon: Wallet } : null,
              lead.type_bien ? { label: "Type de bien", value: lead.type_bien } : null,
            ]}
          />

          {/* RDV au bureau */}
          {appt && (
            <DetailSection
              title="Rendez-vous au bureau"
              icon={Calendar}
              action={<DashBadge tone={appt.status === "confirme" ? "success" : "warning"}>{appt.status === "confirme" ? "Confirmé" : "En attente"}</DashBadge>}
            >
              <p className="text-[15px] font-semibold first-letter:uppercase text-foreground">{dateTimeCH(appt.slot_start)}</p>
              {appt.status === "en_attente" && (
                <Button
                  className="mt-3 min-h-11 w-full gap-2"
                  onClick={() => onConfirmAppt(appt.id)}
                  disabled={confirmingApptId === appt.id}
                >
                  {confirmingApptId === appt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Confirmer + envoyer .ics
                </Button>
              )}
            </DetailSection>
          )}

          {/* Fiche prospect — préqualification automatique */}
          {lead.statut_qualification && (
            <DetailSection title="Fiche prospect" icon={ShieldCheck}>
              <div className="flex flex-wrap items-center gap-1.5">
                {qualif && <DashBadge tone={qualif.tone}>{qualif.label}</DashBadge>}
                {lead.ratio_revenu_loyer != null && <DashBadge tone="neutral">Ratio {lead.ratio_revenu_loyer}x</DashBadge>}
                {lead.risque_niveau && <DashBadge tone="neutral">Risque {lead.risque_niveau}</DashBadge>}
                {lead.requires_manual_validation && <DashBadge tone="danger">Validation manuelle requise</DashBadge>}
              </div>
              {lead.resume_profil && <DetailText className="mt-3">{lead.resume_profil}</DetailText>}
              <DetailRows className="mt-2">
                <DetailRow label="Motif" value={lead.motif_qualification} />
                <DetailRow label="Recommandation" value={lead.recommandation_agent} />
                <DetailRow label="Statut CH" value={lead.statut_suisse} />
                <DetailRow label="Situation pro" value={lead.situation_pro} />
                <DetailRow label="Poursuites" value={lead.poursuites_statut} />
                <DetailRow label="Logement" value={lead.nb_pieces} />
                <DetailRow label="Localité" value={lead.localite_recherche} />
                <DetailRow label="Budget" value={lead.budget_max_chf != null ? chfDetail(lead.budget_max_chf) : null} />
                <DetailRow label="Revenu net" value={lead.revenu_net_mensuel_chf != null ? chfDetail(lead.revenu_net_mensuel_chf) : null} />
              </DetailRows>
            </DetailSection>
          )}

          {/* Réponses du formulaire */}
          {lead.type_recherche !== "Vendre" && (
            <DetailSection
              title="Réponses du formulaire"
              icon={FileText}
              action={
                lead.is_qualified === true ? <DashBadge tone="success">Qualifié</DashBadge>
                  : lead.is_qualified === false ? <DashBadge tone="danger">Non qualifié</DashBadge>
                  : <DashBadge tone="muted">À évaluer</DashBadge>
              }
            >
              <div className="divide-y divide-border/50">
                {lead.type_recherche && <FormRow label="Type de recherche" value={lead.type_recherche} />}

                {isLouer && lead.statut_emploi && (
                  <FormRow
                    label="Statut professionnel"
                    value={<span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{formatStatutEmploi(lead.statut_emploi)}</span>}
                    tone={lead.statut_emploi === "salarie" || lead.statut_emploi === "salarié" ? "ok" : "warn"}
                  />
                )}
                {isLouer && lead.permis_nationalite && (
                  <FormRow
                    label="Permis / Nationalité"
                    value={<span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{formatPermis(lead.permis_nationalite)}</span>}
                    tone={["B", "C", "Suisse"].includes(lead.permis_nationalite) ? "ok" : "warn"}
                  />
                )}
                {isLouer && lead.poursuites !== null && (
                  <FormRow label="Extrait de poursuites" value={lead.poursuites ? "Oui" : "Aucune"} tone={lead.poursuites ? "ko" : "ok"} />
                )}
                {isLouer && lead.a_garant !== null && (
                  <FormRow label="Garant disponible" value={lead.a_garant ? "Oui" : "Non"} tone={lead.a_garant ? "ok" : "neutral"} />
                )}

                {isAcheter && lead.accord_bancaire !== null && (
                  <FormRow label="Accord bancaire" value={lead.accord_bancaire ? "Oui" : "Non"} tone={lead.accord_bancaire ? "ok" : "warn"} />
                )}
                {isAcheter && lead.apport_personnel && (
                  <FormRow
                    label="Apport personnel"
                    value={<span className="inline-flex items-center gap-1"><Award className="h-3.5 w-3.5" />{lead.apport_personnel}</span>}
                  />
                )}
              </div>
            </DetailSection>
          )}

          {/* Notes */}
          <DetailSection
            title="Notes"
            icon={FileText}
            action={notes !== savedNotes ? <span className="text-xs italic text-muted-foreground">Enregistrement…</span> : undefined}
          >
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter des notes de suivi (sauvegarde automatique)…"
              rows={4}
              className="text-[15px]"
            />
          </DetailSection>

          {/* Origine */}
          {(origine.length > 0 || lead.created_at) && (
            <DetailSection title="Origine">
              <div className="divide-y divide-border/50">
                {origine.map(([k, v]) => (
                  <div key={k} className="flex min-h-[40px] items-start justify-between gap-4 py-2">
                    <span className="text-sm text-muted-foreground">{k}</span>
                    <span className="break-all text-right text-sm font-medium text-foreground">{v}</span>
                  </div>
                ))}
                {lead.created_at && (
                  <div className="flex min-h-[40px] items-start justify-between gap-4 py-2">
                    <span className="text-sm text-muted-foreground">Créé le</span>
                    <span className="text-right text-sm font-medium text-foreground">
                      {dateTimeCH(lead.created_at, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
              </div>
            </DetailSection>
          )}

          <div className="flex justify-center">
            <Button
              variant="ghost"
              className="min-h-11 gap-2 text-destructive hover:text-destructive"
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
          </div>
        </DetailBody>

        <DetailActions className="sm:[&>*]:flex-[1_1_auto]">
          {!lead.contacted && (
            <Button variant="outline" className="gap-2" onClick={() => onSendRelance(lead)}>
              <Send className="h-4 w-4 text-primary" />
              Envoyer email de relance
            </Button>
          )}
          <Button variant={canInvite ? "outline" : "default"} className="gap-2" onClick={() => onToggleContacted(lead)}>
            {lead.contacted ? <Circle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            {lead.contacted ? "Marquer non contacté" : "Marquer contacté"}
          </Button>
          {canInvite && (
            <Button
              className="gap-2"
              onClick={() => onInviteAsClient(lead)}
              disabled={invitingLeadId === lead.id}
            >
              {invitingLeadId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Inviter comme client
            </Button>
          )}
        </DetailActions>
      </SheetContent>
    </Sheet>
  );
}
