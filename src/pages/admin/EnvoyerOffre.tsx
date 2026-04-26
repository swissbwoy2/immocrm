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
import { Link, Paperclip, RotateCcw, Search } from "lucide-react";
import logoImmoRama from "@/assets/logo-immo-rama-new.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { OfferAttachmentUploader } from "@/components/OfferAttachmentUploader";
import { GoogleAddressAutocomplete, AddressComponents } from "@/components/GoogleAddressAutocomplete";
import { PremiumPageShellV2 } from '@/components/dashboard/v2';

interface FormData {
  clientId: string;
  localisation: string;
  npa: string;
  ville: string;
  prix: string;
  surface: string;
  nombrePieces: string;
  description: string;
  etage: string;
  disponibilite: string;
  lienAnnonce: string;
  etageVisite: string;
  codeImmeuble: string;
  locataireNom: string;
  locataireTel: string;
  conciergeNom: string;
  conciergeTel: string;
  commentaires: string;
  datesVisite: string[];
}

const initialFormData: FormData = {
  clientId: '',
  localisation: '',
  npa: '',
  ville: '',
  prix: '',
  surface: '',
  nombrePieces: '',
  description: '',
  etage: '',
  disponibilite: '',
  lienAnnonce: '',
  etageVisite: '',
  codeImmeuble: '',
  locataireNom: '',
  locataireTel: '',
  conciergeNom: '',
  conciergeTel: '',
  commentaires: '',
  datesVisite: ['', '', ''],
};

