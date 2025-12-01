import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link, Paperclip, RotateCcw, FolderOpen, Save } from "lucide-react";
import logoImmoRama from "@/assets/logo-immo-rama.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OfferAttachmentUploader } from "@/components/OfferAttachmentUploader";
import { useDraftManager, initialFormData } from "@/hooks/useDraftManager";
import { DraftManagerDialog } from "@/components/DraftManagerDialog";
import { ClientMultiSelect } from "@/components/ClientMultiSelect";

const EnvoyerOffre = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [agent, setAgent] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  
  // Lire le clientId depuis les query params de l'URL
  const searchParams = new URLSearchParams(location.search);
  const clientIdFromUrl = searchParams.get('clientId');
  const clientIdFromState = location.state?.clientId;
  
  // Utiliser le hook de gestion des brouillons
  const {
    drafts,
    currentDraftId,
    formData,
    setFormData,
    attachments,
    setAttachments,
    saveDraft,
    loadDraft,
    deleteDraft,
    renameDraft,
    clearCurrentDraft,
  } = useDraftManager();

  // Mettre à jour le clientId si passé via URL ou state (prioritaire sur localStorage)
  useEffect(() => {
    const newClientId = clientIdFromState || clientIdFromUrl;
    if (newClientId) {
      setSelectedClientIds([newClientId]);
      setFormData(prev => ({ ...prev, clientId: newClientId }));
    }
  }, [clientIdFromState, clientIdFromUrl]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Load agent
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (agentData) {
      setAgent(agentData);

      // Load agent's clients via client_agents
      const { data: clientAgentsData } = await supabase
        .from('client_agents')
        .select('client_id')
        .eq('agent_id', agentData.id);

      const clientIds = clientAgentsData?.map(ca => ca.client_id) || [];

      const { data: clientsData, error: clientsError } = clientIds.length > 0
        ? await supabase
            .from('clients')
            .select('*')
            .in('id', clientIds)
        : { data: [], error: null };

      if (clientsError) {
        console.error('Error loading clients:', clientsError);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Erreur lors du chargement des clients"
        });
        return;
      }

      // Load profiles for each client
      if (clientsData && clientsData.length > 0) {
        const userIds = clientsData.map(c => c.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, nom, prenom')
          .in('id', userIds);

        // Merge profiles with clients
        const clientsWithProfiles = clientsData.map(client => ({
          ...client,
          profiles: profilesData?.find(p => p.id === client.user_id)
        }));

        setClients(clientsWithProfiles);
      } else {
        setClients([]);
      }
    }
  };

  const selectedClients = clients.filter(c => selectedClientIds.includes(c.id));

  const handleDateVisiteChange = (index: number, value: string) => {
    const newDates = [...formData.datesVisite];
    newDates[index] = value;
    setFormData({ ...formData, datesVisite: newDates });
  };

  const handleSubmit = async () => {
    if (selectedClientIds.length === 0 || !formData.localisation || !formData.prix || !formData.surface || !formData.nombrePieces) {
      toast({ title: "Erreur", description: "Veuillez sélectionner au moins un client et remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    if (!agent) return;

    try {
      // Boucle sur chaque client sélectionné
      for (const clientId of selectedClientIds) {
        const client = clients.find(c => c.id === clientId);
        
        // Check for duplicate offers (100% similar: same address, price, floor, surface)
        const { data: existingOffers } = await supabase
          .from('offres')
          .select('agent_id')
          .eq('client_id', clientId)
          .eq('adresse', formData.localisation)
          .eq('prix', parseFloat(formData.prix))
          .eq('etage', formData.etage || '')
          .eq('surface', parseFloat(formData.surface));

        if (existingOffers && existingOffers.length > 0) {
          // Check if any existing offer was sent by a different agent
          const offerByOtherAgent = existingOffers.find(o => o.agent_id !== agent.id);
          if (offerByOtherAgent) {
            toast({ 
              title: "Offre déjà envoyée", 
              description: "Cette annonce a déjà été envoyée par un autre agent à ce client, impossible de la renvoyer", 
              variant: "destructive" 
            });
            continue; // Skip this client and continue with others
          }
        }
        
        // Create offer for this client
        const { data: offre, error: offreError } = await supabase
          .from('offres')
          .insert({
            client_id: clientId,
            agent_id: agent.id,
            adresse: formData.localisation,
            prix: parseFloat(formData.prix),
            surface: parseFloat(formData.surface),
            pieces: parseFloat(formData.nombrePieces),
            description: formData.description,
            etage: formData.etage,
            disponibilite: formData.disponibilite,
            statut: 'envoyee',
            lien_annonce: formData.lienAnnonce,
            code_immeuble: formData.codeImmeuble,
            locataire_nom: formData.locataireNom,
            locataire_tel: formData.locataireTel,
            concierge_nom: formData.conciergeNom,
            concierge_tel: formData.conciergeTel,
            commentaires: formData.commentaires,
          })
          .select()
          .single();

        if (offreError) throw offreError;

        // Create conversation if it doesn't exist
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('*')
          .eq('client_id', clientId)
          .eq('agent_id', agent.id)
          .single();

        let conversationId = existingConv?.id;

        if (!existingConv) {
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              client_id: clientId,
              agent_id: agent.id,
              subject: "Nouvelles offres",
            })
            .select()
            .single();

          if (convError) throw convError;
          conversationId = newConv.id;
        }

        // Send message with offer
        const messageContent = `Nouvelle Offre pour Votre Recherche d'Appartement\n\nBonjour ${client?.profiles?.prenom} ${client?.profiles?.nom} 👋,\n\nNous avons trouvé une offre qui pourrait correspondre à vos critères de recherche ! Voici les détails de ce bien immobilier :\n\n📍 Localisation : ${formData.localisation}\n💰 Prix : ${formData.prix} CHF\n📐 Surface : ${formData.surface} m²\n🏠 Nombre de pièces : ${formData.nombrePieces}\n🏢 Étage : ${formData.etage}\n📅 Disponibilité : ${formData.disponibilite}\n\nDescription :\n${formData.description}${formData.datesVisite.filter(d => d).length > 0 ? `\n\nDates de visite proposées :\n${formData.datesVisite.filter(d => d).map((d, i) => `• ${d}`).join('\n')}` : ''}${formData.lienAnnonce ? `\n\n🔗 Voir l'annonce complète : ${formData.lienAnnonce}` : ''}${attachments.length > 0 ? `\n\n📎 ${attachments.length} pièce(s) jointe(s)` : ''}\n\nPour toute question, n'hésitez pas à nous appeler au +41 21 634 28 39 ou à répondre directement à cet email.\n\nCordialement,\nL'équipe Immo-rama.ch`;

        // If we have attachments, send each as a separate message
        if (attachments.length > 0) {
          // First send the main message
          const { error: messageError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: agent.id,
              sender_type: 'agent',
              content: messageContent,
              offre_id: offre.id,
            });

          if (messageError) throw messageError;

          // Then send each attachment as a separate message
          for (const attachment of attachments) {
            await supabase
              .from('messages')
              .insert({
                conversation_id: conversationId,
                sender_id: agent.id,
                sender_type: 'agent',
                content: `📎 Pièce jointe: ${attachment.name}`,
                offre_id: offre.id,
                attachment_url: attachment.url,
                attachment_type: attachment.type,
                attachment_name: attachment.name,
                attachment_size: attachment.size,
              });
          }
        } else {
          const { error: messageError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: agent.id,
              sender_type: 'agent',
              content: messageContent,
              offre_id: offre.id,
            });

          if (messageError) throw messageError;
        }

      // Create visits if dates are provided
      const validDates = formData.datesVisite.filter(d => d);
      if (validDates.length > 0 && offre) {
        for (const dateStr of validDates) {
          // Convert local datetime to ISO string with timezone
          const localDate = new Date(dateStr);
          const isoWithTimezone = localDate.toISOString();
          
          await supabase
            .from('visites')
            .insert({
              offre_id: offre.id,
              client_id: clientId,
              agent_id: agent.id,
              date_visite: isoWithTimezone,
              adresse: formData.localisation,
              statut: 'planifiee',
              notes: formData.commentaires,
            });
        }
      }
      }

      // Nettoyer le brouillon après envoi réussi
      if (currentDraftId) {
        deleteDraft(currentDraftId);
      }
      clearCurrentDraft();
      
      toast({ title: "Succès", description: `Offre envoyée à ${selectedClientIds.length} client(s) avec succès` });
      navigate('/agent');
    } catch (error) {
      console.error('Error sending offer:', error);
      toast({ title: "Erreur", description: "Impossible d'envoyer l'offre", variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8">Envoyer une offre</h1>

        <Tabs defaultValue="email" className="mb-4">
          <TabsList>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs defaultValue="manuelle" className="mb-6">
          <TabsList>
            <TabsTrigger value="manuelle">Saisie manuelle</TabsTrigger>
            <TabsTrigger value="propriete">Sélectionner une propriété</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulaire à gauche */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Sélectionner des clients</h3>
              <ClientMultiSelect
                clients={clients}
                selectedClientIds={selectedClientIds}
                onSelectionChange={setSelectedClientIds}
              />
              {selectedClientIds.length > 1 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Cette offre sera envoyée à {selectedClientIds.length} clients
                </p>
              )}
            </Card>

            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>📍 Localisation *</Label>
                  <Input value={formData.localisation} onChange={(e) => setFormData({ ...formData, localisation: e.target.value })} placeholder="Chemin des Acacias 8 1023 Crissier" />
                </div>
                <div>
                  <Label>💰 Prix (CHF) *</Label>
                  <Input type="number" value={formData.prix} onChange={(e) => setFormData({ ...formData, prix: e.target.value })} placeholder="1750" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>📐 Surface (m²) *</Label>
                  <Input type="number" value={formData.surface} onChange={(e) => setFormData({ ...formData, surface: e.target.value })} placeholder="80" />
                </div>
                <div>
                  <Label>🏠 Nombre de pièces *</Label>
                  <Input type="number" step="0.5" value={formData.nombrePieces} onChange={(e) => setFormData({ ...formData, nombrePieces: e.target.value })} placeholder="4.5" />
                </div>
              </div>

              <div>
                <Label>📝 Description</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                  placeholder="Appartement de 4.5 pcs disponible au premier janvier 2026"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>🏢 Étage</Label>
                  <Input value={formData.etage} onChange={(e) => setFormData({ ...formData, etage: e.target.value })} placeholder="2" />
                </div>
                <div>
                  <Label>📅 Disponibilité</Label>
                  <Input value={formData.disponibilite} onChange={(e) => setFormData({ ...formData, disponibilite: e.target.value })} placeholder="01.01.2026 / 1er Janvier 2026. / 01/01/2026" />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Détails de la visite</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Étage</Label>
                  <Input value={formData.etageVisite} onChange={(e) => setFormData({ ...formData, etageVisite: e.target.value })} placeholder="2" />
                </div>
                <div>
                  <Label>Code d'immeuble</Label>
                  <Input value={formData.codeImmeuble} onChange={(e) => setFormData({ ...formData, codeImmeuble: e.target.value })} placeholder="6b1a" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Locataire actuel</Label>
                  <Input value={formData.locataireNom} onChange={(e) => setFormData({ ...formData, locataireNom: e.target.value })} placeholder="Fernandez" />
                </div>
                <div>
                  <Label>Téléphone locataire</Label>
                  <Input value={formData.locataireTel} onChange={(e) => setFormData({ ...formData, locataireTel: e.target.value })} placeholder="0764839991" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Concierge</Label>
                  <Input value={formData.conciergeNom} onChange={(e) => setFormData({ ...formData, conciergeNom: e.target.value })} placeholder="Da silva" />
                </div>
                <div>
                  <Label>Téléphone concierge</Label>
                  <Input value={formData.conciergeTel} onChange={(e) => setFormData({ ...formData, conciergeTel: e.target.value })} placeholder="021 634 25 25" />
                </div>
              </div>

              <div>
                <Label>Commentaires</Label>
                <Textarea 
                  value={formData.commentaires} 
                  onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })} 
                  rows={3}
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold">Dates de visite proposées</h3>
              {[0, 1, 2].map((index) => (
                <Input 
                  key={index}
                  type="datetime-local"
                  value={formData.datesVisite[index]}
                  onChange={(e) => handleDateVisiteChange(index, e.target.value)}
                />
              ))}
            </Card>

            <Card className="p-6">
              <Label className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Lien de l'annonce
              </Label>
              <Input 
                value={formData.lienAnnonce} 
                onChange={(e) => setFormData({ ...formData, lienAnnonce: e.target.value })} 
                placeholder="https://" 
                className="mt-2"
              />
            </Card>

            <Card className="p-6">
              <Label className="flex items-center gap-2 mb-4">
                <Paperclip className="h-4 w-4" />
                Pièces jointes
              </Label>
              <OfferAttachmentUploader 
                attachments={attachments}
                onAttachmentsChange={setAttachments}
              />
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                onClick={() => setDraftDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Mes brouillons ({drafts.length})
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  const defaultName = `Brouillon - ${formData.localisation || 'Sans titre'}`;
                  const name = window.prompt("Nom du brouillon:", defaultName);
                  if (name) {
                    saveDraft(name);
                    toast({ title: "Brouillon sauvegardé", description: `"${name}" a été sauvegardé` });
                  }
                }}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Sauvegarder
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  clearCurrentDraft();
                  toast({ title: "Formulaire réinitialisé", description: "Toutes les données ont été effacées" });
                }}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </Button>
              <Button onClick={handleSubmit} className="flex-1" size="lg">
                Envoyer
              </Button>
            </div>

            <DraftManagerDialog
              open={draftDialogOpen}
              onOpenChange={setDraftDialogOpen}
              drafts={drafts}
              onLoadDraft={loadDraft}
              onDeleteDraft={deleteDraft}
              onRenameDraft={renameDraft}
              currentDraftId={currentDraftId}
            />
          </div>

          {/* Aperçu de l'email à droite */}
          <div className="lg:sticky lg:top-8 h-fit">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Aperçu de l'email</h3>
              <div className="border rounded-lg p-6 bg-white space-y-4">
                <div className="flex justify-center mb-6">
                  <img src={logoImmoRama} alt="Immo-Rama Logo" className="h-20 object-contain" />
                </div>

                <h2 className="text-xl font-bold text-center">
                  🏠 Nouvelle Offre pour Votre Recherche d'Appartement
                </h2>

                {selectedClientIds.length === 1 && selectedClients[0] && (
                  <p className="text-sm">Bonjour {selectedClients[0].profiles?.prenom} {selectedClients[0].profiles?.nom} 👋,</p>
                )}
                {selectedClientIds.length > 1 && (
                  <p className="text-sm">Bonjour 👋,</p>
                )}

                <p className="text-sm">
                  Nous avons trouvé une offre qui pourrait correspondre à vos critères de recherche ! Voici les détails de ce bien immobilier :
                </p>

                {formData.localisation && (
                  <div className="bg-muted p-4 rounded space-y-2 text-sm">
                    <p><strong>📍 Localisation :</strong> {formData.localisation}</p>
                    {formData.prix && <p><strong>💰 Prix :</strong> {formData.prix} CHF</p>}
                    {formData.surface && <p><strong>📐 Surface :</strong> {formData.surface} m²</p>}
                    {formData.nombrePieces && <p><strong>🏠 Nombre de pièces :</strong> {formData.nombrePieces}</p>}
                    {formData.etage && <p><strong>🏢 Étage :</strong> {formData.etage}</p>}
                    {formData.disponibilite && <p><strong>📅 Disponibilité :</strong> {formData.disponibilite}</p>}
                  </div>
                )}

                {formData.description && (
                  <div>
                    <p className="font-semibold text-sm">Description :</p>
                    <p className="text-sm mt-1">{formData.description}</p>
                  </div>
                )}

                {formData.datesVisite.filter(d => d).length > 0 && (
                  <div>
                    <p className="font-semibold text-sm">Dates de visite proposées :</p>
                    <ul className="list-disc list-inside text-sm mt-1">
                      {formData.datesVisite.filter(d => d).map((date, i) => (
                        <li key={i}>{new Date(date).toLocaleString('fr-FR', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {attachments.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm">📎 Pièces jointes ({attachments.length}) :</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-muted p-2 rounded">
                          {att.type.startsWith('image/') ? (
                            <img src={att.url} alt={att.name} className="h-8 w-8 object-cover rounded" />
                          ) : att.type.startsWith('video/') ? (
                            <span>🎬</span>
                          ) : (
                            <span>📄</span>
                          )}
                          <span className="truncate">{att.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.lienAnnonce && (
                  <Button variant="default" className="w-full" asChild>
                    <a href={formData.lienAnnonce} target="_blank" rel="noopener noreferrer">
                      🔗 Voir l'annonce complète
                    </a>
                  </Button>
                )}

                <div className="border-t pt-4 text-sm text-muted-foreground text-center">
                  <p>Pour toute question, n'hésitez pas à nous appeler au +41 21 634 28 39 ou à répondre directement à cet email.</p>
                  <p className="mt-2">Cordialement,<br />L'équipe Immo-rama.ch</p>
                  <p className="text-xs mt-2">📍 Chemin de l'Esparcette 5 - 1023 Crissier</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvoyerOffre;
