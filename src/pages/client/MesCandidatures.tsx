import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Square, Home, FileText, Building } from "lucide-react";
import { getOffres, getCurrentUser } from "@/utils/localStorage";
import { formatStatutOffre } from "@/utils/calculations";

const MesCandidatures = () => {
  const currentUser = getCurrentUser();
  const clientId = currentUser?.clientId || '';
  const [offres] = useState(
    getOffres().filter(o => 
      o.clientId === clientId && 
      ['candidature_deposee', 'acceptee', 'refusee'].includes(o.statut)
    )
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Mes Candidatures</h1>
            <p className="text-muted-foreground">Suivez l'état de vos candidatures</p>
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
                          Candidature déposée le {new Date(offre.candidature?.dateDepot || '').toLocaleDateString('fr-FR')}
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

                  {offre.candidature && (
                    <div className="space-y-3">
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="h-4 w-4" />
                          <span className="font-medium text-sm">Gérance</span>
                        </div>
                        <p className="text-sm">{offre.candidature.gerance}</p>
                        <p className="text-sm text-muted-foreground">{offre.candidature.contactGerance}</p>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium text-sm">Documents envoyés</span>
                        </div>
                        <ul className="text-sm space-y-1">
                          {offre.candidature.documentsEnvoyes.map((doc, idx) => (
                            <li key={idx}>• {doc}</li>
                          ))}
                        </ul>
                      </div>

                      {offre.candidature.resultat !== 'en_attente' && (
                        <div className={`p-4 rounded-lg ${
                          offre.candidature.resultat === 'acceptee' ? 'bg-success/10' : 'bg-destructive/10'
                        }`}>
                          <p className="font-medium text-sm mb-1">
                            Résultat: {offre.candidature.resultat === 'acceptee' ? 'Acceptée ✓' : 'Refusée'}
                          </p>
                          {offre.candidature.dateResultat && (
                            <p className="text-sm text-muted-foreground">
                              Le {new Date(offre.candidature.dateResultat).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                          {offre.candidature.commentaire && (
                            <p className="text-sm mt-2">{offre.candidature.commentaire}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}

            {offres.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Vous n'avez pas encore déposé de candidature</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MesCandidatures;
