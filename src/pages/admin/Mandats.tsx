import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateDaysElapsed, calculateDaysRemaining, formatTimeRemaining } from "@/utils/calculations";
import { toast } from "sonner";

const Mandats = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [renouvellements, setRenouvellements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewalDialogOpen, setRenewalDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [renewalReason, setRenewalReason] = useState("");
  const [isRenewing, setIsRenewing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
    const { data: clientsData } = await supabase
      .from('clients')
      .select('*, profiles!clients_user_id_fkey(prenom, nom, email)')
      .order('date_ajout', { ascending: false });

      const { data: agentsData } = await supabase
        .from('agents')
        .select('*, profiles!agents_user_id_fkey(*)');

      const { data: renouvData } = await supabase
        .from('renouvellements_mandat')
        .select('*')
        .order('created_at', { ascending: false });

      setClients(clientsData || []);
      setAgents(agentsData || []);
      setRenouvellements(renouvData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewMandate = async () => {
    if (!selectedClient) return;
    
    setIsRenewing(true);
    try {
      // 1. Créer l'entrée de renouvellement
      const { error: renewalError } = await supabase
        .from('renouvellements_mandat')
        .insert({
          client_id: selectedClient.id,
          agent_id: selectedClient.agent_id,
          date_ancien_mandat: selectedClient.date_ajout,
          raison: renewalReason || 'Renouvellement standard'
        });

      if (renewalError) throw renewalError;

      // 2. Mettre à jour la date_ajout du client
      const { error: updateError } = await supabase
        .from('clients')
        .update({ date_ajout: new Date().toISOString() })
        .eq('id', selectedClient.id);

      if (updateError) throw updateError;

      // 3. Recharger les données et fermer le dialog
      await loadData();
      setRenewalDialogOpen(false);
      setRenewalReason("");
      setSelectedClient(null);
      
      toast.success("Mandat renouvelé avec succès !", {
        description: `Le mandat de ${selectedClient.profiles?.prenom} ${selectedClient.profiles?.nom} a été renouvelé pour 90 jours.`
      });
    } catch (error) {
      console.error('Error renewing mandate:', error);
      toast.error("Erreur lors du renouvellement du mandat");
    } finally {
      setIsRenewing(false);
    }
  };

  const getAgentName = (agentId?: string) => {
    if (!agentId) return "Non assigné";
    const agent = agents.find(a => a.id === agentId);
    if (!agent?.profiles) return "Non assigné";
    return `${agent.profiles.prenom} ${agent.profiles.nom}`;
  };

  const getMandateStatus = (daysElapsed: number) => {
    if (daysElapsed <= 30) return { label: "Nouveau", variant: "default" as const, color: "text-primary" };
    if (daysElapsed <= 60) return { label: "En cours", variant: "secondary" as const, color: "text-warning" };
    return { label: "Critique", variant: "destructive" as const, color: "text-destructive" };
  };

  const isRecentlyRenewed = (clientId: string) => {
    const renewal = renouvellements.find(r => r.client_id === clientId);
    if (!renewal) return false;
    const daysSinceRenewal = Math.floor((Date.now() - new Date(renewal.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceRenewal <= 7;
  };

  const sortedClients = [...clients].sort((a, b) => {
    const daysElapsedA = calculateDaysElapsed(a.date_ajout || a.created_at);
    const daysElapsedB = calculateDaysElapsed(b.date_ajout || b.created_at);
    return daysElapsedB - daysElapsedA;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Gestion des Mandats</h1>
            <p className="text-sm md:text-base text-muted-foreground">Suivi de la durée des mandats clients</p>
          </div>

          {/* Stats résumé */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Card className="p-3 md:p-4">
              <p className="text-xs text-muted-foreground">Total clients</p>
              <p className="text-xl md:text-2xl font-bold">{clients.length}</p>
            </Card>
            <Card className="p-3 md:p-4">
              <p className="text-xs text-muted-foreground">Nouveaux (≤30j)</p>
              <p className="text-xl md:text-2xl font-bold text-primary">
                {clients.filter(c => calculateDaysElapsed(c.date_ajout || c.created_at) <= 30).length}
              </p>
            </Card>
            <Card className="p-3 md:p-4">
              <p className="text-xs text-muted-foreground">En cours (30-60j)</p>
              <p className="text-xl md:text-2xl font-bold text-warning">
                {clients.filter(c => {
                  const days = calculateDaysElapsed(c.date_ajout || c.created_at);
                  return days > 30 && days <= 60;
                }).length}
              </p>
            </Card>
            <Card className="p-3 md:p-4">
              <p className="text-xs text-muted-foreground">Critiques (&gt;60j)</p>
              <p className="text-xl md:text-2xl font-bold text-destructive">
                {clients.filter(c => calculateDaysElapsed(c.date_ajout || c.created_at) > 60).length}
              </p>
            </Card>
          </div>

          <div className="grid gap-3 md:gap-4">
            {sortedClients.map((client) => {
              const daysElapsed = calculateDaysElapsed(client.date_ajout || client.created_at);
              const daysRemaining = calculateDaysRemaining(client.date_ajout || client.created_at);
              const progress = Math.min((daysElapsed / 90) * 100, 100);
              const status = getMandateStatus(daysElapsed);
              const renewed = isRecentlyRenewed(client.id);
              
              return (
                <Card key={client.id} className="p-4 md:p-6">
                  <div className="space-y-3 md:space-y-4">
                    {/* Header - empilé sur mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg md:text-xl font-semibold">
                            {client.profiles 
                              ? `${client.profiles.prenom} ${client.profiles.nom}` 
                              : 'Client (sans profil)'}
                          </h3>
                          <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                          {renewed && (
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 text-xs">
                              🔄 Renouvelé
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Agent: {getAgentName(client.agent_id)}
                        </p>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                        <div className={`text-2xl md:text-3xl font-bold ${status.color}`}>
                          J+{Math.floor(daysElapsed)}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {daysRemaining > 0 ? formatTimeRemaining(daysRemaining) : "Expiré"}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs md:text-sm">
                        <span>Progression du mandat</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Infos - grille adaptative */}
                    <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Début:</span> {new Date(client.date_ajout || client.created_at).toLocaleDateString('fr-CH')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        Split: {client.commission_split}%
                      </div>
                      {daysElapsed > 60 && (
                        <div className="flex items-center gap-1.5 text-destructive">
                          <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          <span className="hidden sm:inline">Proche expiration</span>
                          <span className="sm:hidden">Urgent</span>
                        </div>
                      )}
                    </div>

                    {/* Recherche info */}
                    <div className="pt-3 border-t">
                      <div className="text-xs md:text-sm flex flex-wrap gap-x-3 gap-y-1">
                        <span><span className="font-medium">Recherche:</span> {client.type_bien || 'N/A'} {client.pieces || '-'} pièces</span>
                        <span><span className="font-medium">Budget:</span> CHF {client.budget_max?.toLocaleString() || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Action bouton */}
                    {daysRemaining <= 30 && (
                      <div className="pt-3 border-t">
                        <Button
                          onClick={() => {
                            setSelectedClient(client);
                            setRenewalDialogOpen(true);
                          }}
                          variant="outline"
                          className="w-full sm:w-auto"
                          size="sm"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Renouveler le mandat
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <Dialog open={renewalDialogOpen} onOpenChange={setRenewalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renouveler le mandat</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Client: <span className="font-medium text-foreground">
                    {selectedClient?.profiles?.prenom} {selectedClient?.profiles?.nom}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Mandat actuel: <span className="font-medium text-foreground">
                    {selectedClient?.date_ajout ? new Date(selectedClient.date_ajout).toLocaleDateString('fr-CH') : '-'}
                  </span>
                </p>
                {selectedClient && calculateDaysRemaining(selectedClient.date_ajout || selectedClient.created_at) <= 0 && (
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Ce mandat a expiré
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Raison du renouvellement (optionnel)</Label>
                <Textarea
                  id="reason"
                  placeholder="Ex: Client toujours en recherche active, budget ajusté, nouvelles disponibilités..."
                  value={renewalReason}
                  onChange={(e) => setRenewalReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  📅 Le nouveau mandat débutera aujourd'hui et sera valable pour 90 jours supplémentaires.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRenewalDialogOpen(false);
                  setRenewalReason("");
                  setSelectedClient(null);
                }}
                disabled={isRenewing}
              >
                Annuler
              </Button>
              <Button
                onClick={handleRenewMandate}
                disabled={isRenewing}
              >
                {isRenewing ? "Renouvellement..." : "Confirmer le renouvellement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };
  
  export default Mandats;
