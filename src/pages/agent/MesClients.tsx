import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, Calendar, Send } from "lucide-react";
import { getClients, getOffres, getCurrentUser } from "@/utils/localStorage";
import { calculateMandateDuration } from "@/utils/calculations";

const MesClients = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [clients] = useState(getClients().filter(c => c.agentId === `agent-${currentUser?.id.split('-')[1]}`));
  const [offres] = useState(getOffres());
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(client =>
    `${client.prenom} ${client.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClientOffres = (clientId: string) => {
    return offres.filter(o => o.clientId === clientId);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Mes Clients</h1>
            <p className="text-muted-foreground">Gérez vos clients et leurs recherches</p>
          </div>

          <div className="mb-6">
            <Input
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          <div className="grid gap-4">
            {filteredClients.map((client) => {
              const duration = calculateMandateDuration(client.dateInscription);
              const clientOffres = getClientOffres(client.id);
              
              return (
                <Card key={client.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold">{client.prenom} {client.nom}</h3>
                        <Badge variant={duration > 60 ? "destructive" : "default"}>
                          J+{duration}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-muted-foreground">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {client.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {client.telephone}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {client.adresse}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Inscrit le {new Date(client.dateInscription).toLocaleDateString('fr-FR')}
                          </div>
                          <div>
                            {clientOffres.length} offre{clientOffres.length > 1 ? 's' : ''} envoyée{clientOffres.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg mb-4">
                        <p className="text-sm font-medium mb-2">Recherche</p>
                        <p className="text-sm">
                          {client.typeBien} {client.nombrePiecesSouhaite} pièces • 
                          Budget max: CHF {client.budgetMax.toLocaleString()} • 
                          Régions: {client.regions.join(', ')}
                        </p>
                        {client.souhaitsParticuliers && (
                          <p className="text-sm mt-2 text-muted-foreground">
                            {client.souhaitsParticuliers}
                          </p>
                        )}
                      </div>

                      <Button onClick={() => navigate('/agent/envoyer-offre', { state: { clientId: client.id } })}>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer une offre
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MesClients;
