import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Square, Home, ExternalLink, Eye, Heart, CheckCircle, Info, FileCheck, Check, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OffresRecues = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [offres, setOffres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffre, setSelectedOffre] = useState<any | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [candidatureDialogOpen, setCandidatureDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [documentsFicheSalaire, setDocumentsFicheSalaire] = useState<File[]>([]);
  const [documentExtraitPoursuites, setDocumentExtraitPoursuites] = useState<File | null>(null);
  const [documentPieceIdentite, setDocumentPieceIdentite] = useState<File | null>(null);
  const [messageClient, setMessageClient] = useState('');
  const [accepteConditions, setAccepteConditions] = useState(false);

  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false);

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
    // Si c'est une visite planifiée, ouvrir le dialog de sélection de date
    if (newStatut === 'visite_planifiee') {
      const offre = offres.find(o => o.id === offreId);
      if (offre) {
        handlePlanVisit(offre);
      }
      return;
    }

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

      // NE PLUS créer automatiquement de visite ici - c'est fait dans confirmVisit()

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

  const uploadDocument = async (
    file: File,
    typeDocument: string,
    offreId: string
  ): Promise<string | null> => {
    try {
      const filePath = `${user!.id}/${offreId}/${typeDocument}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!clientData) throw new Error('Client not found');

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          nom: file.name,
          type: file.type,
          taille: file.size,
          user_id: user!.id,
          client_id: clientData.id,
          offre_id: offreId,
          type_document: typeDocument,
          url: filePath,
          statut: 'valide'
        });

      if (dbError) throw dbError;

      return filePath;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleDeposerCandidature = (offre: any) => {
    setSelectedOffre(offre);
    setDocumentsFicheSalaire([]);
    setDocumentExtraitPoursuites(null);
    setDocumentPieceIdentite(null);
    setMessageClient('');
    setAccepteConditions(false);
    setCandidatureDialogOpen(true);
  };

  const handleDeleguerVisite = (offre: any) => {
    setSelectedOffre(offre);
    setDelegateDialogOpen(true);
  };

  const confirmDeleguerVisite = async () => {
    if (!selectedOffre) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!clientData?.agent_id) {
        toast({
          title: 'Erreur',
          description: 'Aucun agent assigné',
          variant: 'destructive'
        });
        return;
      }

      // Marquer l'offre comme intéressée
      await supabase
        .from('offres')
        .update({ statut: 'interesse' })
        .eq('id', selectedOffre.id);

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
            subject: 'Messages'
          })
          .select()
          .maybeSingle();
        conv = newConv;
      }

      if (conv) {
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user!.id,
          sender_type: 'client',
          content: `🏠 **Demande de visite déléguée à l'agent**\n\n📍 Adresse: ${selectedOffre.adresse}\n💰 Loyer: ${selectedOffre.prix.toLocaleString()} CHF/mois\n\nLe client souhaite que vous organisiez la visite pour ce bien.`
        });
      }

      setDelegateDialogOpen(false);
      await loadOffres();

      toast({
        title: '✅ Visite déléguée',
        description: 'Votre agent a été notifié et organisera la visite'
      });
    } catch (error) {
      console.error('Error delegating visit:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de déléguer la visite',
        variant: 'destructive'
      });
    }
  };

  const confirmCandidature = async () => {
    if (!selectedOffre || !accepteConditions) {
      toast({
        title: 'Erreur',
        description: 'Veuillez accepter les conditions',
        variant: 'destructive'
      });
      return;
    }

    if (documentsFicheSalaire.length !== 3) {
      toast({
        title: 'Documents manquants',
        description: 'Vous devez fournir vos 3 dernières fiches de salaire',
        variant: 'destructive'
      });
      return;
    }

    if (!documentExtraitPoursuites) {
      toast({
        title: 'Document manquant',
        description: 'Vous devez fournir un extrait de l\'office des poursuites',
        variant: 'destructive'
      });
      return;
    }

    if (!documentPieceIdentite) {
      toast({
        title: 'Document manquant',
        description: 'Vous devez fournir une pièce d\'identité valable',
        variant: 'destructive'
      });
      return;
    }

    setUploadingDocs(true);

    try {
      const salaireUploads = await Promise.all(
        documentsFicheSalaire.map(file =>
          uploadDocument(file, 'fiche_salaire', selectedOffre.id)
        )
      );

      const extraitPath = await uploadDocument(
        documentExtraitPoursuites,
        'extrait_poursuites',
        selectedOffre.id
      );

      const identitePath = await uploadDocument(
        documentPieceIdentite,
        'piece_identite',
        selectedOffre.id
      );

      if (!salaireUploads.every(p => p) || !extraitPath || !identitePath) {
        throw new Error('Échec de l\'upload de certains documents');
      }

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!clientData) throw new Error('Client not found');

      await supabase.from('candidatures').insert({
        offre_id: selectedOffre.id,
        client_id: clientData.id,
        message_client: messageClient,
        dossier_complet: true
      });

      await supabase
        .from('offres')
        .update({ statut: 'candidature_deposee' })
        .eq('id', selectedOffre.id);

      if (clientData.agent_id) {
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
              subject: 'Messages'
            })
            .select()
            .maybeSingle();
          conv = newConv;
        }

        if (conv) {
          const messageContent = `📝 **NOUVELLE CANDIDATURE DÉPOSÉE AVEC DOSSIER COMPLET**\n\n🏠 **Bien concerné:**\n- Adresse: ${selectedOffre.adresse}\n- Loyer: ${selectedOffre.prix.toLocaleString()} CHF/mois\n- Type: ${selectedOffre.type_bien || 'N/A'}\n\n✅ **Documents fournis:**\n- ✓ 3 fiches de salaire\n- ✓ Extrait de l'office des poursuites (< 3 mois)\n- ✓ Pièce d'identité valable\n\n${messageClient ? `💬 **Message du client:**\n${messageClient}\n\n` : ''}📋 Le dossier complet est disponible dans la section "Documents" du client.`;

          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: user!.id,
            sender_type: 'client',
            content: messageContent
          });
        }
      }

      setCandidatureDialogOpen(false);
      await loadOffres();

      toast({
        title: '🎉 Candidature déposée avec succès !',
        description: 'Votre dossier complet a été envoyé à votre agent. Vous serez contacté prochainement.'
      });

    } catch (error) {
      console.error('Error submitting candidature:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de déposer la candidature. Veuillez réessayer.',
        variant: 'destructive'
      });
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleViewDetails = (offre: any) => {
    setSelectedOffre(offre);
    setDetailsDialogOpen(true);
  };

  const handlePlanVisit = (offre: any) => {
    setSelectedOffre(offre);
    setSelectedDate("");
    setVisitDialogOpen(true);
  };

  const confirmVisit = async () => {
    if (!selectedOffre || !selectedDate) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez sélectionner une date et heure pour la visite",
        variant: "destructive" 
      });
      return;
    }

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, agent_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!clientData?.agent_id) {
        toast({ 
          title: "Erreur", 
          description: "Aucun agent assigné",
          variant: "destructive" 
        });
        return;
      }

      // Créer la visite avec la date sélectionnée
      await supabase
        .from('visites')
        .insert({
          offre_id: selectedOffre.id,
          client_id: clientData.id,
          agent_id: clientData.agent_id,
          date_visite: selectedDate,
          adresse: selectedOffre.adresse,
          statut: 'planifiee',
          notes: 'Visite demandée par le client',
        });

      // Mettre à jour le statut de l'offre
      await supabase
        .from('offres')
        .update({ statut: 'visite_planifiee', updated_at: new Date().toISOString() })
        .eq('id', selectedOffre.id);

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
            content: `📅 **NOUVELLE VISITE PLANIFIÉE**\n\n🏠 Adresse: ${selectedOffre.adresse}\n💰 Loyer: ${selectedOffre.prix.toLocaleString()} CHF/mois\n📆 Date: ${new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n⏰ Heure: ${new Date(selectedDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\n\n✅ Le client confirme sa présence pour cette visite.`,
          });
      }

      setOffres(offres.map(o => o.id === selectedOffre.id ? { ...o, statut: 'visite_planifiee' } : o));
      setVisitDialogOpen(false);
      toast({ 
        title: "✅ Visite planifiée", 
        description: `Rendez-vous confirmé le ${new Date(selectedDate).toLocaleDateString('fr-FR')} à ${new Date(selectedDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Votre agent a été notifié.`
      });
      
      // Rafraîchir la liste des offres
      await loadOffres();
    } catch (error) {
      console.error('Error planning visit:', error);
      toast({
        title: "Erreur",
        description: "Impossible de planifier la visite",
        variant: "destructive",
      });
    }
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
              <Card 
                key={offre.id} 
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleViewDetails(offre)}
              >
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

                <p className="text-sm mb-4 line-clamp-2">{offre.description}</p>

                {offre.disponibilite && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Disponible dès le {offre.disponibilite}
                  </p>
                )}

                <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
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
                  {(offre.statut === 'envoyee' || offre.statut === 'vue' || offre.statut === 'interesse') && (
                    <>
                      <Button size="sm" onClick={() => handlePlanVisit(offre)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Planifier une visite
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleguerVisite(offre)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Déléguer à l'agent
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleDeposerCandidature(offre)}>
                        <FileCheck className="mr-2 h-4 w-4" />
                        Postuler direct
                      </Button>
                      {offre.statut !== 'interesse' && (
                        <>
                          <Button size="sm" onClick={() => updateStatut(offre.id, 'interesse')}>
                            <Heart className="mr-2 h-4 w-4" />
                            Intéressé
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatut(offre.id, 'refusee')}>
                            <X className="mr-2 h-4 w-4" />
                            Refuser
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {offre.statut === 'visite_planifiee' && (
                    <Button size="sm" onClick={() => updateStatut(offre.id, 'visite_effectuee')}>
                      <Check className="mr-2 h-4 w-4" />
                      Marquer la visite comme effectuée
                    </Button>
                  )}
                  {offre.statut === 'visite_effectuee' && (
                    <>
                      <Button size="sm" onClick={() => handleDeposerCandidature(offre)}>
                        <FileCheck className="mr-2 h-4 w-4" />
                        Déposer ma candidature
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatut(offre.id, 'interesse')}>
                        <Heart className="mr-2 h-4 w-4" />
                        Marquer comme intéressé
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatut(offre.id, 'refusee')}>
                        <X className="mr-2 h-4 w-4" />
                        Refuser
                      </Button>
                    </>
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
                  {(selectedOffre.statut === 'envoyee' || selectedOffre.statut === 'vue') && (
                    <>
                      <Button size="sm" onClick={() => { handlePlanVisit(selectedOffre); setDetailsDialogOpen(false); }}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Visiter ce bien
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { updateStatut(selectedOffre.id, 'refusee'); setDetailsDialogOpen(false); }}>
                        <X className="mr-2 h-4 w-4" />
                        Refuser
                      </Button>
                    </>
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

        {/* Dialog de planification de visite */}
        <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Planifier une visite</DialogTitle>
              <DialogDescription>
                Choisissez une date et heure pour visiter ce bien
              </DialogDescription>
            </DialogHeader>
            
            {selectedOffre && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">{selectedOffre.adresse}</h4>
                  <p className="text-2xl font-bold text-primary">CHF {selectedOffre.prix.toLocaleString()}/mois</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Date de visite</Label>
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate ? new Date(selectedDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Garder l'heure existante si déjà définie, sinon 10h00
                          const time = selectedDate ? new Date(selectedDate).toTimeString().slice(0, 5) : "10:00";
                          const newDate = new Date(date);
                          const [hours, minutes] = time.split(':');
                          newDate.setHours(parseInt(hours), parseInt(minutes));
                          setSelectedDate(newDate.toISOString());
                        }
                      }}
                      disabled={(date) => date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="rounded-md border pointer-events-auto"
                    />
                  </div>

                  <div>
                    <Label>Heure de visite</Label>
                    <Select 
                      value={selectedDate ? new Date(selectedDate).toTimeString().slice(0, 5) : ""}
                      onValueChange={(time) => {
                        const date = selectedDate ? new Date(selectedDate) : new Date();
                        const [hours, minutes] = time.split(':');
                        date.setHours(parseInt(hours), parseInt(minutes));
                        setSelectedDate(date.toISOString());
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une heure" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00">09:00</SelectItem>
                        <SelectItem value="10:00">10:00</SelectItem>
                        <SelectItem value="11:00">11:00</SelectItem>
                        <SelectItem value="12:00">12:00</SelectItem>
                        <SelectItem value="13:00">13:00</SelectItem>
                        <SelectItem value="14:00">14:00</SelectItem>
                        <SelectItem value="15:00">15:00</SelectItem>
                        <SelectItem value="16:00">16:00</SelectItem>
                        <SelectItem value="17:00">17:00</SelectItem>
                        <SelectItem value="18:00">18:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDate && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">
                        <strong>Visite prévue le :</strong><br />
                        {new Date(selectedDate).toLocaleDateString('fr-FR', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })} à {new Date(selectedDate).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setVisitDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={confirmVisit} disabled={!selectedDate}>
                Confirmer la visite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de candidature */}
        <Dialog open={candidatureDialogOpen} onOpenChange={setCandidatureDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>📝 Déposer ma candidature</DialogTitle>
              <DialogDescription>
                Complétez votre candidature en fournissant tous les documents requis
              </DialogDescription>
            </DialogHeader>

            {selectedOffre && (
              <div className="space-y-6 py-4">
                <Card className="bg-muted">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold mb-2">Bien concerné</h4>
                    <p className="text-sm">{selectedOffre.adresse}</p>
                    <p className="text-lg font-bold text-primary mt-1">
                      CHF {selectedOffre.prix.toLocaleString()}/mois
                    </p>
                  </CardContent>
                </Card>

                {selectedOffre.statut !== 'visite_effectuee' && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      ⚠️ <strong>Important :</strong> Une visite du bien sera obligatoire avant la validation finale de votre candidature. Vous ou votre agent devrez effectuer cette visite pour confirmer votre intérêt.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-semibold">Documents à fournir (obligatoires)</h4>

                  <div className="border rounded-lg p-4">
                    <Label className="text-base font-medium">
                      📄 3 dernières fiches de salaire *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Vos 3 derniers bulletins de salaire
                    </p>
                    <div className="space-y-2">
                      {[0, 1, 2].map(index => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const newDocs = [...documentsFicheSalaire];
                                newDocs[index] = file;
                                setDocumentsFicheSalaire(newDocs);
                              }
                            }}
                          />
                          {documentsFicheSalaire[index] && (
                            <Check className="w-5 h-5 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <Label className="text-base font-medium">
                      📋 Extrait de l'office des poursuites *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Datant de moins de 3 mois
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setDocumentExtraitPoursuites(file);
                        }}
                      />
                      {documentExtraitPoursuites && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <Label className="text-base font-medium">
                      🪪 Pièce d'identité / ID suisse *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Document valable (carte identité, passeport, permis de séjour)
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setDocumentPieceIdentite(file);
                        }}
                      />
                      {documentPieceIdentite && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Message / Motivation (optionnel)</Label>
                  <Textarea
                    placeholder="Présentez-vous et expliquez pourquoi ce bien vous intéresse..."
                    value={messageClient}
                    onChange={(e) => setMessageClient(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex items-start gap-2 p-4 bg-muted rounded-lg">
                  <Checkbox
                    id="conditions"
                    checked={accepteConditions}
                    onCheckedChange={(checked) => setAccepteConditions(checked as boolean)}
                  />
                  <Label htmlFor="conditions" className="text-sm cursor-pointer">
                    Je confirme que tous les documents fournis sont authentiques et à jour.
                    Je comprends que mon dossier sera examiné par l'agent et le propriétaire.
                  </Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCandidatureDialogOpen(false)}
                disabled={uploadingDocs}
              >
                Annuler
              </Button>
              <Button
                onClick={confirmCandidature}
                disabled={uploadingDocs || !accepteConditions}
              >
                {uploadingDocs ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Déposer ma candidature
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de délégation de visite */}
        <Dialog open={delegateDialogOpen} onOpenChange={setDelegateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Déléguer la visite à votre agent</DialogTitle>
              <DialogDescription>
                Votre agent organisera et effectuera la visite pour vous
              </DialogDescription>
            </DialogHeader>

            {selectedOffre && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Bien concerné</h4>
                  <p className="text-sm">{selectedOffre.adresse}</p>
                  <p className="text-lg font-bold text-primary mt-1">
                    CHF {selectedOffre.prix.toLocaleString()}/mois
                  </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>📋 Comment ça marche :</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Votre agent sera notifié de votre demande</li>
                      <li>Il organisera la visite avec le propriétaire</li>
                      <li>Il effectuera la visite et vous fera un compte-rendu détaillé</li>
                      <li>Vous pourrez ensuite décider de postuler ou non</li>
                    </ul>
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDelegateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={confirmDeleguerVisite}>
                Confirmer la délégation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default OffresRecues;