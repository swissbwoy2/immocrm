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
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { 
  CheckCircle, 
  Circle, 
  Trash2, 
  MessageSquare, 
  Download,
  Mail,
  MapPin,
  Wallet
} from "lucide-react";

type Lead = {
  id: string;
  email: string;
  localite: string | null;
  budget: string | null;
  source: string | null;
  created_at: string | null;
  contacted: boolean | null;
  notes: string | null;
};

export default function Leads() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "contacted" | "not_contacted">("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", filter],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "contacted") {
        query = query.eq("contacted", true);
      } else if (filter === "not_contacted") {
        query = query.or("contacted.is.null,contacted.eq.false");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
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

  const exportCSV = () => {
    const headers = ["Email", "Localité", "Budget", "Date", "Contacté", "Notes"];
    const rows = leads.map((lead) => [
      lead.email,
      lead.localite || "",
      lead.budget || "",
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

  const notContactedCount = leads.filter((l) => !l.contacted).length;

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        title="Leads Shortlist"
        subtitle={`${leads.length} leads • ${notContactedCount} non contactés`}
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les leads</SelectItem>
            <SelectItem value="not_contacted">Non contactés</SelectItem>
            <SelectItem value="contacted">Contactés</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      <PremiumTable>
        <PremiumTableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Localité</TableHead>
            <TableHead>Budget</TableHead>
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
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{lead.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {lead.localite && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {lead.localite}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {lead.budget && (
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      {lead.budget}
                    </div>
                  )}
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
                  <div className="flex items-center justify-end gap-2">
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

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes pour {selectedLead?.email}</DialogTitle>
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
    </div>
  );
}
