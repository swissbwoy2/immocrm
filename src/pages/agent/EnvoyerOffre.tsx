import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getClients, getOffres, saveOffres, getCurrentUser } from "@/utils/localStorage";
import type { Offre } from "@/data/mockData";

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
    datesVisite: "",
  });

  const handleSubmit = () => {
    if (!formData.clientId || !formData.localisation || !formData.prix || !formData.surface || !formData.nombrePieces) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    const offres = getOffres();
    const newOffre: Offre = {
      id: `offre-${Date.now()}`,
      clientId: formData.clientId,
      agentId: agentId,
      dateEnvoi: new Date().toISOString().split('T')[0],
      localisation: formData.localisation,
      prix: parseFloat(formData.prix),
      surface: parseFloat(formData.surface),
      nombrePieces: parseFloat(formData.nombrePieces),
      description: formData.description,
      etage: formData.etage,
      disponibilite: formData.disponibilite,
      etageVisite: formData.etageVisite,
      codeImmeuble: formData.codeImmeuble,
      locataireNom: formData.locataireNom,
      locataireTel: formData.locataireTel,
      conciergeNom: formData.conciergeNom,
      conciergeTel: formData.conciergeTel,
      commentaires: formData.commentaires,
      datesVisite: formData.datesVisite ? formData.datesVisite.split(',').map(d => d.trim()) : [],
      lienAnnonce: formData.lienAnnonce,
      statut: 'envoyee',
      dateStatut: new Date().toISOString().split('T')[0],
    };

    saveOffres([...offres, newOffre]);
    toast({ title: "Succès", description: "Offre envoyée avec succès" });
    navigate('/agent');
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Envoyer une Offre</h1>
            <p className="text-muted-foreground">Proposez un bien à vos clients</p>
          </div>

          <Card className="p-6 max-w-4xl">
            <div className="space-y-6">
              <div>
                <Label>Client *</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.prenom} {client.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Localisation *</Label>
                  <Input value={formData.localisation} onChange={(e) => setFormData({ ...formData, localisation: e.target.value })} />
                </div>
                <div>
                  <Label>Lien annonce</Label>
                  <Input value={formData.lienAnnonce} onChange={(e) => setFormData({ ...formData, lienAnnonce: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Prix (CHF) *</Label>
                  <Input type="number" value={formData.prix} onChange={(e) => setFormData({ ...formData, prix: e.target.value })} />
                </div>
                <div>
                  <Label>Surface (m²) *</Label>
                  <Input type="number" value={formData.surface} onChange={(e) => setFormData({ ...formData, surface: e.target.value })} />
                </div>
                <div>
                  <Label>Nombre de pièces *</Label>
                  <Input type="number" step="0.5" value={formData.nombrePieces} onChange={(e) => setFormData({ ...formData, nombrePieces: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Étage</Label>
                  <Input value={formData.etage} onChange={(e) => setFormData({ ...formData, etage: e.target.value })} />
                </div>
                <div>
                  <Label>Disponibilité</Label>
                  <Input value={formData.disponibilite} onChange={(e) => setFormData({ ...formData, disponibilite: e.target.value })} placeholder="01.01.2025" />
                </div>
                <div>
                  <Label>Code immeuble</Label>
                  <Input value={formData.codeImmeuble} onChange={(e) => setFormData({ ...formData, codeImmeuble: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Locataire nom</Label>
                  <Input value={formData.locataireNom} onChange={(e) => setFormData({ ...formData, locataireNom: e.target.value })} />
                </div>
                <div>
                  <Label>Locataire tél</Label>
                  <Input value={formData.locataireTel} onChange={(e) => setFormData({ ...formData, locataireTel: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Concierge nom</Label>
                  <Input value={formData.conciergeNom} onChange={(e) => setFormData({ ...formData, conciergeNom: e.target.value })} />
                </div>
                <div>
                  <Label>Concierge tél</Label>
                  <Input value={formData.conciergeTel} onChange={(e) => setFormData({ ...formData, conciergeTel: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Dates de visite (séparées par virgule)</Label>
                <Input value={formData.datesVisite} onChange={(e) => setFormData({ ...formData, datesVisite: e.target.value })} placeholder="2024-12-20T10:00, 2024-12-22T14:00" />
              </div>

              <div>
                <Label>Commentaires</Label>
                <Textarea value={formData.commentaires} onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })} rows={2} />
              </div>

              <div className="flex gap-4">
                <Button onClick={handleSubmit}>Envoyer l'offre</Button>
                <Button variant="outline" onClick={() => navigate('/agent')}>Annuler</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnvoyerOffre;
