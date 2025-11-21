import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getClients, saveOffres, getCurrentUser } from "@/utils/localStorage";
import { Link } from "lucide-react";
import logoImmoRama from "@/assets/logo-immo-rama.png";

const EnvoyerOffre = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const agentId = `agent-${currentUser?.id.split('-')[1]}`;
  const clients = getClients().filter(c => c.agentId === agentId);
  
  const [formData, setFormData] = useState({
    clientId: location.state?.clientId || "",
    localisation: "",
    prix: "",
    surface: "",
    nombrePieces: "",
    description: "",
    etage: "",
    disponibilite: "",
    etageVisite: "",
    codeImmeuble: "",
    locataireNom: "",
    locataireTel: "",
    conciergeNom: "",
    conciergeTel: "",
    commentaires: "",
    lienAnnonce: "",
    datesVisite: ["", "", ""],
  });

  const selectedClient = clients.find(c => c.id === formData.clientId);

  const handleDateVisiteChange = (index: number, value: string) => {
    const newDates = [...formData.datesVisite];
    newDates[index] = value;
    setFormData({ ...formData, datesVisite: newDates });
  };

  const handleSubmit = () => {
    if (!formData.clientId || !formData.localisation || !formData.prix || !formData.surface || !formData.nombrePieces) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    // Créer l'offre
    const offres = JSON.parse(localStorage.getItem('offres') || '[]');
    const newOffre = {
      id: `offre-${Date.now()}`,
      clientId: formData.clientId,
      agentId: agentId,
      dateEnvoi: new Date().toISOString(),
      localisation: formData.localisation,
      prix: parseFloat(formData.prix),
      surface: parseFloat(formData.surface),
      nombrePieces: parseFloat(formData.nombrePieces),
      description: formData.description,
      etage: formData.etage,
      disponibilite: formData.disponibilite,
      statut: 'envoyee',
      lienAnnonce: formData.lienAnnonce,
    };
    saveOffres([...offres, newOffre]);

    // Créer la conversation si elle n'existe pas
    const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    let conversation = conversations.find((c: any) => c.clientId === formData.clientId && c.agentId === agentId);
    
    if (!conversation) {
      conversation = {
        id: `conv-${Date.now()}`,
        clientId: formData.clientId,
        agentId: agentId,
        subject: "Nouvelles offres",
        created_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        status: 'active'
      };
      conversations.push(conversation);
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }

    // Envoyer le message avec l'offre
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const newMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: conversation.id,
      sender_id: agentId,
      sender_type: 'agent',
      content: `Nouvelle Offre pour Votre Recherche d'Appartement\n\nBonjour ${selectedClient?.prenom} ${selectedClient?.nom} 👋,\n\nNous avons trouvé une offre qui pourrait correspondre à vos critères de recherche ! Voici les détails de ce bien immobilier :\n\n📍 Localisation : ${formData.localisation}\n💰 Prix : ${formData.prix} CHF\n📐 Surface : ${formData.surface} m²\n🏠 Nombre de pièces : ${formData.nombrePieces}\n🏢 Étage : ${formData.etage}\n📅 Disponibilité : ${formData.disponibilite}\n\nDescription :\n${formData.description}${formData.datesVisite.filter(d => d).length > 0 ? `\n\nDates de visite proposées :\n${formData.datesVisite.filter(d => d).map((d, i) => `• ${d}`).join('\n')}` : ''}${formData.lienAnnonce ? `\n\n🔗 Voir l'annonce complète : ${formData.lienAnnonce}` : ''}\n\nPour toute question, n'hésitez pas à nous appeler au +41 21 634 28 39 ou à répondre directement à cet email.\n\nCordialement,\nL'équipe Immo-rama.ch`,
      created_at: new Date().toISOString(),
      read: false,
      offreId: newOffre.id
    };
    messages.push(newMessage);
    localStorage.setItem('messages', JSON.stringify(messages));

    // Créer la visite si des dates sont fournies
    const validDates = formData.datesVisite.filter(d => d);
    if (validDates.length > 0 && formData.etageVisite && formData.codeImmeuble) {
      const visites = JSON.parse(localStorage.getItem('visites') || '[]');
      validDates.forEach(dateStr => {
        const visite = {
          id: `visite-${Date.now()}-${Math.random()}`,
          offreId: newOffre.id,
          clientId: formData.clientId,
          agentId: agentId,
          date: dateStr,
          localisation: formData.localisation,
          prix: formData.prix,
          surface: formData.surface,
          nombrePieces: formData.nombrePieces,
          etage: formData.etageVisite,
          codeImmeuble: formData.codeImmeuble,
          locataireNom: formData.locataireNom,
          locataireTel: formData.locataireTel,
          conciergeNom: formData.conciergeNom,
          conciergeTel: formData.conciergeTel,
          commentaires: formData.commentaires,
          statut: 'planifiee',
          created_at: new Date().toISOString(),
        };
        visites.push(visite);
      });
      localStorage.setItem('visites', JSON.stringify(visites));
    }

    toast({ title: "Succès", description: "Offre envoyée avec succès" });
    navigate('/agent');
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
                <h3 className="font-semibold mb-4">Sélectionner un client</h3>
                <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.prenom} {client.nom} - {client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <Button onClick={handleSubmit} className="w-full" size="lg">
                Envoyer
              </Button>
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

                  {selectedClient && (
                    <p className="text-sm">Bonjour {selectedClient.prenom} {selectedClient.nom} 👋,</p>
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
    </div>
  );
};

export default EnvoyerOffre;
