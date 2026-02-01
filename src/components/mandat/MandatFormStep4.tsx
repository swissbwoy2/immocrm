import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MandatFormData, DECOUVERTES_AGENCE, TYPES_BIEN, PIECES_OPTIONS } from './types';
import { Home, Building2, AlertCircle, CheckCircle, Calculator, Users, TrendingUp, Wallet, Info, UserPlus, Store } from 'lucide-react';
import CapacityGauge from './CapacityGauge';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import CommercialSearchFields from './CommercialSearchFields';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
  onAddCoBuyer?: () => void;
}

export default function MandatFormStep4({ data, onChange, onAddCoBuyer }: Props) {
  const isRental = data.type_recherche === 'Louer';
  const isPurchase = data.type_recherche === 'Acheter';
  const isCommercial = data.type_bien === 'Local commercial';
  const isSociete = data.location_type === 'societe';

  // Calculate total income including candidates
  const clientRevenus = data.revenus_mensuels || 0;
  const candidatsRevenus = data.candidats?.reduce((sum, c) => sum + (c.revenus_mensuels || 0), 0) || 0;
  const totalRevenusMensuels = clientRevenus + candidatsRevenus;
  const hasCandidates = data.candidats && data.candidats.length > 0;

  // Calculate rental budget recommendation (1/3 of total income)
  const budgetConseilleLocation = totalRevenusMensuels ? Math.floor(totalRevenusMensuels / 3) : 0;
  
  // Rental effort rate calculation (loyer / revenus * 100)
  const tauxEffortLocation = totalRevenusMensuels > 0 && data.budget_max > 0
    ? Math.round((data.budget_max / totalRevenusMensuels) * 100)
    : 0;
  
  // Rental income requirements
  const revenuMinRequiLocation = data.budget_max > 0 ? data.budget_max * 3 : 0;
  const revenuManquantLocation = Math.max(0, revenuMinRequiLocation - totalRevenusMensuels);
  
  // Rental viability
  const isRentalViable = tauxEffortLocation <= 33;

  // Calculate purchase viability with total income
  const revenuAnnuelBrut = totalRevenusMensuels * 12;
  
  // Prix max finançable = (Revenu annuel × 33%) / 7%
  const prixAchatMax = revenuAnnuelBrut > 0 ? Math.round((revenuAnnuelBrut * 0.33) / 0.07) : 0;
  
  // Apport requis = 26% du prix d'achat (20% fonds propres + 6% frais)
  const apportRequis = data.budget_max > 0 ? Math.round(data.budget_max * 0.26) : 0;
  const apportManquant = Math.max(0, apportRequis - (data.apport_personnel || 0));
  
  // Charges mensuelles = (Prix × 7%) / 12
  const chargesMensuelles = data.budget_max > 0 ? Math.round((data.budget_max * 0.07) / 12) : 0;
  
  // Taux d'effort = Charges annuelles / Revenu annuel × 100
  const tauxEffort = revenuAnnuelBrut > 0 && data.budget_max > 0 
    ? Math.round(((data.budget_max * 0.07) / revenuAnnuelBrut) * 100) 
    : 0;
  
  // Revenu minimum requis pour ce prix = (Prix × 7%) / 33%
  const revenuMinRequis = data.budget_max > 0 ? Math.round((data.budget_max * 0.07) / 0.33) : 0;
  const revenuMinMensuel = Math.round(revenuMinRequis / 12);
  
  // Revenu manquant
  const revenuManquant = Math.max(0, revenuMinMensuel - totalRevenusMensuels);

  // Check permit for purchase eligibility
  const permisEligibleAchat = ['B', 'C', 'Suisse', 'Suisse / Autre'].some(p => 
    data.type_permis?.includes(p) || data.nationalite?.toLowerCase().includes('suisse')
  );

  // Check overall viability
  const isViable = tauxEffort <= 33 && apportManquant === 0 && permisEligibleAchat;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Critères de recherche</h2>
        <p className="text-sm text-muted-foreground">Informez notre équipe de vos critères</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <Label>Comment avez-vous découvert notre agence ? *</Label>
          <Select value={data.decouverte_agence} onValueChange={(value) => onChange({ decouverte_agence: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {DECOUVERTES_AGENCE.map((dec) => (
                <SelectItem key={dec} value={dec}>{dec}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search type selection with visual cards */}
        <div className="space-y-3">
          <Label>Que recherchez-vous ? *</Label>
          <RadioGroup
            value={data.type_recherche}
            onValueChange={(value) => onChange({ type_recherche: value, budget_max: 0, apport_personnel: 0 })}
            className="grid grid-cols-2 gap-4"
          >
            <Label
              htmlFor="type-louer"
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isRental ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
              }`}
            >
              <RadioGroupItem value="Louer" id="type-louer" className="sr-only" />
              <Home className={`h-8 w-8 ${isRental ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`font-medium ${isRental ? 'text-primary' : ''}`}>Louer</span>
              <span className="text-xs text-muted-foreground text-center">Acompte: 300 CHF</span>
            </Label>
            <Label
              htmlFor="type-acheter"
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isPurchase ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
              }`}
            >
              <RadioGroupItem value="Acheter" id="type-acheter" className="sr-only" />
              <Building2 className={`h-8 w-8 ${isPurchase ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`font-medium ${isPurchase ? 'text-primary' : ''}`}>Acheter</span>
              <span className="text-xs text-muted-foreground text-center">Acompte: 2'500 CHF</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Permit eligibility warning for purchase */}
        {isPurchase && !permisEligibleAchat && data.type_permis && (
          <Card className="p-4 border-orange-500 bg-orange-50 dark:bg-orange-950/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-700 dark:text-orange-400">
                  Permis non éligible à l'achat
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-500 mt-1">
                  En Suisse, l'accès à la propriété requiert un permis B, C ou la nationalité suisse.
                  Votre permis actuel ({data.type_permis}) ne permet pas l'acquisition immobilière.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Income info for purchase */}
        {isPurchase && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-700 dark:text-blue-400">
                  Revenus pris en compte
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600 dark:text-blue-500">Vos revenus:</span>
                    <span className="font-medium text-blue-700 dark:text-blue-400">
                      {clientRevenus.toLocaleString('fr-CH')} CHF/mois
                    </span>
                  </div>
                  {hasCandidates && (
                    <div className="flex justify-between">
                      <span className="text-blue-600 dark:text-blue-500">
                        Revenus candidats ({data.candidats.length}):
                      </span>
                      <span className="font-medium text-blue-700 dark:text-blue-400">
                        +{candidatsRevenus.toLocaleString('fr-CH')} CHF/mois
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                    <span className="font-medium text-blue-700 dark:text-blue-400">Revenu total:</span>
                    <span className="font-bold text-blue-800 dark:text-blue-300">
                      {totalRevenusMensuels.toLocaleString('fr-CH')} CHF/mois
                    </span>
                  </div>
                </div>
                {!hasCandidates && revenuManquant > 0 && onAddCoBuyer && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 w-full gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
                    onClick={onAddCoBuyer}
                  >
                    <UserPlus className="h-4 w-4" />
                    Ajouter un co-acquéreur maintenant
                  </Button>
                )}
                {!hasCandidates && !revenuManquant && (
                  <p className="text-xs text-blue-500 dark:text-blue-600 mt-2">
                    💡 Vous pouvez ajouter des co-acquéreurs à l'étape suivante pour augmenter votre capacité d'emprunt.
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Number of occupants - hide for commercial */}
        {!isCommercial && (
          <div className="space-y-2">
            <Label htmlFor="nombre_occupants">Combien de personnes occuperaient le bien ? *</Label>
            <Input
              id="nombre_occupants"
              type="number"
              value={data.nombre_occupants || ''}
              onChange={(e) => onChange({ nombre_occupants: Number(e.target.value) })}
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="type_bien">Type d'objet *</Label>
          <Select value={data.type_bien} onValueChange={(value) => {
            // Reset commercial fields when changing type
            if (value !== 'Local commercial') {
              onChange({ 
                type_bien: value,
                location_type: null,
                raison_sociale: '',
                numero_ide: '',
                chiffre_affaires: 0,
                type_exploitation: '',
                nombre_employes: 0,
                surface_souhaitee: 0,
                etage_souhaite: '',
                affectation_commerciale: '',
                besoins_commerciaux: []
              });
            } else {
              onChange({ type_bien: value });
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {TYPES_BIEN.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Number of rooms - hide for commercial, show surface instead */}
        {!isCommercial && (
          <div className="space-y-2">
            <Label htmlFor="pieces_recherche">Nombre de pièces *</Label>
            <Select value={data.pieces_recherche} onValueChange={(value) => onChange({ pieces_recherche: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez" />
              </SelectTrigger>
              <SelectContent>
                {PIECES_OPTIONS.map((piece) => (
                  <SelectItem key={piece} value={piece}>{piece}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="region_recherche">Région(s) *</Label>
          <GooglePlacesAutocomplete
            value={data.region_recherche}
            onChange={(value) => onChange({ region_recherche: value })}
            placeholder="Tapez une région, commune ou district..."
            multiSelect
          />
          <p className="text-xs text-muted-foreground">
            Vous pouvez sélectionner plusieurs régions
          </p>
        </div>

        {/* Commercial-specific search fields */}
        {isCommercial && (
          <div className="md:col-span-2">
            <CommercialSearchFields data={data} onChange={onChange} />
          </div>
        )}

          {/* RENTAL: Budget field */}
          {isRental && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="budget_max">Budget maximum (loyer mensuel CHF) *</Label>
              <Input
                id="budget_max"
                type="number"
                value={data.budget_max || ''}
                onChange={(e) => onChange({ budget_max: Number(e.target.value) })}
                placeholder="Le loyer brut ne devant pas dépasser le tiers du salaire"
                required
              />
              <p className="text-xs text-muted-foreground">
                Budget conseillé max: {budgetConseilleLocation > 0 ? `${budgetConseilleLocation.toLocaleString('fr-CH')} CHF` : '---'} 
                (1/3 de vos revenus{hasCandidates ? ' + candidats' : ''})
              </p>
            </div>
          )}

          {/* RENTAL: Viability analysis */}
          {isRental && data.budget_max > 0 && (
            <Card className={`md:col-span-2 p-4 ${isRentalViable ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Analyse de votre budget location</span>
                </div>
                {isRentalViable ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Budget adapté
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Budget élevé
                  </Badge>
                )}
              </div>
              
              {/* Visual Gauge for rental */}
              <div className="flex justify-center mb-6 py-4 bg-background rounded-lg">
                <CapacityGauge 
                  currentValue={tauxEffortLocation}
                  maxValue={50}
                  label="Taux d'effort"
                />
              </div>

              {/* Recommendation for rental */}
              {!isRentalViable && (
                <Card className="p-4 mb-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                      <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                        💡 Recommandation basée sur vos revenus
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                        Avec vos revenus actuels de <strong>{totalRevenusMensuels.toLocaleString('fr-CH')} CHF/mois</strong>, 
                        nous vous recommandons de viser un loyer de :
                      </p>
                      <div className="bg-white dark:bg-blue-950/50 rounded-lg p-3 text-center">
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {budgetConseilleLocation.toLocaleString('fr-CH')} CHF/mois
                        </p>
                        <p className="text-xs text-blue-600/70 dark:text-blue-500 mt-1">
                          Loyer max pour un taux d'effort de 33%
                        </p>
                      </div>
                      <div className="mt-3 text-xs text-blue-600 dark:text-blue-500 space-y-1">
                        <p>📊 Votre budget actuel: {data.budget_max.toLocaleString('fr-CH')} CHF/mois
                          <span className="text-destructive font-medium"> (+{(data.budget_max - budgetConseilleLocation).toLocaleString('fr-CH')} CHF de trop)</span>
                        </p>
                        <p>💰 Revenu min requis pour {data.budget_max.toLocaleString('fr-CH')} CHF: {revenuMinRequiLocation.toLocaleString('fr-CH')} CHF/mois</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Rental metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Card className="p-3 bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Taux d'effort</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    <span className={tauxEffortLocation > 33 ? 'text-destructive' : 'text-green-600'}>
                      {tauxEffortLocation}%
                    </span>
                    <span className="text-muted-foreground text-sm font-normal"> / 33% max</span>
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>Loyer: {data.budget_max.toLocaleString('fr-CH')} CHF/mois</p>
                    <p>Revenus: {totalRevenusMensuels.toLocaleString('fr-CH')} CHF/mois</p>
                  </div>
                </Card>

                <Card className="p-3 bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Revenus cumulés</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    <span className={revenuManquantLocation > 0 ? 'text-destructive' : 'text-green-600'}>
                      {totalRevenusMensuels.toLocaleString('fr-CH')}
                    </span>
                    <span className="text-muted-foreground text-sm font-normal"> / {revenuMinRequiLocation.toLocaleString('fr-CH')} CHF</span>
                  </div>
                  {revenuManquantLocation > 0 && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ Il manque {revenuManquantLocation.toLocaleString('fr-CH')} CHF/mois
                    </p>
                  )}
                </Card>
              </div>

              {/* Requirements summary for rental */}
              <div className="bg-background rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Exigences pour ce loyer
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenu mensuel min:</span>
                    <span className={`font-medium ${revenuManquantLocation > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {revenuMinRequiLocation.toLocaleString('fr-CH')} CHF
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Votre revenu total:</span>
                    <span className="font-medium">{totalRevenusMensuels.toLocaleString('fr-CH')} CHF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loyer max conseillé:</span>
                    <span className="font-medium text-green-600">{budgetConseilleLocation.toLocaleString('fr-CH')} CHF</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Votre budget:</span>
                    <span className={`font-medium ${!isRentalViable ? 'text-destructive' : ''}`}>{data.budget_max.toLocaleString('fr-CH')} CHF</span>
                  </div>
                </div>
                
                {revenuManquantLocation > 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex flex-col gap-2">
                      <span>
                        Il vous manque <strong>{revenuManquantLocation.toLocaleString('fr-CH')} CHF/mois</strong> de revenus pour ce loyer.
                      </span>
                      {!hasCandidates && onAddCoBuyer && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="w-fit gap-2 border-red-300 bg-white/50 dark:bg-black/20 text-destructive hover:bg-red-100 dark:hover:bg-red-950"
                          onClick={onAddCoBuyer}
                        >
                          <UserPlus className="h-4 w-4" />
                          Ajouter un colocataire maintenant
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                💡 En Suisse, les régies exigent généralement que le loyer ne dépasse pas 33% des revenus bruts mensuels.
              </p>
            </Card>
          )}

          {/* PURCHASE: Price and down payment fields */}
          {isPurchase && (
            <>
              <div className="space-y-2">
                <Label htmlFor="budget_max">Prix d'achat maximum (CHF) *</Label>
                <Input
                  id="budget_max"
                  type="number"
                  value={data.budget_max || ''}
                  onChange={(e) => onChange({ budget_max: Number(e.target.value) })}
                  placeholder="Prix d'achat souhaité"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Avec vos revenus, prix max: <strong>{prixAchatMax > 0 ? `${prixAchatMax.toLocaleString('fr-CH')} CHF` : '---'}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apport_personnel">Apport personnel disponible (CHF) *</Label>
                <Input
                  id="apport_personnel"
                  type="number"
                  value={data.apport_personnel || ''}
                  onChange={(e) => onChange({ apport_personnel: Number(e.target.value) })}
                  placeholder="Fonds propres disponibles"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Apport requis (26%): <strong>{apportRequis > 0 ? `${apportRequis.toLocaleString('fr-CH')} CHF` : '---'}</strong>
                </p>
              </div>

              {/* Purchase viability analysis - Enhanced */}
              {data.budget_max > 0 && (
                <Card className={`md:col-span-2 p-4 ${isViable ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Analyse de financement</span>
                    </div>
                    {isViable ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Finançable
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        À revoir
                      </Badge>
                    )}
                  </div>
                  
                  {/* Visual Gauge */}
                  <div className="flex justify-center mb-6 py-4 bg-background rounded-lg">
                    <CapacityGauge 
                      currentValue={tauxEffort}
                      maxValue={50}
                      label="Taux d'effort"
                    />
                  </div>

                  {/* Recommendation based on income */}
                  {!isViable && tauxEffort > 33 && (
                    <Card className="p-4 mb-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                          <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                            💡 Recommandation basée sur vos revenus
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                            Avec vos revenus actuels de <strong>{totalRevenusMensuels.toLocaleString('fr-CH')} CHF/mois</strong>, 
                            nous vous recommandons de viser un bien à :
                          </p>
                          <div className="bg-white dark:bg-blue-950/50 rounded-lg p-3 text-center">
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                              {prixAchatMax.toLocaleString('fr-CH')} CHF
                            </p>
                            <p className="text-xs text-blue-600/70 dark:text-blue-500 mt-1">
                              Prix max pour un taux d'effort de 33%
                            </p>
                          </div>
                          <div className="mt-3 text-xs text-blue-600 dark:text-blue-500 space-y-1">
                            <p>📊 Votre budget actuel: {data.budget_max.toLocaleString('fr-CH')} CHF 
                              <span className="text-destructive font-medium"> (+{((data.budget_max - prixAchatMax) / 1000).toFixed(0)}k de trop)</span>
                            </p>
                            <p>💰 Apport requis pour {prixAchatMax.toLocaleString('fr-CH')} CHF: {Math.round(prixAchatMax * 0.26).toLocaleString('fr-CH')} CHF</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                  
                  {/* Main metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Taux d'effort - Detailed */}
                    <Card className="p-3 bg-background">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Taux d'effort</span>
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        <span className={tauxEffort > 33 ? 'text-destructive' : 'text-green-600'}>
                          {tauxEffort}%
                        </span>
                        <span className="text-muted-foreground text-sm font-normal"> / 33% max</span>
                      </div>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p>Charges annuelles: {(data.budget_max * 0.07).toLocaleString('fr-CH')} CHF</p>
                        <p>Revenu annuel: {revenuAnnuelBrut.toLocaleString('fr-CH')} CHF</p>
                      </div>
                    </Card>

                    {/* Apport - Detailed */}
                    <Card className="p-3 bg-background">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Apport personnel</span>
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        <span className={apportManquant > 0 ? 'text-destructive' : 'text-green-600'}>
                          {(data.apport_personnel || 0).toLocaleString('fr-CH')}
                        </span>
                        <span className="text-muted-foreground text-sm font-normal"> / {apportRequis.toLocaleString('fr-CH')} CHF</span>
                      </div>
                      {apportManquant > 0 && (
                        <p className="text-xs text-destructive font-medium">
                          ⚠️ Il manque {apportManquant.toLocaleString('fr-CH')} CHF
                        </p>
                      )}
                    </Card>
                  </div>

                  {/* Requirements summary */}
                  <div className="bg-background rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Exigences pour ce prix d'achat
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Revenu mensuel min:</span>
                        <span className={`font-medium ${revenuManquant > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {revenuMinMensuel.toLocaleString('fr-CH')} CHF
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Votre revenu total:</span>
                        <span className="font-medium">{totalRevenusMensuels.toLocaleString('fr-CH')} CHF</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Apport min (26%):</span>
                        <span className={`font-medium ${apportManquant > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {apportRequis.toLocaleString('fr-CH')} CHF
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Charges mensuelles:</span>
                        <span className="font-medium">{chargesMensuelles.toLocaleString('fr-CH')} CHF</span>
                      </div>
                    </div>
                    
                    {revenuManquant > 0 && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="flex flex-col gap-2">
                          <span>
                            Il vous manque <strong>{revenuManquant.toLocaleString('fr-CH')} CHF/mois</strong> de revenus.
                          </span>
                          {!hasCandidates && onAddCoBuyer && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              className="w-fit gap-2 border-red-300 bg-white/50 dark:bg-black/20 text-destructive hover:bg-red-100 dark:hover:bg-red-950"
                              onClick={onAddCoBuyer}
                            >
                              <UserPlus className="h-4 w-4" />
                              Ajouter un co-acquéreur maintenant
                            </Button>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                    💡 Calcul basé sur les normes bancaires suisses: intérêts théoriques 5% + amortissement 1% + charges 1% = 7%/an.
                    Les charges ne doivent pas dépasser 33% du revenu brut annuel.
                  </p>
                </Card>
              )}
            </>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="souhaits_particuliers">Souhaits particuliers (étage, quartier, vue...)</Label>
            <Textarea
              id="souhaits_particuliers"
              value={data.souhaits_particuliers}
              onChange={(e) => onChange({ souhaits_particuliers: e.target.value })}
              placeholder="Décrivez vos souhaits particuliers..."
              rows={3}
            />
          </div>
        </div>

        {/* Residential questions - hide for commercial */}
        {!isCommercial && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-3">
              <Label>Avez-vous des animaux ?</Label>
              <RadioGroup
                value={data.animaux ? 'oui' : 'non'}
                onValueChange={(value) => onChange({ animaux: value === 'oui' })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oui" id="animaux-oui" />
                  <Label htmlFor="animaux-oui" className="font-normal">Oui</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non" id="animaux-non" />
                  <Label htmlFor="animaux-non" className="font-normal">Non</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Jouez-vous d'un instrument de musique ? *</Label>
              <RadioGroup
                value={data.instrument_musique ? 'oui' : 'non'}
                onValueChange={(value) => onChange({ instrument_musique: value === 'oui' })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oui" id="instrument-oui" />
                  <Label htmlFor="instrument-oui" className="font-normal">Oui</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non" id="instrument-non" />
                  <Label htmlFor="instrument-non" className="font-normal">Non</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Avez-vous un ou plusieurs véhicules ? *</Label>
              <RadioGroup
                value={data.vehicules ? 'oui' : 'non'}
                onValueChange={(value) => onChange({ vehicules: value === 'oui' })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oui" id="vehicules-oui" />
                  <Label htmlFor="vehicules-oui" className="font-normal">Oui</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non" id="vehicules-non" />
                  <Label htmlFor="vehicules-non" className="font-normal">Non</Label>
                </div>
              </RadioGroup>
            </div>

            {data.vehicules && (
              <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                <Label htmlFor="numero_plaques">Numéro(s) de plaque(s)</Label>
                <Input
                  id="numero_plaques"
                  value={data.numero_plaques}
                  onChange={(e) => onChange({ numero_plaques: e.target.value })}
                  placeholder="Ex: VD 123456"
                />
              </div>
            )}
          </div>
        )}
    </div>
  );
}
