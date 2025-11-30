import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MandatFormData, DECOUVERTES_AGENCE, TYPES_BIEN, PIECES_OPTIONS, REGIONS } from './types';
import { Home, Building2, AlertCircle, CheckCircle, Calculator } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep4({ data, onChange }: Props) {
  const isRental = data.type_recherche === 'Louer';
  const isPurchase = data.type_recherche === 'Acheter';

  // Calculate rental budget recommendation (1/3 of income)
  const budgetConseilleLocation = data.revenus_mensuels ? Math.floor(data.revenus_mensuels / 3) : 0;

  // Calculate purchase viability
  const revenuAnnuelBrut = (data.revenus_mensuels || 0) * 12;
  const prixAchatMax = revenuAnnuelBrut > 0 ? Math.round((revenuAnnuelBrut * 0.33) / 0.07) : 0;
  const apportRequis = data.budget_max > 0 ? Math.round(data.budget_max * 0.26) : 0;
  const apportManquant = Math.max(0, apportRequis - (data.apport_personnel || 0));
  const chargesMensuelles = data.budget_max > 0 ? Math.round((data.budget_max * 0.07) / 12) : 0;
  const tauxEffort = revenuAnnuelBrut > 0 && data.budget_max > 0 
    ? Math.round(((data.budget_max * 0.07) / revenuAnnuelBrut) * 100) 
    : 0;

  // Check permit for purchase eligibility
  const permisEligibleAchat = ['B', 'C', 'Suisse', 'Suisse / Autre'].some(p => 
    data.type_permis?.includes(p) || data.nationalite?.toLowerCase().includes('suisse')
  );

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="space-y-2">
            <Label htmlFor="type_bien">Type d'objet *</Label>
            <Select value={data.type_bien} onValueChange={(value) => onChange({ type_bien: value })}>
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

          <div className="space-y-2">
            <Label htmlFor="region_recherche">Région *</Label>
            <Select value={data.region_recherche} onValueChange={(value) => onChange({ region_recherche: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((region) => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                Budget conseillé max: {budgetConseilleLocation > 0 ? `${budgetConseilleLocation.toLocaleString()} CHF` : '---'} (1/3 de vos revenus)
              </p>
            </div>
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
                  Prix max finançable: {prixAchatMax > 0 ? `${prixAchatMax.toLocaleString()} CHF` : '---'}
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
                  Apport requis (26%): {apportRequis > 0 ? `${apportRequis.toLocaleString()} CHF` : '---'}
                </p>
              </div>

              {/* Purchase viability analysis */}
              {data.budget_max > 0 && (
                <Card className="md:col-span-2 p-4 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="h-5 w-5 text-primary" />
                    <span className="font-medium">Analyse de viabilité</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Apport requis (26%)</p>
                      <p className={`font-semibold ${apportManquant > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {apportRequis.toLocaleString()} CHF
                      </p>
                      {apportManquant > 0 && (
                        <p className="text-xs text-destructive">
                          Manque: {apportManquant.toLocaleString()} CHF
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Charges/mois (7%/an)</p>
                      <p className="font-semibold">{chargesMensuelles.toLocaleString()} CHF</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Taux d'effort</p>
                      <p className={`font-semibold ${tauxEffort > 33 ? 'text-destructive' : 'text-green-600'}`}>
                        {tauxEffort}%
                      </p>
                      <p className="text-xs text-muted-foreground">Max: 33%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Viabilité</p>
                      {tauxEffort <= 33 && apportManquant === 0 && permisEligibleAchat ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          À revoir
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 border-t pt-3">
                    💡 Calcul basé sur: intérêts 5% + amortissement 1% + entretien 1% = 7%/an. 
                    Les charges ne doivent pas dépasser 33% du revenu brut.
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
      </div>
    </div>
  );
}
