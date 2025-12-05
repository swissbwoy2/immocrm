import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Download, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

interface ContratData {
  contrat_signe: boolean;
  signature_data: string | null;
  date_signature: string | null;
  date_expiration: string | null;
  contrat_pdf_url: string | null;
  taux_commission: number;
  minimum_vente: number;
  minimum_location: number;
  dispositions_particulieres: string | null;
}

interface ProfileData {
  nom: string;
  prenom: string;
  email: string;
}

export default function MonContrat() {
  const { user } = useAuth();
  const [contrat, setContrat] = useState<ContratData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [apporteurData, setApporteurData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nom, prenom, email')
        .eq('id', user?.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: apporteur } = await supabase
        .from('apporteurs')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (apporteur) {
        setApporteurData(apporteur);
        setContrat({
          contrat_signe: apporteur.contrat_signe,
          signature_data: apporteur.signature_data,
          date_signature: apporteur.date_signature,
          date_expiration: apporteur.date_expiration,
          contrat_pdf_url: apporteur.contrat_pdf_url,
          taux_commission: apporteur.taux_commission,
          minimum_vente: apporteur.minimum_vente,
          minimum_location: apporteur.minimum_location,
          dispositions_particulieres: apporteur.dispositions_particulieres,
        });
      }
    } catch (error) {
      console.error('Error loading contract data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isExpired = contrat?.date_expiration 
    ? new Date(contrat.date_expiration) < new Date() 
    : false;

  const daysUntilExpiration = contrat?.date_expiration
    ? Math.ceil((new Date(contrat.date_expiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Mon Contrat</h1>
        <p className="text-muted-foreground">
          Votre contrat d'apporteur d'affaires avec Immo-Rama
        </p>
      </div>

      {/* Statut du contrat */}
      <Card className={isExpired ? 'border-destructive' : daysUntilExpiration && daysUntilExpiration <= 30 ? 'border-orange-500' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Statut du contrat
              </CardTitle>
              <CardDescription>
                Contrat d'apporteur d'affaires
              </CardDescription>
            </div>
            {contrat?.contrat_signe ? (
              isExpired ? (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Expiré
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              )
            ) : (
              <Badge variant="secondary">En attente</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {contrat?.date_signature && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Signé le {format(new Date(contrat.date_signature), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
            )}
            {contrat?.date_expiration && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {isExpired ? 'Expiré' : 'Expire'} le {format(new Date(contrat.date_expiration), 'dd MMMM yyyy', { locale: fr })}
                  {!isExpired && daysUntilExpiration && daysUntilExpiration <= 30 && (
                    <span className="text-orange-500 ml-2">
                      ({daysUntilExpiration} jours restants)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {contrat?.contrat_pdf_url && (
            <Button variant="outline" asChild>
              <a href={contrat.contrat_pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Télécharger le contrat signé (PDF)
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Conditions du contrat */}
      <Card>
        <CardHeader>
          <CardTitle>Conditions de rémunération</CardTitle>
          <CardDescription>Article 2 de votre contrat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold text-primary">{contrat?.taux_commission || 20}%</div>
                <div className="text-sm text-muted-foreground">Commission</div>
                <div className="text-xs text-muted-foreground mt-1">des frais d'agence</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold">CHF {contrat?.minimum_vente || 500}</div>
                <div className="text-sm text-muted-foreground">Minimum vente</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold">CHF {contrat?.minimum_location || 150}</div>
                <div className="text-sm text-muted-foreground">Minimum location</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Texte du contrat */}
      <Card>
        <CardHeader>
          <CardTitle>Texte du contrat</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <div className="space-y-4 text-sm">
            <div className="text-center font-bold text-lg mb-6">CONTRAT D'APPORTEUR D'AFFAIRES</div>
            
            <p>Entre les soussignés,</p>
            <p><strong>{apporteurData?.civilite} {profile?.prenom} {profile?.nom}</strong></p>
            <p>Demeurant à : {apporteurData?.adresse}, {apporteurData?.code_postal} {apporteurData?.ville}</p>
            <p>Désigné ci-après « l'apporteur d'affaires », d'une part et</p>
            
            <p className="mt-4"><strong>Immo-Rama Crissier, Ramazani</strong></p>
            <p>Chemin de l'Esparcette 5, 1023 Crissier</p>
            <p>Désigné ci-après « la société », d'autre part.</p>

            <div className="mt-6">
              <h4 className="font-bold">PRÉAMBULE :</h4>
              <p>
                L'apporteur d'affaires, du fait de son travail et ses relations, est à même d'identifier des clients 
                qui souhaitent vendre, acheter, louer ou mettre en location un bien immobilier et de communiquer 
                les coordonnées à la société. La société est une agence immobilière spécialiste dans la vente, 
                la location et la gestion. Les deux Parties conscientes de leur complémentarité ont décidé de 
                mettre en place la présente convention pour régir leurs relations.
              </p>
            </div>

            <div className="mt-4">
              <h4 className="font-bold">Article 2 – Rémunération de l'apporteur d'affaires</h4>
              <p>
                Les commissions dues à l'Apporteur d'affaires lui seront acquises dès la signature de l'acte 
                de vente ou du bail à loyer par les clients qu'il aura présenté à la société. La société versera 
                à l'apporteur d'affaires une commission d'apport s'élevant à {contrat?.taux_commission || 20}% des frais d'agence 
                avec un minimum de CHF {contrat?.minimum_vente || 500},- pour un bien vendu et un minimum de CHF {contrat?.minimum_location || 150},- 
                pour un bien loué.
              </p>
            </div>

            <div className="mt-4">
              <h4 className="font-bold">Article 3 - Exigibilité de la rémunération</h4>
              <p>
                La rémunération est payable dès la conclusion de la vente ou du bail à loyer. L'apporteur 
                d'affaire ne perd pas son droit à rémunération si la vente ou la location intervient après 
                l'échéance du contrat, avec un client qui avait été indiqué par l'apporteur d'affaires pendant 
                la durée du contrat.
              </p>
            </div>

            <div className="mt-4">
              <h4 className="font-bold">Article 4 – Durée du contrat</h4>
              <p>
                Le présent contrat est conclu pour une durée de 1 an, à compter de sa signature, et se 
                renouvellera tacitement pour la même durée, sauf dénonciation par l'une ou l'autre des parties, 
                par écrit reçu quinze jours avant l'échéance.
              </p>
            </div>

            {contrat?.dispositions_particulieres && (
              <div className="mt-4">
                <h4 className="font-bold">Article 8 - Dispositions particulières :</h4>
                <p>{contrat.dispositions_particulieres}</p>
              </div>
            )}

            <div className="mt-4">
              <h4 className="font-bold">Article 10 - Élection de for et élection de droit</h4>
              <p>a) Pour tout litige qui pourrait résulter du présent contrat, le mandant déclare accepter 
              expressément la compétence des Tribunaux du lieu du siège de l'entreprise du courtier.</p>
              <p>b) Le droit suisse est applicable.</p>
            </div>

            {/* Signature */}
            {contrat?.signature_data && (
              <div className="mt-8 pt-4 border-t">
                <p className="text-muted-foreground mb-2">Signature de l'apporteur d'affaires :</p>
                <img 
                  src={contrat.signature_data} 
                  alt="Signature" 
                  className="max-w-[200px] border rounded"
                />
                {contrat.date_signature && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Signé le {format(new Date(contrat.date_signature), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
