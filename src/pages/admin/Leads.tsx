import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { 
  PremiumTable, 
  PremiumTableHeader, 
  PremiumTableRow, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow 
} from "@/components/premium/PremiumTable";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  Circle, 
  Trash2, 
  MessageSquare, 
  Download,
  Mail,
  MapPin,
  Wallet,
  Phone,
  User,
  ShieldCheck,
  ShieldX,
  Zap,
  Send,
  Loader2,
  Upload,
  FileText as FileTextIcon,
  Target,
} from "lucide-react";

type Lead = {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  localite: string | null;
  budget: string | null;
  statut_emploi: string | null;
  permis_nationalite: string | null;
  poursuites: boolean | null;
  a_garant: boolean | null;
  is_qualified: boolean | null;
  source: string | null;
  created_at: string | null;
  contacted: boolean | null;
  notes: string | null;
  formulaire: string | null;
};

export default function Leads() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "contacted" | "not_contacted" | "qualified" | "not_qualified">("all");
  const [formulaireFilter, setFormulaireFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");
  const [showRelanceDialog, setShowRelanceDialog] = useState(false);
  const [relanceSending, setRelanceSending] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", filter, formulaireFilter],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "contacted") {
        query = query.eq("contacted", true);
      } else if (filter === "not_contacted") {
        query = query.or("contacted.is.null,contacted.eq.false");
      } else if (filter === "qualified") {
        query = query.eq("is_qualified", true);
      } else if (filter === "not_qualified") {
        query = query.eq("is_qualified", false);
      }

      if (formulaireFilter !== "all") {
        query = query.eq("formulaire", formulaireFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });

  const { data: formulaires = [] } = useQuery({
    queryKey: ["lead-formulaires"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("formulaire")
        .not("formulaire", "is", null);
      if (error) throw error;
      const unique = [...new Set((data as any[]).map((d) => d.formulaire).filter(Boolean))];
      return unique as string[];
    },
  });

  const toggleContacted = useMutation({
    mutationFn: async ({ id, contacted }: { id: string; contacted: boolean }) => {
      const { error } = await supabase
        .from("leads")
        .update({ contacted })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Statut mis à jour");
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ notes })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setSelectedLead(null);
      toast.success("Notes enregistrées");
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead supprimé");
    },
  });

  const sendRelance = async (leadIds: string[]) => {
    setRelanceSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-lead-relance', {
        body: { lead_ids: leadIds },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(`${data.sent} email(s) de relance envoyé(s) !`, {
        description: data.errors > 0 ? `${data.errors} erreur(s)` : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowRelanceDialog(false);
    } catch (err) {
      toast.error("Erreur lors de l'envoi", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      });
    } finally {
      setRelanceSending(false);
    }
  };

  const sendSingleRelance = async (lead: Lead) => {
    toast.loading(`Envoi à ${lead.prenom || lead.email}...`, { id: `relance-${lead.id}` });
    try {
      const { data, error } = await supabase.functions.invoke('send-lead-relance', {
        body: { lead_ids: [lead.id] },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success(`Email envoyé à ${lead.prenom || lead.email}`, { id: `relance-${lead.id}` });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (err) {
      toast.error(`Erreur pour ${lead.email}`, { 
        id: `relance-${lead.id}`,
        description: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  };

  const exportCSV = () => {
    const headers = ["Prénom", "Nom", "Email", "Téléphone", "Localité", "Budget", "Statut Emploi", "Permis", "Poursuites", "Garant", "Qualifié", "Date", "Contacté", "Notes"];
    const rows = leads.map((lead) => [
      lead.prenom || "",
      lead.nom || "",
      lead.email,
      lead.telephone || "",
      lead.localite || "",
      lead.budget || "",
      lead.statut_emploi || "",
      lead.permis_nationalite || "",
      lead.poursuites ? "Oui" : "Non",
      lead.a_garant ? "Oui" : "Non",
      lead.is_qualified ? "Oui" : "Non",
      lead.created_at ? format(new Date(lead.created_at), "dd/MM/yyyy HH:mm") : "",
      lead.contacted ? "Oui" : "Non",
      lead.notes || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const handleImportCSV = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      const cleanText = text.replace(/^\uFEFF/, '');
      const lines = cleanText.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('CSV vide');

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      
      const nameIdx = headers.findIndex(h => h.includes('nom') && !h.includes('famille'));
      const emailIdx = headers.findIndex(h => h.includes('e-mail') || h.includes('email') || h.includes('adresse e'));
      const sourceIdx = headers.findIndex(h => h === 'source');
      const formulaireIdx = headers.findIndex(h => h.includes('formulaire'));
      const phoneIdx = headers.findIndex(h => h.includes('téléphone') || h.includes('telephone') || h.includes('phone'));

      if (emailIdx === -1) throw new Error('Colonne email non trouvée');

      const parsedLeads = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const email = cols[emailIdx]?.trim();
        if (!email || !email.includes('@')) continue;

        const fullName = nameIdx >= 0 ? cols[nameIdx] : '';
        const parts = fullName.split(' ');
        const prenom = parts[0] || '';
        const nom = parts.slice(1).join(' ') || '';

        parsedLeads.push({
          email,
          prenom: prenom || null,
          nom: nom || null,
          telephone: phoneIdx >= 0 ? cols[phoneIdx] || null : null,
          source: sourceIdx >= 0 ? cols[sourceIdx] || 'CSV Import' : 'CSV Import',
          formulaire: formulaireIdx >= 0 ? cols[formulaireIdx] || null : null,
        });
      }

      const { data, error } = await supabase.functions.invoke('import-leads-csv', {
        body: { leads: parsedLeads, formulaire_name: importFile.name },
      });

      if (error) throw error;
      
      toast.success(`${data.inserted} leads importés`, {
        description: data.duplicates > 0 ? `${data.duplicates} doublons ignorés` : undefined,
      });
      
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-formulaires"] });
      setShowImportDialog(false);
      setImportFile(null);
    } catch (err) {
      toast.error("Erreur d'import", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      });
    } finally {
      setImporting(false);
    }
  };

  const notContactedLeads = leads.filter((l) => !l.contacted);
  const notContactedCount = notContactedLeads.length;
  const qualifiedCount = leads.filter((l) => l.is_qualified).length;

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        title="Leads Shortlist"
        subtitle={`${leads.length} leads • ${qualifiedCount} qualifiés • ${notContactedCount} non contactés`}
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-wrap">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les leads</SelectItem>
              <SelectItem value="qualified">Qualifiés uniquement</SelectItem>
              <SelectItem value="not_qualified">Non qualifiés</SelectItem>
              <SelectItem value="not_contacted">Non contactés</SelectItem>
              <SelectItem value="contacted">Contactés</SelectItem>
            </SelectContent>
          </Select>
          {formulaires.length > 0 && (
            <Select value={formulaireFilter} onValueChange={setFormulaireFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrer par formulaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les formulaires</SelectItem>
                {formulaires.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            variant="default" 
            onClick={() => setShowRelanceDialog(true)} 
            className="gap-2"
            disabled={notContactedCount === 0}
          >
            <Zap className="h-4 w-4" />
            Relancer tous ({notContactedCount})
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Importer CSV
          </Button>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter CSV
          </Button>
        </div>
      </div>

      <PremiumTable>
        <PremiumTableHeader>
          <TableRow>
            <TableHead>Contact</TableHead>
            <TableHead>Recherche</TableHead>
            <TableHead>Qualification</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </PremiumTableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                Chargement...
              </TableCell>
            </TableRow>
          ) : leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Aucun lead pour le moment
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <PremiumTableRow key={lead.id}>
                <TableCell>
                  <div className="space-y-1">
                    {(lead.prenom || lead.nom) && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{lead.prenom} {lead.nom}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{lead.email}</span>
                    </div>
                    {lead.telephone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.telephone}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {lead.localite && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.localite}</span>
                      </div>
                    )}
                    {lead.budget && (
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.budget}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    {lead.is_qualified ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Qualifié
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <ShieldX className="h-3 w-3" />
                        Non qualifié
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {lead.statut_emploi && (
                        <div>{lead.statut_emploi === 'salarie' ? '✓ Salarié' : '✗ Non salarié'}</div>
                      )}
                      {lead.permis_nationalite && (
                        <div>{['B', 'C', 'Suisse'].includes(lead.permis_nationalite) ? '✓' : '✗'} Permis {lead.permis_nationalite}</div>
                      )}
                      {lead.poursuites !== null && (
                        <div>
                          {lead.poursuites ? (
                            lead.a_garant ? '✓ Poursuites + Garant' : '✗ Poursuites sans garant'
                          ) : '✓ Pas de poursuites'}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {lead.created_at && (
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(lead.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.contacted ? (
                    <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                      Contacté
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Non contacté</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {!lead.contacted && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => sendSingleRelance(lead)}
                        title="Envoyer email de relance"
                      >
                        <Send className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleContacted.mutate({ id: lead.id, contacted: !lead.contacted })}
                      title={lead.contacted ? "Marquer non contacté" : "Marquer contacté"}
                    >
                      {lead.contacted ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedLead(lead);
                        setNotes(lead.notes || "");
                      }}
                      title="Ajouter des notes"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Supprimer ce lead ?")) {
                          deleteLead.mutate(lead.id);
                        }
                      }}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </PremiumTableRow>
            ))
          )}
        </TableBody>
      </PremiumTable>

      {/* Notes Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes pour {selectedLead?.prenom} {selectedLead?.nom || selectedLead?.email}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ajouter des notes de suivi..."
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedLead(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (selectedLead) {
                  updateNotes.mutate({ id: selectedLead.id, notes });
                }
              }}
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Relance Dialog */}
      <Dialog open={showRelanceDialog} onOpenChange={setShowRelanceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Relance marketing — {notContactedCount} lead(s)
            </DialogTitle>
            <DialogDescription>
              Un email marketing professionnel sera envoyé à tous les leads non contactés.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{notContactedCount}</div>
                <div className="text-xs text-muted-foreground">Destinataires</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="text-sm text-muted-foreground">
                <strong>Objet :</strong> {"{prenom}"}, tu as déjà trouvé ton futur logement ?
              </div>
            </div>

            <div className="text-sm font-medium">Aperçu de l'email :</div>
            <ScrollArea className="h-[400px] rounded-lg border">
              <div className="p-4 bg-[#f4f6f9]">
                <div className="max-w-[500px] mx-auto bg-white rounded-xl overflow-hidden shadow-sm">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-[#1e3a5f] to-[#3b82b8] p-5">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xl font-bold text-white">🏠 Logisorama</div>
                        <div className="text-[10px] text-white/60 mt-0.5">by Immo-rama.ch</div>
                      </div>
                      <div className="text-xs text-white/80">📞 +41 76 483 91 99</div>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-[#1e3a5f] text-center">
                      {"{prenom}"}, tu as déjà trouvé ton futur logement ? 🤔
                    </h3>
                    <p className="text-xs text-gray-500 text-center leading-relaxed">
                      On sait que la recherche d'un logement en Suisse romande, c'est <strong>un vrai parcours du combattant</strong>. Avec un taux de vacance inférieur à 1%, les bons appartements partent en quelques heures.
                    </p>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-[#1e3a5f]">1100+</div>
                        <div className="text-[10px] text-gray-500 uppercase">Offres</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-green-700">95%</div>
                        <div className="text-[10px] text-gray-500 uppercase">Satisfaction</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-amber-600">48h</div>
                        <div className="text-[10px] text-gray-500 uppercase">Délai</div>
                      </div>
                    </div>
                    {/* Comment ça marche */}
                    <div className="text-center">
                      <div className="text-sm font-bold text-[#1e3a5f] mb-2">Comment ça marche ?</div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xl">🔍</div>
                          <div className="text-[10px] font-bold text-[#1e3a5f]">On cherche</div>
                        </div>
                        <div>
                          <div className="text-xl">🏠</div>
                          <div className="text-[10px] font-bold text-[#1e3a5f]">Tu visites</div>
                        </div>
                        <div>
                          <div className="text-xl">🔑</div>
                          <div className="text-[10px] font-bold text-[#1e3a5f]">Tu emménages</div>
                        </div>
                      </div>
                    </div>
                    {/* CTA */}
                    <div className="text-center pt-2">
                      <div className="inline-block bg-gradient-to-r from-[#1e3a5f] to-[#2d5f8a] text-white px-6 py-3 rounded-xl font-semibold text-sm">
                        Activer ma recherche →
                      </div>
                    </div>
                    {/* Offres section */}
                    <div className="border-t pt-4">
                      <div className="text-sm font-bold text-[#1e3a5f] text-center mb-2">📬 Offres déjà envoyées à nos clients</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="border rounded-lg overflow-hidden">
                          <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&h=120&fit=crop" alt="Apt" className="w-full h-16 object-cover" />
                          <div className="p-2">
                            <div className="text-xs font-bold text-[#1e3a5f]">CHF 1'850/mois</div>
                            <div className="text-[10px] text-gray-500">📍 Lausanne • 3.5p • 72m²</div>
                          </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&h=120&fit=crop" alt="Apt" className="w-full h-16 object-cover" />
                          <div className="p-2">
                            <div className="text-xs font-bold text-[#1e3a5f]">CHF 2'400/mois</div>
                            <div className="text-[10px] text-gray-500">📍 Genève • 4.5p • 95m²</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Stars */}
                    <div className="text-center text-lg">⭐⭐⭐⭐⭐</div>
                    {/* Signature */}
                    <div className="border-t pt-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-sm font-bold">CR</div>
                      <div>
                        <div className="text-xs font-bold text-[#1e3a5f]">Christ Ramazani</div>
                        <div className="text-[10px] text-gray-500">Fondateur & CEO — Immo-rama.ch</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {notContactedCount > 0 && (
              <div className="text-xs text-muted-foreground">
                💡 Les leads seront automatiquement marqués comme "contactés" après l'envoi.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelanceDialog(false)} disabled={relanceSending}>
              Annuler
            </Button>
            <Button 
              onClick={() => sendRelance(notContactedLeads.map(l => l.id))}
              disabled={relanceSending || notContactedCount === 0}
              className="gap-2"
            >
              {relanceSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer à {notContactedCount} lead(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