const AdminEnvoyerOffre = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lire le clientId depuis les query params de l'URL
  const searchParams = new URLSearchParams(location.search);
  const clientIdFromUrl = searchParams.get('clientId');
  const clientIdFromState = location.state?.clientId;

  useEffect(() => {
    const newClientId = clientIdFromState || clientIdFromUrl;
    if (newClientId && newClientId !== formData.clientId) {
      setFormData(prev => ({ ...prev, clientId: newClientId }));
    }
  }, [clientIdFromState, clientIdFromUrl]);

  // Pré-remplissage depuis la Wishlist
  useEffect(() => {
    const lien = searchParams.get('lien');
    const adresse = searchParams.get('adresse');
    const prix = searchParams.get('prix');
    const pieces = searchParams.get('pieces');
    if (lien || adresse || prix || pieces) {
      setFormData(prev => ({
        ...prev,
        lienAnnonce: lien ?? prev.lienAnnonce,
        localisation: adresse ?? prev.localisation,
        prix: prix ?? prev.prix,
        nombrePieces: pieces ?? prev.nombrePieces,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;

    // Load ALL clients with their profiles
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientsError) {
      console.error('Error loading clients:', clientsError);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors du chargement des clients"
      });
      return;
    }

    // Load ALL agents with profiles
    const { data: agentsData } = await supabase
      .from('agents')
      .select('*');

    if (agentsData) {
      const agentUserIds = agentsData.map(a => a.user_id);
      const { data: agentProfiles } = await supabase
        .from('profiles')
        .select('id, email, nom, prenom')
        .in('id', agentUserIds);

      const agentsWithProfiles = agentsData.map(agent => ({
        ...agent,
        profiles: agentProfiles?.find(p => p.id === agent.user_id)
      }));

      setAgents(agentsWithProfiles);
    }

    if (clientsData && clientsData.length > 0) {
      const userIds = clientsData.map(c => c.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, nom, prenom')
        .in('id', userIds);

      // Merge profiles with clients
      const clientsWithProfiles = clientsData.map(client => ({
        ...client,
        profiles: profilesData?.find(p => p.id === client.user_id),
        agentProfile: agents.find(a => a.id === client.agent_id)?.profiles
      }));

      setClients(clientsWithProfiles);
    } else {
      setClients([]);
    }
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const fullName = `${client.profiles?.prenom || ''} ${client.profiles?.nom || ''}`.toLowerCase();
    const email = (client.profiles?.email || '').toLowerCase();
    return fullName.includes(search) || email.includes(search);
  });

  const selectedClient = clients.find(c => c.id === formData.clientId);

  const handleDateVisiteChange = (index: number, value: string) => {
    const newDates = [...formData.datesVisite];
    newDates[index] = value;
    setFormData({ ...formData, datesVisite: newDates });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Protection double-clic
    
    if (!formData.clientId || !formData.localisation || !formData.prix || !formData.surface || !formData.nombrePieces) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    // Use the client's assigned agent, or the first agent if none assigned
    const clientAgent = selectedClient?.agent_id || agents[0]?.id;
    
    if (!clientAgent) {
      toast({ title: "Erreur", description: "Aucun agent disponible pour cette offre", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Check for duplicate offers (100% similar: same address, price, floor, surface)
      const { data: existingOffers } = await supabase
        .from('offres')
        .select('agent_id')
        .eq('client_id', formData.clientId)
        .eq('adresse', formData.localisation)
        .eq('prix', parseFloat(formData.prix))
        .eq('etage', formData.etage || '')
        .eq('surface', parseFloat(formData.surface));

      if (existingOffers && existingOffers.length > 0) {
        // Check if any existing offer was sent by a different agent
        const offerByOtherAgent = existingOffers.find(o => o.agent_id !== clientAgent);
        if (offerByOtherAgent) {
          toast({ 
            title: "Offre déjà envoyée", 
            description: "Cette annonce a déjà été envoyée par un autre agent à ce client, impossible de la renvoyer", 
            variant: "destructive" 
          });
          return;
        }
      }
      
      // Create offer
      const { data: offre, error: offreError } = await supabase
        .from('offres')
        .insert({
          client_id: formData.clientId,
          agent_id: clientAgent,
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
        .eq('client_id', formData.clientId)
        .eq('agent_id', clientAgent)
        .single();

      let conversationId = existingConv?.id;

      if (!existingConv) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            client_id: formData.clientId,
            agent_id: clientAgent,
            subject: "Nouvelles offres",
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;

        // Add agent to conversation_agents for RLS permissions
        await supabase
          .from('conversation_agents')
          .insert({
            conversation_id: conversationId,
            agent_id: clientAgent,
          });
      } else {
        // Ensure agent is in conversation_agents for existing conversations
        const { data: existingAgent } = await supabase
          .from('conversation_agents')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('agent_id', clientAgent)
          .maybeSingle();

        if (!existingAgent) {
          await supabase
            .from('conversation_agents')
            .insert({
              conversation_id: conversationId,
              agent_id: clientAgent,
            });
        }
      }

      // Send message with offer
      const formatDateVisite = (dateStr: string): string => {
        return new Date(dateStr).toLocaleString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      };
      
      const messageContent = `Nouvelle Offre pour Votre Recherche d'Appartement\n\nBonjour ${selectedClient?.profiles?.prenom} ${selectedClient?.profiles?.nom} 👋,\n\nNous avons trouvé une offre qui pourrait correspondre à vos critères de recherche ! Voici les détails de ce bien immobilier :\n\n📍 Localisation : ${formData.localisation}\n💰 Prix : ${formData.prix} CHF\n📐 Surface : ${formData.surface} m²\n🏠 Nombre de pièces : ${formData.nombrePieces}\n🏢 Étage : ${formData.etage}\n📅 Disponibilité : ${formData.disponibilite}\n\nDescription :\n${formData.description}${formData.datesVisite.filter(d => d).length > 0 ? `\n\nDates de visite proposées :\n${formData.datesVisite.filter(d => d).map((d) => `• ${formatDateVisite(d)}`).join('\n')}` : ''}${formData.lienAnnonce ? `\n\n🔗 Voir l'annonce complète : ${formData.lienAnnonce}` : ''}${attachments.length > 0 ? `\n\n📎 ${attachments.length} pièce(s) jointe(s)` : ''}\n\nPour toute question, n'hésitez pas à nous appeler au +41 21 634 28 39 ou à répondre directement à cet email.\n\nCordialement,\nL'équipe Immo-rama.ch`;

      // If we have attachments, send each as a separate message
      if (attachments.length > 0) {
        // First send the main message
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: clientAgent,
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
              sender_id: clientAgent,
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
            sender_id: clientAgent,
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
              client_id: formData.clientId,
              agent_id: clientAgent,
              date_visite: isoWithTimezone,
              adresse: formData.localisation,
              statut: 'proposee',
              notes: formData.commentaires,
            });
        }
      }

      toast({ title: "Succès", description: "Offre envoyée avec succès" });
      setFormData(initialFormData);
      setAttachments([]);
      navigate('/admin/offres-envoyees');
    } catch (error) {
      console.error('Error sending offer:', error);
      toast({ title: "Erreur", description: "Impossible d'envoyer l'offre", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the agent name for display
  const getAgentName = (agentId: string | null) => {
    if (!agentId) return 'Non assigné';
    const agent = agents.find(a => a.id === agentId);
    if (!agent?.profiles) return 'Agent inconnu';
    return `${agent.profiles.prenom} ${agent.profiles.nom}`;
  };

  return (
    <PremiumPageShellV2 className="flex-1 overflow-auto">
        <h1 className="text-3xl font-bold mb-8">Envoyer une offre (Admin)</h1>

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
            <Card className="card-interactive p-6 animate-fade-in" style={{ animationDelay: '0ms' }}>
              <h3 className="font-semibold mb-4">Sélectionner un client</h3>
              
              {/* Search input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher un client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {filteredClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex flex-col">
                        <span>{client.profiles?.prenom} {client.profiles?.nom}</span>
                        <span className="text-xs text-muted-foreground">
                          {client.profiles?.email} • Agent: {getAgentName(client.agent_id)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedClient && (
                <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                  <p><strong>Client sélectionné:</strong> {selectedClient.profiles?.prenom} {selectedClient.profiles?.nom}</p>
                  <p><strong>Email:</strong> {selectedClient.profiles?.email}</p>
                  <p><strong>Agent assigné:</strong> {getAgentName(selectedClient.agent_id)}</p>
                </div>
              )}
            </Card>

            <Card className="card-interactive p-6 space-y-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>📍 Adresse complète *</Label>
                  <GoogleAddressAutocomplete
                    value={formData.localisation}
                    onChange={(address: AddressComponents) => setFormData({ 
                      ...formData, 
                      localisation: address.fullAddress,
                      npa: address.postalCode,
                      ville: address.city
                    })}
                    onInputChange={(value) => setFormData({ ...formData, localisation: value })}
                    placeholder="Commencez à taper une adresse..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>📮 NPA</Label>
                  <Input 
                    value={formData.npa} 
                    onChange={(e) => setFormData({ ...formData, npa: e.target.value })} 
                    placeholder="1000" 
                  />
                </div>
                <div>
                  <Label>🏙️ Ville</Label>
                  <Input 
                    value={formData.ville} 
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })} 
                    placeholder="Lausanne" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>💰 Prix (CHF) *</Label>
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

            <Card className="card-interactive p-6 space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
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

            <Card className="card-interactive p-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
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

            <Card className="card-interactive p-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
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
                onClick={() => {
                  setFormData(initialFormData);
                  setAttachments([]);
                  toast({ title: "Formulaire réinitialisé", description: "Toutes les données ont été effacées" });
                }}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </Button>
              <Button onClick={handleSubmit} className="flex-1" size="lg" disabled={isSubmitting || !formData.clientId}>
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer'}
              </Button>
            </div>
          </div>

          {/* Aperçu de l'email à droite */}
          <div className="lg:sticky lg:top-8 h-fit">
            <Card className="card-interactive p-6 animate-fade-in" style={{ animationDelay: '250ms' }}>
              <h3 className="font-semibold mb-4">Aperçu de l'email</h3>
              <div className="border rounded-lg p-6 bg-white space-y-4">
                <div className="flex justify-center mb-6">
                  <img src={logoImmoRama} alt="Immo-Rama Logo" className="h-20 object-contain" />
                </div>

                <h2 className="text-xl font-bold text-center">
                  🏠 Nouvelle Offre pour Votre Recherche d'Appartement
                </h2>

                {selectedClient && (
                  <p className="text-sm">Bonjour {selectedClient.profiles?.prenom} {selectedClient.profiles?.nom} 👋,</p>
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
    </PremiumPageShellV2>
  );
};

export default AdminEnvoyerOffre;
