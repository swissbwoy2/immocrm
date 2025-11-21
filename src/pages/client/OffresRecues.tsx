import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Square, Home, ExternalLink, Eye, Heart, CheckCircle } from "lucide-react";
import { getOffres, getCurrentUser, saveOffres } from "@/utils/localStorage";
import { formatStatutOffre } from "@/utils/calculations";

const OffresRecues = () => {
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const clientId = currentUser?.clientId || '';
  const [offres, setOffres] = useState(getOffres().filter(o => o.clientId === clientId));

  const updateStatut = (offreId: string, newStatut: typeof offres[0]['statut']) => {
    const allOffres = getOffres();
    const updatedOffres = allOffres.map(o => 
      o.id === offreId ? { ...o, statut: newStatut, dateStatut: new Date().toISOString().split('T')[0] } : o
    );
    saveOffres(updatedOffres);
    setOffres(updatedOffres.filter(o => o.clientId === clientId));
    toast({ title: "Succès", description: "Statut mis à jour" });
  };

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
                        <h3 className="text-xl font-semibold">{offre.localisation}</h3>
                        <Badge variant={variant}>{label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Reçue le {new Date(offre.dateEnvoi).toLocaleDateString('fr-FR')}
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
                      <span className="text-sm">{offre.nombrePieces} pièces</span>
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

                  {offre.datesVisite.length > 0 && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium mb-2">Dates de visite proposées:</p>
                      <div className="space-y-1">
                        {offre.datesVisite.map((date, idx) => (
                          <p key={idx} className="text-sm">
                            {new Date(date).toLocaleString('fr-FR')}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {offre.lienAnnonce && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={offre.lienAnnonce} target="_blank" rel="noopener noreferrer">
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
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

export default OffresRecues;
