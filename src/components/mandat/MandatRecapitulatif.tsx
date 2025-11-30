import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MandatFormData } from './types';
import { 
  User, Home, Briefcase, Search, Users, FileText, 
  MapPin, Phone, Mail, Calendar, CreditCard, Car, 
  Music, Dog, Building2, Wallet
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  data: MandatFormData;
}

export default function MandatRecapitulatif({ data }: Props) {
  const isPurchase = data.type_recherche === 'Acheter';
  const acompte = isPurchase ? 2500 : 300;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '-';
    return `${value.toLocaleString('fr-CH')} CHF`;
  };

  return (
    <div className="space-y-4">
      {/* Type de mandat */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPurchase ? (
              <Building2 className="h-6 w-6 text-primary" />
            ) : (
              <Home className="h-6 w-6 text-primary" />
            )}
            <div>
              <p className="font-bold text-lg">Mandat de recherche</p>
              <p className="text-sm text-muted-foreground">
                {isPurchase ? 'Pour un bien immobilier à acheter' : 'Pour un logement à louer'}
              </p>
            </div>
          </div>
          <Badge variant={isPurchase ? 'default' : 'secondary'} className="text-lg px-4 py-2">
            {data.type_recherche}
          </Badge>
        </div>
      </Card>

      {/* Section 1: Informations personnelles */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b">
          <User className="h-5 w-5 text-primary" />
          <h3 className="font-bold">1. Informations personnelles</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Nom complet:</span>
              <span className="font-medium">{data.prenom} {data.nom}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{data.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Téléphone:</span>
              <span className="font-medium">{data.telephone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Adresse:</span>
              <span className="font-medium">{data.adresse}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date de naissance:</span>
              <span className="font-medium">{formatDate(data.date_naissance)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nationalité:</span>
              <span className="font-medium ml-2">{data.nationalite}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Type de permis:</span>
              <span className="font-medium ml-2">{data.type_permis}</span>
            </div>
            <div>
              <span className="text-muted-foreground">État civil:</span>
              <span className="font-medium ml-2">{data.etat_civil}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 2: Situation actuelle */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b">
          <Home className="h-5 w-5 text-primary" />
          <h3 className="font-bold">2. Situation actuelle</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Gérance/Propriétaire actuel:</span>
              <span className="font-medium ml-2">{data.gerance_actuelle}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Contact gérance:</span>
              <span className="font-medium ml-2">{data.contact_gerance}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Loyer actuel:</span>
              <span className="font-medium ml-2">{formatCurrency(data.loyer_actuel)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Locataire depuis:</span>
              <span className="font-medium ml-2">{formatDate(data.depuis_le)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nombre de pièces:</span>
              <span className="font-medium ml-2">{data.pieces_actuel}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Motif de changement:</span>
              <span className="font-medium ml-2">{data.motif_changement}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 3: Situation professionnelle et financière */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b">
          <Briefcase className="h-5 w-5 text-primary" />
          <h3 className="font-bold">3. Situation professionnelle et financière</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Profession:</span>
              <span className="font-medium ml-2">{data.profession}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Employeur:</span>
              <span className="font-medium ml-2">{data.employeur}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Revenus mensuels nets:</span>
              <span className="font-medium ml-2">{formatCurrency(data.revenus_mensuels)}</span>
            </div>
            {data.date_engagement && (
              <div>
                <span className="text-muted-foreground">Date d'engagement:</span>
                <span className="font-medium ml-2">{formatDate(data.date_engagement)}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Utilisation du logement:</span>
              <span className="font-medium ml-2">{data.utilisation_logement}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Charges extraordinaires:</span>
              <Badge variant={data.charges_extraordinaires ? 'destructive' : 'secondary'}>
                {data.charges_extraordinaires ? `Oui - ${formatCurrency(data.montant_charges_extra)}` : 'Non'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Poursuites:</span>
              <Badge variant={data.poursuites ? 'destructive' : 'secondary'}>
                {data.poursuites ? 'Oui' : 'Non'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Curatelle:</span>
              <Badge variant={data.curatelle ? 'destructive' : 'secondary'}>
                {data.curatelle ? 'Oui' : 'Non'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 4: Critères de recherche */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b">
          <Search className="h-5 w-5 text-primary" />
          <h3 className="font-bold">4. Critères de recherche</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Comment nous avez-vous découvert:</span>
              <span className="font-medium ml-2">{data.decouverte_agence}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Type de bien:</span>
              <span className="font-medium ml-2">{data.type_bien}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nombre de pièces:</span>
              <span className="font-medium ml-2">{data.pieces_recherche}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Région:</span>
              <span className="font-medium ml-2">{data.region_recherche}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground">Nombre d'occupants:</span>
              <span className="font-medium ml-2">{data.nombre_occupants}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{isPurchase ? 'Prix d\'achat max:' : 'Budget max:'}</span>
              <span className="font-medium ml-2">{formatCurrency(data.budget_max)}</span>
            </div>
            {isPurchase && (
              <div>
                <span className="text-muted-foreground">Apport personnel:</span>
                <span className="font-medium ml-2">{formatCurrency(data.apport_personnel)}</span>
              </div>
            )}
          </div>
        </div>
        {data.souhaits_particuliers && (
          <div className="mt-4 pt-4 border-t">
            <span className="text-muted-foreground">Souhaits particuliers:</span>
            <p className="mt-1 font-medium">{data.souhaits_particuliers}</p>
          </div>
        )}
      </Card>

      {/* Section 5: Informations complémentaires */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-bold">5. Informations complémentaires</h3>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Dog className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Animaux:</span>
            <Badge variant={data.animaux ? 'default' : 'secondary'}>
              {data.animaux ? 'Oui' : 'Non'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Instrument:</span>
            <Badge variant={data.instrument_musique ? 'default' : 'secondary'}>
              {data.instrument_musique ? 'Oui' : 'Non'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Véhicule:</span>
            <Badge variant={data.vehicules ? 'default' : 'secondary'}>
              {data.vehicules ? `Oui${data.numero_plaques ? ` (${data.numero_plaques})` : ''}` : 'Non'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Section 6: Candidats */}
      {data.candidats.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-bold">6. Candidats associés ({data.candidats.length})</h3>
          </div>
          <div className="space-y-3">
            {data.candidats.map((candidat, index) => (
              <div key={candidat.id} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{candidat.prenom} {candidat.nom}</span>
                  <Badge variant="outline">{candidat.lien_avec_client}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Nationalité: {candidat.nationalite}</span>
                  <span>Permis: {candidat.type_permis}</span>
                  <span>Profession: {candidat.profession}</span>
                  <span>Revenus: {formatCurrency(candidat.revenus_mensuels)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Section 7: Documents */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-bold">7. Documents téléchargés ({data.documents_uploades.length})</h3>
        </div>
        {data.documents_uploades.length === 0 ? (
          <Badge variant="destructive">Aucun document téléchargé</Badge>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.documents_uploades.map((doc, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                <FileText className="h-3 w-3" />
                {doc.type}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Section 8: Acompte */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-primary/20">
          <Wallet className="h-5 w-5 text-primary" />
          <h3 className="font-bold">8. Acompte et paiement</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Acompte pour l'activation de vos recherches de logement à {data.type_recherche.toLowerCase()}
            </p>
          </div>
          <div className="text-2xl font-bold text-primary">{acompte} CHF</div>
        </div>
        <div className="mt-4 p-3 bg-background rounded-lg text-sm">
          <p className="font-medium mb-2">Coordonnées bancaires:</p>
          <div className="space-y-1 text-muted-foreground">
            <p>Bénéficiaire: <span className="text-foreground font-medium">IMMO-RAMA SA</span></p>
            <p>IBAN: <span className="text-foreground font-medium">CH93 0076 7000 E525 8472 5</span></p>
            <p>BIC: <span className="text-foreground font-medium">BCVLCH2LXXX</span></p>
            <p>Banque: Banque Cantonale Vaudoise</p>
          </div>
        </div>
        {data.code_promo && (
          <div className="mt-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="text-sm">Code promo appliqué: <strong>{data.code_promo}</strong></span>
          </div>
        )}
      </Card>
    </div>
  );
}
