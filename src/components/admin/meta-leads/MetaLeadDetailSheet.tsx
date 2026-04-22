import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Phone, Mail, MessageSquare, MapPin, FileText, ExternalLink, Loader2,
  ChevronDown, Code2, Copy, Megaphone, Trash2, CheckCircle, Send,
  UserPlus, Calendar, Sparkles, Leaf, Hash,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] overflow-y-auto p-0 max-md:!inset-x-0 max-md:!inset-y-auto max-md:!bottom-0 max-md:!top-auto max-md:!h-[92vh] max-md:!w-full max-md:!max-w-full max-md:rounded-t-2xl max-md:border-t max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1877F2]/15 to-[#1877F2]/5 p-6 border-b">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#1877F2] to-[#1877F2]/60 text-white font-bold flex items-center justify-center text-lg flex-shrink-0">
              {metaInitials(lead)}
            </div>
            <div className="flex-1 min-w-0">
              <SheetHeader className="space-y-1 text-left">
                <SheetTitle className="text-lg truncate">{metaFullName(lead)}</SheetTitle>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={cn("text-[10px]", src.className)}>{src.label}</Badge>
                  {stage && <Badge variant="outline" className={cn("text-[10px]", stage.badge)}>{stage.label}</Badge>}
                  {lead.is_organic && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
                      <Leaf className="h-3 w-3" /> Organique
                    </Badge>
                  )}
                </div>
              </SheetHeader>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* A. Contact */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</h4>
            <div className="grid grid-cols-1 gap-2">
              {lead.email && (
                <Button variant="outline" asChild className="justify-start gap-2 h-auto py-2.5">
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="truncate">{lead.email}</span>
                  </a>
                </Button>
              )}
              {lead.phone && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" asChild className="justify-start gap-2 h-auto py-2.5">
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="truncate">Appeler</span>
                    </a>
                  </Button>
                  <Button variant="outline" asChild className="justify-start gap-2 h-auto py-2.5">
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageSquare className="h-4 w-4 text-emerald-500" />
                      <span className="truncate">WhatsApp</span>
                    </a>
                  </Button>
                </div>
              )}
              {(lead.city || lead.postal_code) && (
                <div className="text-xs text-muted-foreground flex flex-wrap gap-3 pt-1">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[lead.postal_code, lead.city].filter(Boolean).join(" ")}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* B. Formulaire Facebook ⭐ */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <FileText className="h-3 w-3" /> Formulaire Facebook
              </h4>
              {lead.form_name && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{lead.form_name}</span>
              )}
            </div>
            <div className="rounded-lg border bg-gradient-to-br from-[#1877F2]/5 to-transparent p-3 mb-3">
              {lead.form_name && (
                <div className="font-semibold text-sm text-foreground mb-1.5">{lead.form_name}</div>
              )}
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>
                  {lead.lead_created_time_meta
                    ? format(new Date(lead.lead_created_time_meta), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })
                    : format(new Date(lead.created_at), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                </span>
              </div>
              {lead.imported_at && lead.lead_created_time_meta && (
                <div className="text-[10px] text-muted-foreground/70 mt-1 ml-[18px]">
                  Importé dans le CRM le {formatSwissDateTime(lead.imported_at)}
                </div>
              )}
            </div>
            <MetaFormAnswers lead={lead} />
          </section>

          {/* C. Attribution publicitaire */}
          {hasAttribution && (
            <section>
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 hover:text-foreground cursor-pointer">
                  <span className="flex items-center gap-1">
                    <Megaphone className="h-3 w-3" /> Attribution publicitaire
                  </span>
                  <ChevronDown className="h-3 w-3 transition-transform data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5 mt-2">
                  <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                    {[
                      ["Page", lead.page_name, lead.page_id],
                      ["Campagne", lead.campaign_name, lead.campaign_id],
                      ["Adset", lead.adset_name, lead.adset_id],
                      ["Annonce", lead.ad_name, lead.ad_id],
                    ].filter(([, v]) => !!v).map(([k, v, id]) => (
                      <div key={k as string} className="grid grid-cols-[90px_1fr] gap-2">
                        <span className="text-muted-foreground">{k}</span>
                        <div className="font-medium break-all">
                          <div>{v}</div>
                          {id && <div className="text-[10px] text-muted-foreground/60 font-mono">ID: {id}</div>}
                        </div>
                      </div>
                    ))}
                    {lead.ad_reference_label && (
                      <div className="grid grid-cols-[90px_1fr] gap-2 pt-2 mt-2 border-t border-border/40">
                        <span className="text-muted-foreground">Référence</span>
                        <div className="font-medium break-all">
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
            </section>
          )}

          {/* D. UTM & Tracking */}
          {Object.keys(utm).length > 0 && (
            <section>
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 hover:text-foreground cursor-pointer">
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" /> UTM & Tracking
                  </span>
                  <ChevronDown className="h-3 w-3 transition-transform data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                    {Object.entries(utm).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </section>
          )}

          <Separator />

          {/* E. Gestion CRM */}
          <section>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Gestion CRM</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Statut</label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {META_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Assigné à</label>
                <Select value={assignedTo || "__none__"} onValueChange={(v) => handleAssignedChange(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Non assigné" /></SelectTrigger>
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
              placeholder="Notes de suivi (sauvegarde automatique)…"
              rows={4}
            />
          </section>

          {/* F. JSON brut */}
          <section>
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 hover:text-foreground cursor-pointer">
                <span className="flex items-center gap-1">
                  <Code2 className="h-3 w-3" /> JSON brut Meta
                </span>
                <ChevronDown className="h-3 w-3 transition-transform data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={handleCopyJson} className="h-7 gap-1 text-xs">
                    <Copy className="h-3 w-3" /> Copier
                  </Button>
                </div>
                <pre className="rounded-md border bg-muted/40 p-3 text-[10px] font-mono overflow-x-auto max-h-[300px] overflow-y-auto">
{JSON.stringify(lead.raw_meta_payload || {}, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </section>

          <Separator />

          {/* G. Actions */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Actions</h4>
            <Button
              className="w-full justify-start gap-2 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white"
              disabled={converting || lead.lead_status === "converted"}
              onClick={() => onConvertToClient(lead)}
            >
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {lead.lead_status === "converted" ? "Déjà converti" : "Convertir en client"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={lead.lead_status === "contacted"}
              onClick={handleMarkContacted}
            >
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Marquer contacté
            </Button>
            {lead.email && (
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <a href={`mailto:${lead.email}?subject=Suivi de votre demande`}>
                  <Send className="h-4 w-4 text-primary" />
                  Envoyer email de relance
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm("Supprimer définitivement ce lead Meta ?")) {
                  onDelete(lead);
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
