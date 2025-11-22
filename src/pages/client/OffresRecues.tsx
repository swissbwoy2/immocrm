import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Square, Home, ExternalLink, Eye, Heart, CheckCircle, Info, FileCheck, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OffresRecues = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [offres, setOffres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffre, setSelectedOffre] = useState<any | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    loadOffres();
  }, [user]);

  const loadOffres = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) {
        console.log('No client data found');
        return;
      }

      const { data: offresData, error } = await supabase
        .from('offres')
        .select('*')
        .eq('client_id', clientData.id)
        .order('date_envoi', { ascending: false });

      if (error) throw error;

      setOffres(offresData || []);
    } catch (error) {
      console.error('Error loading offres:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les offres",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatut = async (offreId: string, newStatut: string) => {
    try {
      const offre = offres.find(o => o.id === offreId);
      if (!offre) return;

      const { error } = await supabase
        .from('offres')
        .update({ statut: newStatut, updated_at: new Date().toISOString() })
        .eq('id', offreId);

      if (error) throw error;

      // Créer un message automatique pour notifier l'agent
      if (newStatut === 'interesse' || newStatut === 'refusee') {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, agent_id, user_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (clientData?.agent_id) {
          // Trouver ou créer une conversation
          let { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('client_id', clientData.id)
            .eq('agent_id', clientData.agent_id)
            .maybeSingle();

          if (!conv) {
            const { data: newConv } = await supabase
              .from('conversations')
              .insert({
                client_id: clientData.id,
                agent_id: clientData.agent_id,
                subject: 'Messages',
              })
              .select()
              .maybeSingle();
            conv = newConv;
          }

          if (conv) {
            const messageContent = newStatut === 'interesse' 
              ? `✅ Le client est intéressé par l'offre : ${offre.adresse} (${offre.prix} CHF/mois)`
              : `❌ Le client a refusé l'offre : ${offre.adresse}`;

            await supabase
              .from('messages')
              .insert({
                conversation_id: conv.id,
                sender_id: user?.id,
                sender_type: 'client',
                content: messageContent,
              });
          }
        }
      }

      // Créer une visite automatiquement si statut = visite_planifiee
      if (newStatut === 'visite_planifiee') {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, agent_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (clientData?.agent_id) {
          await supabase
            .from('visites')
            .insert({
              offre_id: offreId,
              client_id: clientData.id,
              agent_id: clientData.agent_id,
              date_visite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 jours
              adresse: offre.adresse,
              statut: 'planifiee',
              notes: 'Visite demandée par le client',
            });

          // Notifier l'agent
          let { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('client_id', clientData.id)
            .eq('agent_id', clientData.agent_id)
            .maybeSingle();

          if (!conv) {
            const { data: newConv } = await supabase
              .from('conversations')
              .insert({
                client_id: clientData.id,
                agent_id: clientData.agent_id,
                subject: 'Messages',
              })
              .select()
              .maybeSingle();
            conv = newConv;
          }

          if (conv) {
            await supabase
              .from('messages')
              .insert({
                conversation_id: conv.id,
                sender_id: user?.id,
                sender_type: 'client',
                content: `📅 Le client souhaite planifier une visite pour : ${offre.adresse} (${offre.prix} CHF/mois)`,
              });
          }
        }
      }

      setOffres(offres.map(o => o.id === offreId ? { ...o, statut: newStatut } : o));
      toast({ title: "Succès", description: "Statut mis à jour et agent notifié" });
    } catch (error) {
      console.error('Error updating statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const formatStatutOffre = (statut: string) => {
    const labels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'envoyee': { label: '📨 Envoyée', variant: 'secondary' },
      'vue': { label: '👁️ Vue', variant: 'outline' },
      'interesse': { label: '💚 Intéressé', variant: 'default' },
      'visite_planifiee': { label: '📅 Visite planifiée', variant: 'default' },
      'visite_effectuee': { label: '✅ Visite effectuée', variant: 'default' },
      'candidature_deposee': { label: '📝 Candidature déposée', variant: 'default' },
      'acceptee': { label: '🎉 Acceptée', variant: 'default' },
      'refusee': { label: '❌ Refusée', variant: 'destructive' },
    };
    return labels[statut] || { label: statut, variant: 'secondary' };
  };

  const handleViewDetails = (offre: any) => {
    setSelectedOffre(offre);
    setDetailsDialogOpen(true);
  };

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Offres Reçues</h1>
          <p className="text-muted-foreground">Consultez les biens qui vous sont proposés</p>
        </div>

        <div className="grid gap-6">
          {offres.map((offre) => {
            const { label, variant } = formatStatutOffre(offre.statut);
            
            return (
              <Card key={offre.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{offre.adresse}</h3>
                      <Badge variant={variant}>{label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Reçue le {new Date(offre.date_envoi).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">CHF {offre.prix.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">par mois</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{offre.pieces} pièces</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Square className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{offre.surface} m²</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{offre.etage} étage</span>
                  </div>
                </div>

                <p className="text-sm mb-4">{offre.description}</p>

                {offre.disponibilite && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Disponible dès le {offre.disponibilite}
                  </p>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button variant="default" size="sm" onClick={() => handleViewDetails(offre)}>
                    <Info className="mr-2 h-4 w-4" />
                    Voir les détails
                  </Button>
                  {offre.lien_annonce && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={offre.lien_annonce} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir l'annonce
                      </a>
                    </Button>
                  )}
                  {offre.statut === 'envoyee' && (
                    <Button size="sm" onClick={() => updateStatut(offre.id, 'vue')}>
                      <Eye className="mr-2 h-4 w-4" />
                      Marquer comme vue
                    </Button>
                  )}
                  {offre.statut === 'vue' && (
                    <Button size="sm" onClick={() => updateStatut(offre.id, 'interesse')}>
                      <Heart className="mr-2 h-4 w-4" />
                      Je suis intéressé
                    </Button>
                  )}
                  {offre.statut === 'interesse' && (
                    <Button size="sm" onClick={() => updateStatut(offre.id, 'visite_planifiee')}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Planifier une visite
                    </Button>
                  )}
                  {offre.statut === 'visite_planifiee' && (
                    <Button size="sm" onClick={() => updateStatut(offre.id, 'visite_effectuee')}>
                      <Check className="mr-2 h-4 w-4" />
                      Marquer la visite comme effectuée
                    </Button>
                  )}
                  {offre.statut === 'visite_effectuee' && (
                    <Button size="sm" onClick={() => updateStatut(offre.id, 'candidature_deposee')}>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Déposer ma candidature
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Dialog des détails */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Détails de l'offre</DialogTitle>
              <DialogDescription>
                Informations complètes sur le bien proposé
              </DialogDescription>
            </DialogHeader>
            
            {selectedOffre && (
              <div className="space-y-6">
                {/* En-tête */}
                <div className="border-b pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-semibold">{selectedOffre.adresse}</h3>
                      <Badge variant={formatStatutOffre(selectedOffre.statut).variant} className="mt-2">
                        {formatStatutOffre(selectedOffre.statut).label}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary">CHF {selectedOffre.prix.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">par mois</p>
                    </div>
                  </div>
                </div>

                {/* Caractéristiques principales */}
                <div>
                  <h4 className="font-semibold mb-3">📋 Caractéristiques</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pièces</p>
                        <p className="font-medium">{selectedOffre.pieces}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Square className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Surface</p>
                        <p className="font-medium">{selectedOffre.surface} m²</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Étage</p>
                        <p className="font-medium">{selectedOffre.etage}</p>
                      </div>
                    </div>
                    {selectedOffre.type_bien && (
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <p className="font-medium">{selectedOffre.type_bien}</p>
                        </div>
                      </div>
                    )}
                    {selectedOffre.disponibilite && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Disponibilité</p>
                          <p className="font-medium">{selectedOffre.disponibilite}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedOffre.description && (
                  <div>
                    <h4 className="font-semibold mb-2">📝 Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedOffre.description}</p>
                  </div>
                )}

                {/* Informations pratiques */}
                {(selectedOffre.code_immeuble || selectedOffre.concierge_nom || selectedOffre.locataire_nom) && (
                  <div>
                    <h4 className="font-semibold mb-3">🏢 Informations pratiques</h4>
                    <div className="space-y-2">
                      {selectedOffre.code_immeuble && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Code immeuble</span>
                          <span className="text-sm font-medium">{selectedOffre.code_immeuble}</span>
                        </div>
                      )}
                      {selectedOffre.concierge_nom && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Concierge</span>
                          <span className="text-sm font-medium">
                            {selectedOffre.concierge_nom}
                            {selectedOffre.concierge_tel && ` - ${selectedOffre.concierge_tel}`}
                          </span>
                        </div>
                      )}
                      {selectedOffre.locataire_nom && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Locataire actuel</span>
                          <span className="text-sm font-medium">
                            {selectedOffre.locataire_nom}
                            {selectedOffre.locataire_tel && ` - ${selectedOffre.locataire_tel}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Commentaires de l'agent */}
                {selectedOffre.commentaires && (
                  <div>
                    <h4 className="font-semibold mb-2">💬 Commentaires de votre agent</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedOffre.commentaires}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap pt-4 border-t">
                  {selectedOffre.lien_annonce && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedOffre.lien_annonce} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir l'annonce
                      </a>
                    </Button>
                  )}
                  {selectedOffre.statut === 'envoyee' && (
                    <Button size="sm" onClick={() => { updateStatut(selectedOffre.id, 'vue'); setDetailsDialogOpen(false); }}>
                      <Eye className="mr-2 h-4 w-4" />
                      Marquer comme vue
                    </Button>
                  )}
                  {selectedOffre.statut === 'vue' && (
                    <Button size="sm" onClick={() => { updateStatut(selectedOffre.id, 'interesse'); setDetailsDialogOpen(false); }}>
                      <Heart className="mr-2 h-4 w-4" />
                      Je suis intéressé
                    </Button>
                  )}
                  {selectedOffre.statut === 'interesse' && (
                    <Button size="sm" onClick={() => { updateStatut(selectedOffre.id, 'visite_planifiee'); setDetailsDialogOpen(false); }}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Planifier une visite
                    </Button>
                  )}
                  {selectedOffre.statut === 'visite_planifiee' && (
                    <Button size="sm" onClick={() => { updateStatut(selectedOffre.id, 'visite_effectuee'); setDetailsDialogOpen(false); }}>
                      <Check className="mr-2 h-4 w-4" />
                      Marquer la visite comme effectuée
                    </Button>
                  )}
                  {selectedOffre.statut === 'visite_effectuee' && (
                    <Button size="sm" onClick={() => { updateStatut(selectedOffre.id, 'candidature_deposee'); setDetailsDialogOpen(false); }}>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Déposer ma candidature
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OffresRecues;