import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DetailHeader, DetailBody, DetailSection, DetailActions, DETAIL_SHEET, dateTimeCH } from "@/components/details/DetailPrimitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  FileText,
  ExternalLink,
  Loader2,
  ChevronDown,
  Code2,
  Copy,
  Megaphone,
  Trash2,
  CheckCircle,
  Send,
  Calendar,
  Sparkles,
  Leaf,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatSwissDateTime } from "@/lib/dateUtils";
import { metaInitials, metaFullName, getSourceBadge, META_STAGES, extractUtm, type MetaLead, type MetaLeadStatus } from "./types";
import { MetaFormAnswers } from "./MetaFormAnswers";

interface Props {
  lead: MetaLead | null;
  open: boolean;
  onClose: () => void;
  agents: any[];
  onUpdate: (id: string, patch: Partial<MetaLead>) => Promise<void>;
  onConvertToClient: (lead: MetaLead) => Promise<void>;
  onDelete: (lead: MetaLead) => Promise<void>;
  converting?: boolean;
}

export function MetaLeadDetailSheet({
  lead, open, onClose, agents, onUpdate, onConvertToClient, onDelete, converting,
}: Props) {
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [status, setStatus] = useState<MetaLeadStatus>("new");
  const [assignedTo, setAssignedTo] = useState<string>("");

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || "");
      setSavedNotes(lead.notes || "");
      setStatus((lead.lead_status as MetaLeadStatus) || "new");
      setAssignedTo(lead.assigned_to || "");
    }
  }, [lead?.id]);

  // Debounced auto-save for notes
  useEffect(() => {
    if (!lead || notes === savedNotes) return;
    const t = setTimeout(() => {
      onUpdate(lead.id, { notes });
      setSavedNotes(notes);
    }, 800);
    return () => clearTimeout(t);
  }, [notes, lead?.id]);

  if (!lead) return null;

  const src = getSourceBadge(lead);
  const stage = META_STAGES.find((s) => s.key === lead.lead_status);
  const utm = extractUtm(lead);
  const hasAttribution = !!(lead.campaign_name || lead.adset_name || lead.ad_name || lead.page_name || lead.ad_reference_label);

  const handleStatusChange = async (next: string) => {
    setStatus(next as MetaLeadStatus);
    await onUpdate(lead.id, { lead_status: next as MetaLeadStatus });
  };

  const handleAssignedChange = async (next: string) => {
    setAssignedTo(next);
    await onUpdate(lead.id, { assigned_to: next || null });
  };

  const handleCopyJson = () => {
    const json = JSON.stringify(lead.raw_meta_payload || {}, null, 2);
    navigator.clipboard.writeText(json);
    toast.success("JSON copié");
  };

  const handleMarkContacted = () => onUpdate(lead.id, { lead_status: "contacted" });

  const lieu = [lead.postal_code, lead.city].filter(Boolean).join(" ");
  const recuLe = dateTimeCH(lead.lead_created_time_meta || lead.created_at);

  const collapsibleTrigger = (Icon: React.ElementType, label: string) => (
    <CollapsibleTrigger className="group flex min-h-[44px] w-full items-center justify-between text-[13px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className={cn(
          DETAIL_SHEET,
          "sm:max-w-[520px] max-md:!inset-x-0 max-md:!inset-y-auto max-md:!bottom-0 max-md:!top-auto max-md:!h-[92dvh] max-md:!w-full max-md:!max-w-full max-md:rounded-t-3xl max-md:border-t max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom",
        )}
      >
        <DetailHeader
          titleAs={SheetTitle}
          descriptionAs={SheetDescription}
          className="pt-5 sm:pt-6"
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {metaInitials(lead)}
              </span>
              Lead Meta
            </span>
          }
          title={metaFullName(lead)}
          subtitle={lieu ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{lieu}</span> : undefined}
          badge={
            <>
              <Badge variant="outline" className={cn("rounded-full text-xs", src.className)}>{src.label}</Badge>
              {stage && <Badge variant="outline" className={cn("rounded-full text-xs", stage.badge)}>{stage.label}</Badge>}
              {lead.is_organic && (
                <Badge variant="outline" className="gap-1 rounded-full border-emerald-500/30 bg-emerald-500/15 text-xs text-emerald-600">
                  <Leaf className="h-3 w-3" /> Organique
                </Badge>
              )}
            </>
          }
        />

        <DetailBody>
          {/* A. Contact */}
          {(lead.email || lead.phone) && (
            <div className="grid grid-cols-2 gap-2">
              {lead.email && (
                <Button variant="outline" asChild className="col-span-2 min-h-11 justify-start gap-2">
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="truncate">{lead.email}</span>
                  </a>
                </Button>
              )}
              {lead.phone && (
                <>
                  <Button variant="outline" asChild className="min-h-11 gap-2">
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="h-4 w-4 text-primary" />
                      Appeler
                    </a>
                  </Button>
                  <Button variant="outline" asChild className="min-h-11 gap-2">
                    <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">
                      <MessageSquare className="h-4 w-4 text-emerald-500" />
                      WhatsApp
                    </a>
                  </Button>
                </>
              )}
            </div>
          )}

          {/* B. Formulaire Facebook */}
          <DetailSection title="Formulaire Facebook" icon={FileText}>
            {lead.form_name && <p className="text-[15px] font-semibold text-foreground">{lead.form_name}</p>}
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground first-letter:uppercase">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="first-letter:uppercase">{recuLe}</span>
            </p>
            {lead.imported_at && lead.lead_created_time_meta && (
              <p className="mt-0.5 pl-5 text-xs text-muted-foreground">
                Importé dans le CRM le {formatSwissDateTime(lead.imported_at)}
              </p>
            )}
            <div className="mt-3">
              <MetaFormAnswers lead={lead} />
            </div>
          </DetailSection>

          {/* C. Gestion CRM */}
          <DetailSection title="Gestion CRM">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[13px] text-muted-foreground">Statut</label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {META_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[13px] text-muted-foreground">Assigné à</label>
                <Select value={assignedTo || "__none__"} onValueChange={(v) => handleAssignedChange(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Non assigné" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Non assigné</SelectItem>
                    {agents.map((a) => {
                      const p = a.profiles as any;
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          {p?.prenom || ""} {p?.nom || ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DetailSection>

          {/* Notes */}
          <DetailSection
            title="Notes"
            icon={FileText}
            action={notes !== savedNotes ? <span className="text-xs italic text-muted-foreground">Enregistrement…</span> : undefined}
          >
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes de suivi (sauvegarde automatique)…"
              rows={4}
              className="text-[15px]"
            />
          </DetailSection>

          {/* D. Attribution publicitaire */}
          {hasAttribution && (
            <DetailSection className="py-1 sm:py-1">
              <Collapsible defaultOpen={false}>
                {collapsibleTrigger(Megaphone, "Attribution publicitaire")}
                <CollapsibleContent className="pb-3">
                  <div className="divide-y divide-border/50">
                    {[
                      ["Page", lead.page_name, lead.page_id],
                      ["Campagne", lead.campaign_name, lead.campaign_id],
                      ["Adset", lead.adset_name, lead.adset_id],
                      ["Annonce", lead.ad_name, lead.ad_id],
                    ].filter(([, v]) => !!v).map(([k, v, id]) => (
                      <div key={k as string} className="flex items-start justify-between gap-4 py-2">
                        <span className="text-sm text-muted-foreground">{k}</span>
                        <div className="min-w-0 break-all text-right text-sm font-medium text-foreground">
                          <div>{v}</div>
                          {id && <div className="font-mono text-xs text-muted-foreground">ID: {id}</div>}
                        </div>
                      </div>
                    ))}
                    {lead.ad_reference_label && (
                      <div className="flex items-start justify-between gap-4 py-2">
                        <span className="text-sm text-muted-foreground">Référence</span>
                        <div className="min-w-0 break-all text-right text-sm font-medium">
                          {lead.ad_reference_url ? (
                            <a
                              href={lead.ad_reference_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {lead.ad_reference_label}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            lead.ad_reference_label
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </DetailSection>
          )}

          {/* E. UTM & Tracking */}
          {Object.keys(utm).length > 0 && (
            <DetailSection className="py-1 sm:py-1">
              <Collapsible defaultOpen={false}>
                {collapsibleTrigger(Hash, "UTM & Tracking")}
                <CollapsibleContent className="pb-3">
                  <div className="divide-y divide-border/50">
                    {Object.entries(utm).map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-4 py-2">
                        <span className="text-sm text-muted-foreground">{k}</span>
                        <span className="min-w-0 break-all text-right text-sm font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </DetailSection>
          )}

          {/* F. JSON brut */}
          <DetailSection className="py-1 sm:py-1">
            <Collapsible defaultOpen={false}>
              {collapsibleTrigger(Code2, "JSON brut Meta")}
              <CollapsibleContent className="space-y-2 pb-3">
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={handleCopyJson} className="gap-1">
                    <Copy className="h-3.5 w-3.5" /> Copier
                  </Button>
                </div>
                <pre className="max-h-[300px] overflow-auto rounded-xl bg-muted/50 p-3 font-mono text-xs">
{JSON.stringify(lead.raw_meta_payload || {}, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </DetailSection>

          <div className="flex justify-center">
            <Button
              variant="ghost"
              className="min-h-11 gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Supprimer définitivement ce lead Meta ?")) {
                  onDelete(lead);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer ce lead
            </Button>
          </div>
        </DetailBody>

        <DetailActions className="sm:[&>*]:flex-[1_1_auto]">
          {lead.email && (
            <Button variant="outline" className="gap-2" asChild>
              <a href={`mailto:${lead.email}?subject=Suivi de votre demande`}>
                <Send className="h-4 w-4 text-primary" />
                Envoyer email de relance
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2"
            disabled={lead.lead_status === "contacted"}
            onClick={handleMarkContacted}
          >
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Marquer contacté
          </Button>
          <Button
            className="gap-2"
            disabled={converting || lead.lead_status === "converted"}
            onClick={() => onConvertToClient(lead)}
          >
            {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {lead.lead_status === "converted" ? "Déjà converti" : "Convertir en client"}
          </Button>
        </DetailActions>
      </SheetContent>
    </Sheet>
  );
}
