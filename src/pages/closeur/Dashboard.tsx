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
import { ClientTypeBadge } from "@/components/ClientTypeBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Send, 
  Loader2, 
  Mail, 
  Phone, 
  User, 
  Zap, 
  Upload, 
  FileText,
  Target,
  CheckCircle,
  Circle,
} from "lucide-react";

export default function CloseurDashboard() {
  const queryClient = useQueryClient();
  const [formulaireFilter, setFormulaireFilter] = useState<string>("all");
  const [showRelanceDialog, setShowRelanceDialog] = useState(false);
  const [relanceSending, setRelanceSending] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["closeur-leads", formulaireFilter],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (formulaireFilter !== "all") {
        query = query.eq("formulaire", formulaireFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
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
      const unique = [...new Set(data.map((d: any) => d.formulaire).filter(Boolean))];
      return unique as string[];
    },
  });

  const notContactedLeads = leads.filter((l: any) => !l.contacted);

  const sendRelance = async (leadIds: string[]) => {
    setRelanceSending(true);
    try {
      let totalSent = 0;
      let totalErrors = 0;
      const batchSize = 3;

      for (let i = 0; i < leadIds.length; i += batchSize) {
        const batch = leadIds.slice(i, i + batchSize);
        const { data, error } = await supabase.functions.invoke('send-lead-relance', {
          body: { lead_ids: batch },
        });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        totalSent += data.sent || 0;
        totalErrors += data.errors || 0;
      }

      toast.success(`${totalSent} email(s) de relance envoyé(s) !`);
      queryClient.invalidateQueries({ queryKey: ["closeur-leads"] });
      setShowRelanceDialog(false);
    } catch (err) {
      toast.error("Erreur lors de l'envoi", {
        description: err instanceof Error ? err.message : "Erreur inconnue",
      });
    } finally {
      setRelanceSending(false);
    }
  };

  const sendSingleRelance = async (lead: any) => {
    toast.loading(`Envoi à ${lead.prenom || lead.email}...`, { id: `relance-${lead.id}` });
    try {
      const { data, error } = await supabase.functions.invoke('send-lead-relance', {
        body: { lead_ids: [lead.id] },
      });
      if (error) throw error;
      toast.success(`Email envoyé à ${lead.prenom || lead.email}`, { id: `relance-${lead.id}` });
      queryClient.invalidateQueries({ queryKey: ["closeur-leads"] });
    } catch (err) {
      toast.error(`Erreur pour ${lead.email}`, { id: `relance-${lead.id}` });
    }
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
      
      queryClient.invalidateQueries({ queryKey: ["closeur-leads"] });
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

  const toggleContacted = useMutation({
    mutationFn: async ({ id, contacted }: { id: string; contacted: boolean }) => {
      const { error } = await supabase.from("leads").update({ contacted }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["closeur-leads"] });
      toast.success("Statut mis à jour");
    },
  });

  return (
    <div className="space-y-6 p-4 lg:p-6 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
      <PremiumPageHeader
        title="Leads — Closeur"
        subtitle={`${leads.length} leads • ${notContactedLeads.length} non contactés`}
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Select value={formulaireFilter} onValueChange={setFormulaireFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrer par formulaire" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les formulaires</SelectItem>
              {formulaires.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="default" onClick={() => setShowRelanceDialog(true)} className="gap-2" disabled={notContactedLeads.length === 0}>
            <Zap className="h-4 w-4" />
            Relancer tous ({notContactedLeads.length})
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Importer CSV
          </Button>
        </div>
      </div>

      <PremiumTable>
        <PremiumTableHeader>
          <TableRow>
            <TableHead>Contact</TableHead>
            <TableHead>Formulaire</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </PremiumTableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8">Chargement...</TableCell></TableRow>
          ) : leads.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun lead</TableCell></TableRow>
          ) : (
            leads.map((lead: any) => (
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
                    {lead.formulaire ? (
                      <Badge variant="outline" className="gap-1">
                        <Target className="h-3 w-3" />
                        {lead.formulaire}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                    <div className="mt-1">
                      <ClientTypeBadge typeRecherche={lead.type_recherche} size="sm" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {lead.created_at && (
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(lead.created_at), "dd MMM yyyy", { locale: fr })}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {lead.contacted ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Contacté</Badge>
                    ) : (
                      <Badge variant="secondary">Non contacté</Badge>
                    )}
                    {lead.is_qualified === true ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">Qualifié</Badge>
                    ) : lead.is_qualified === false ? (
                      <Badge variant="destructive" className="text-xs">Non qualifié</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">À évaluer</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {!lead.contacted && (
                      <Button variant="ghost" size="icon" onClick={() => sendSingleRelance(lead)} title="Relancer">
                        <Send className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleContacted.mutate({ id: lead.id, contacted: !lead.contacted })}
                      title={lead.contacted ? "Marquer non contacté" : "Marquer contacté"}
                    >
                      {lead.contacted ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4" />}
                    </Button>
                  </div>
                </TableCell>
              </PremiumTableRow>
            ))
          )}
        </TableBody>
      </PremiumTable>

      {/* Relance Dialog */}
      <Dialog open={showRelanceDialog} onOpenChange={setShowRelanceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Relancer {notContactedLeads.length} lead(s)
            </DialogTitle>
            <DialogDescription>
              Un email marketing professionnel sera envoyé à tous les leads non contactés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelanceDialog(false)} disabled={relanceSending}>Annuler</Button>
            <Button onClick={() => sendRelance(notContactedLeads.map((l: any) => l.id))} disabled={relanceSending} className="gap-2">
              {relanceSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {relanceSending ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Importer un fichier CSV
            </DialogTitle>
            <DialogDescription>
              Format Wix accepté. Les doublons (même email + formulaire) seront automatiquement ignorés.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="mx-auto"
              />
              {importFile && (
                <div className="mt-2 flex items-center gap-2 justify-center text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {importFile.name}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImportDialog(false); setImportFile(null); }} disabled={importing}>Annuler</Button>
            <Button onClick={handleImportCSV} disabled={!importFile || importing} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? "Import..." : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
