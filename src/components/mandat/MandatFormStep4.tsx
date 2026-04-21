import { MandatFormData, DECOUVERTES_AGENCE, TYPES_BIEN, PIECES_OPTIONS } from './types';
import { PremiumInput } from '@/components/forms-premium/PremiumInput';
import { PremiumSelect } from '@/components/forms-premium/PremiumSelect';
import { PremiumRadioGroup } from '@/components/forms-premium/PremiumRadioGroup';
import { PremiumTextarea } from '@/components/forms-premium/PremiumTextarea';
import { Home, Building2, AlertCircle, CheckCircle, Calculator, Users, TrendingUp, Wallet, Info, UserPlus } from 'lucide-react';
import CapacityGauge from './CapacityGauge';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import CommercialSearchFields from './CommercialSearchFields';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
  onAddCoBuyer?: () => void;
}

function GoldCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[hsl(38_45%_48%/0.2)] bg-[hsl(30_12%_10%/0.6)] p-4 ${className}`}>
      {children}
    </div>
  );
}

function StatusBadge({ viable, labelOk, labelNok }: { viable: boolean; labelOk: string; labelNok: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
      viable
        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
        : 'bg-red-500/15 text-red-400 border border-red-500/30'
    }`}>
      {viable ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
      {viable ? labelOk : labelNok}
    </span>
  );
}

export default function MandatFormStep4({ data, onChange, onAddCoBuyer }: Props) {
  const isRental = data.type_recherche === 'Louer';
  const isPurchase = data.type_recherche === 'Acheter';
  const isCommercial = data.type_bien === 'Local commercial';

  const clientRevenus = data.revenus_mensuels || 0;
  const candidatsRevenus = data.candidats?.reduce((sum, c) => sum + (c.revenus_mensuels || 0), 0) || 0;
  const totalRevenusMensuels = clientRevenus + candidatsRevenus;
  const hasCandidates = data.candidats && data.candidats.length > 0;

  const budgetConseilleLocation = totalRevenusMensuels ? Math.floor(totalRevenusMensuels / 3) : 0;
  const tauxEffortLocation = totalRevenusMensuels > 0 && data.budget_max > 0 ? Math.round((data.budget_max / totalRevenusMensuels) * 100) : 0;
  const revenuMinRequiLocation = data.budget_max > 0 ? data.budget_max * 3 : 0;
  const revenuManquantLocation = Math.max(0, revenuMinRequiLocation - totalRevenusMensuels);
  const isRentalViable = tauxEffortLocation <= 33;

  const revenuAnnuelBrut = totalRevenusMensuels * 12;
  const prixAchatMax = revenuAnnuelBrut > 0 ? Math.round((revenuAnnuelBrut * 0.33) / 0.07) : 0;
  const apportRequis = data.budget_max > 0 ? Math.round(data.budget_max * 0.26) : 0;
  const apportManquant = Math.max(0, apportRequis - (data.apport_personnel || 0));
  const chargesMensuelles = data.budget_max > 0 ? Math.round((data.budget_max * 0.07) / 12) : 0;
  const tauxEffort = revenuAnnuelBrut > 0 && data.budget_max > 0 ? Math.round(((data.budget_max * 0.07) / revenuAnnuelBrut) * 100) : 0;
  const revenuMinRequis = data.budget_max > 0 ? Math.round((data.budget_max * 0.07) / 0.33) : 0;
  const revenuMinMensuel = Math.round(revenuMinRequis / 12);
  const revenuManquant = Math.max(0, revenuMinMensuel - totalRevenusMensuels);
  const permisEligibleAchat = ['B', 'C', 'Suisse', 'Suisse / Autre'].some(p => data.type_permis?.includes(p) || data.nationalite?.toLowerCase().includes('suisse'));
  const isViable = tauxEffort <= 33 && apportManquant === 0 && permisEligibleAchat;

  const OUNI_NON = [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }];

  return (
    <div className="space-y-5">
      <PremiumSelect
        label="Comment avez-vous découvert notre agence ?"
        value={data.decouverte_agence}
        onValueChange={(v) => onChange({ decouverte_agence: v })}
        options={DECOUVERTES_AGENCE.map(d => ({ value: d, label: d }))}
        required
      />

      {/* Type de recherche */}
      <PremiumRadioGroup
        label="Que recherchez-vous ?"
        options={[
          { value: 'Louer', label: 'Louer', description: 'Acompte: 300 CHF', icon: <Home size={20} strokeWidth={1.5} /> },
          { value: 'Acheter', label: 'Acheter', description: "Acompte: 2'500 CHF", icon: <Building2 size={20} strokeWidth={1.5} /> },
        ]}
        value={data.type_recherche}
        onChange={(v) => onChange({ type_recherche: v, budget_max: 0, apport_personnel: 0 })}
        columns={2}
        required
      />

      {/* Permis warning for purchase */}
      {isPurchase && !permisEligibleAchat && data.type_permis && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-4 flex gap-3">
          <AlertCircle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-300">Permis non éligible à l'achat</p>
            <p className="text-xs text-orange-400/80 mt-1">En Suisse, l'accès à la propriété requiert un permis B, C ou la nationalité suisse. Votre permis actuel ({data.type_permis}) ne permet pas l'acquisition immobilière.</p>
          </div>
        </div>
      )}

      {/* Revenus info for purchase */}
      {isPurchase && (
        <GoldCard>
          <div className="flex items-start gap-3">
            <Users size={16} className="text-[hsl(38_55%_65%)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[hsl(40_20%_75%)]">Revenus pris en compte</p>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between text-[hsl(40_20%_55%)]">
                  <span>Vos revenus:</span>
                  <span className="font-medium text-[hsl(40_20%_70%)]">{clientRevenus.toLocaleString('fr-CH')} CHF/mois</span>
                </div>
                {hasCandidates && (
                  <div className="flex justify-between text-[hsl(40_20%_55%)]">
                    <span>Revenus candidats ({data.candidats.length}):</span>
                    <span className="font-medium text-emerald-400">+{candidatsRevenus.toLocaleString('fr-CH')} CHF/mois</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-[hsl(38_45%_48%/0.15)]">
                  <span className="font-semibold text-[hsl(40_20%_65%)]">Revenu total:</span>
                  <span className="font-bold text-[hsl(38_55%_65%)]">{totalRevenusMensuels.toLocaleString('fr-CH')} CHF/mois</span>
                </div>
              </div>
              {!hasCandidates && revenuManquant > 0 && onAddCoBuyer && (
                <button type="button" onClick={onAddCoBuyer} className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-[hsl(38_45%_48%/0.3)] text-[hsl(38_55%_65%)] hover:bg-[hsl(38_45%_48%/0.1)] transition-colors">
                  <UserPlus size={13} /> Ajouter un co-acquéreur maintenant
                </button>
              )}
            </div>
          </div>
        </GoldCard>
      )}

      {!isCommercial && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[hsl(40_20%_60%)]">
            Combien de personnes occuperaient le bien ? <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={data.nombre_occupants || ''}
            onChange={(e) => onChange({ nombre_occupants: Number(e.target.value) })}
            className="w-full bg-[hsl(30_15%_9%/0.6)] border border-[hsl(38_45%_48%/0.2)] rounded-xl px-4 py-3 text-sm text-[hsl(40_20%_75%)] placeholder:text-[hsl(40_20%_38%)] focus:outline-none focus:border-[hsl(38_55%_65%/0.7)] focus:ring-2 focus:ring-[hsl(38_45%_48%/0.25)] transition-all duration-300"
          />
        </div>
      )}

      <PremiumSelect
        label="Type d'objet"
        value={data.type_bien}
        onValueChange={(v) => {
          if (v !== 'Local commercial') {
            onChange({ type_bien: v, location_type: null, raison_sociale: '', numero_ide: '', chiffre_affaires: 0, type_exploitation: '', nombre_employes: 0, surface_souhaitee: 0, etage_souhaite: '', affectation_commerciale: '', besoins_commerciaux: [] });
          } else {
            onChange({ type_bien: v });
          }
        }}
        options={TYPES_BIEN.map(t => ({ value: t, label: t }))}
        required
      />

      {!isCommercial && (
        <PremiumSelect
          label="Nombre de pièces"
          value={data.pieces_recherche}
          onValueChange={(v) => onChange({ pieces_recherche: v })}
          options={PIECES_OPTIONS.map(p => ({ value: p, label: p }))}
          required
        />
      )}

      {/* Région */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[hsl(40_20%_60%)]">Région(s)</label>
        <GooglePlacesAutocomplete
          value={data.region_recherche}
          onChange={(value) => onChange({ region_recherche: value })}
          placeholder="Tapez une région, commune ou district..."
          multiSelect
        />
        <p className="text-[11px] text-[hsl(40_20%_38%)]">Vous pouvez sélectionner plusieurs régions</p>
      </div>

      {isCommercial && <CommercialSearchFields data={data} onChange={onChange} />}

      {/* RENTAL budget */}
      {isRental && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[hsl(40_20%_60%)]">
            Budget maximum (loyer mensuel CHF) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={data.budget_max || ''}
            onChange={(e) => onChange({ budget_max: Number(e.target.value) })}
            placeholder="Le loyer brut ne devant pas dépasser le tiers du salaire"
            className="w-full bg-[hsl(30_15%_9%/0.6)] border border-[hsl(38_45%_48%/0.2)] rounded-xl px-4 py-3 text-sm text-[hsl(40_20%_75%)] placeholder:text-[hsl(40_20%_38%)] focus:outline-none focus:border-[hsl(38_55%_65%/0.7)] focus:ring-2 focus:ring-[hsl(38_45%_48%/0.25)] transition-all duration-300"
          />
          <p className="text-[11px] text-[hsl(40_20%_38%)]">
            Budget conseillé max: {budgetConseilleLocation > 0 ? `${budgetConseilleLocation.toLocaleString('fr-CH')} CHF` : '---'} (1/3 de vos revenus{hasCandidates ? ' + candidats' : ''})
          </p>
        </div>
      )}

      {/* RENTAL viability */}
      {isRental && data.budget_max > 0 && (
        <div className={`rounded-xl border p-4 ${isRentalViable ? 'border-emerald-500/25 bg-emerald-950/15' : 'border-red-500/25 bg-red-950/10'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calculator size={16} className="text-[hsl(38_55%_65%)]" />
              <span className="text-sm font-semibold text-[hsl(40_20%_80%)]">Analyse de votre budget location</span>
            </div>
            <StatusBadge viable={isRentalViable} labelOk="Budget adapté" labelNok="Budget élevé" />
          </div>
          <div className="flex justify-center mb-4 py-3 bg-[hsl(30_15%_8%/0.5)] rounded-lg">
            <CapacityGauge currentValue={tauxEffortLocation} maxValue={50} label="Taux d'effort" />
          </div>
          {!isRentalViable && (
            <GoldCard className="mb-4">
              <p className="text-xs font-semibold text-[hsl(40_20%_72%)] mb-1">Recommandation basée sur vos revenus</p>
              <p className="text-xs text-[hsl(40_20%_50%)] mb-2">
                Avec vos revenus de <strong className="text-[hsl(40_20%_65%)]">{totalRevenusMensuels.toLocaleString('fr-CH')} CHF/mois</strong>, loyer recommandé&nbsp;:
              </p>
              <p className="text-2xl font-bold text-[hsl(38_55%_65%)] text-center">{budgetConseilleLocation.toLocaleString('fr-CH')} CHF/mois</p>
            </GoldCard>
          )}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <GoldCard>
              <div className="flex items-center gap-1.5 mb-1.5"><TrendingUp size={14} className="text-[hsl(40_20%_45%)]" /><span className="text-xs font-medium text-[hsl(40_20%_65%)]">Taux d'effort</span></div>
              <p className="text-xl font-bold"><span className={tauxEffortLocation > 33 ? 'text-red-400' : 'text-emerald-400'}>{tauxEffortLocation}%</span><span className="text-[hsl(40_20%_40%)] text-xs font-normal"> / 33% max</span></p>
            </GoldCard>
            <GoldCard>
              <div className="flex items-center gap-1.5 mb-1.5"><Users size={14} className="text-[hsl(40_20%_45%)]" /><span className="text-xs font-medium text-[hsl(40_20%_65%)]">Revenus cumulés</span></div>
              <p className="text-xl font-bold"><span className={revenuManquantLocation > 0 ? 'text-red-400' : 'text-emerald-400'}>{totalRevenusMensuels.toLocaleString('fr-CH')}</span></p>
              {revenuManquantLocation > 0 && <p className="text-[10px] text-red-400 mt-0.5">⚠ Il manque {revenuManquantLocation.toLocaleString('fr-CH')} CHF/mois</p>}
            </GoldCard>
          </div>
          {revenuManquantLocation > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/15 p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="text-red-300">Il vous manque <strong>{revenuManquantLocation.toLocaleString('fr-CH')} CHF/mois</strong> de revenus pour ce loyer.</p>
                {!hasCandidates && onAddCoBuyer && (
                  <button type="button" onClick={onAddCoBuyer} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-400/30 text-red-300 hover:bg-red-950/30 transition-colors">
                    <UserPlus size={12} /> Ajouter un colocataire maintenant
                  </button>
                )}
              </div>
            </div>
          )}
          <p className="text-[10px] text-[hsl(40_20%_35%)] mt-3 pt-3 border-t border-[hsl(38_45%_48%/0.1)]">
            💡 En Suisse, les régies exigent généralement que le loyer ne dépasse pas 33% des revenus bruts mensuels.
          </p>
        </div>
      )}

      {/* PURCHASE */}
      {isPurchase && (
        <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[hsl(40_20%_60%)]">Prix d'achat maximum (CHF) <span className="text-red-400">*</span></label>
            <input
              type="number"
              value={data.budget_max || ''}
              onChange={(e) => onChange({ budget_max: Number(e.target.value) })}
              placeholder="Prix d'achat souhaité"
              className="w-full bg-[hsl(30_15%_9%/0.6)] border border-[hsl(38_45%_48%/0.2)] rounded-xl px-4 py-3 text-sm text-[hsl(40_20%_75%)] placeholder:text-[hsl(40_20%_38%)] focus:outline-none focus:border-[hsl(38_55%_65%/0.7)] focus:ring-2 focus:ring-[hsl(38_45%_48%/0.25)] transition-all duration-300"
            />
            <p className="text-[11px] text-[hsl(40_20%_38%)]">Avec vos revenus, prix max: <strong className="text-[hsl(40_20%_55%)]">{prixAchatMax > 0 ? `${prixAchatMax.toLocaleString('fr-CH')} CHF` : '---'}</strong></p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[hsl(40_20%_60%)]">Apport personnel disponible (CHF) <span className="text-red-400">*</span></label>
            <input
              type="number"
              value={data.apport_personnel || ''}
              onChange={(e) => onChange({ apport_personnel: Number(e.target.value) })}
              placeholder="Fonds propres disponibles"
              className="w-full bg-[hsl(30_15%_9%/0.6)] border border-[hsl(38_45%_48%/0.2)] rounded-xl px-4 py-3 text-sm text-[hsl(40_20%_75%)] placeholder:text-[hsl(40_20%_38%)] focus:outline-none focus:border-[hsl(38_55%_65%/0.7)] focus:ring-2 focus:ring-[hsl(38_45%_48%/0.25)] transition-all duration-300"
            />
            <p className="text-[11px] text-[hsl(40_20%_38%)]">Apport requis (26%): <strong className="text-[hsl(40_20%_55%)]">{apportRequis > 0 ? `${apportRequis.toLocaleString('fr-CH')} CHF` : '---'}</strong></p>
          </div>

          {data.budget_max > 0 && (
            <div className={`rounded-xl border p-4 ${isViable ? 'border-emerald-500/25 bg-emerald-950/15' : 'border-red-500/25 bg-red-950/10'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-[hsl(38_55%_65%)]" />
                  <span className="text-sm font-semibold text-[hsl(40_20%_80%)]">Analyse de financement</span>
                </div>
                <StatusBadge viable={isViable} labelOk="Finançable" labelNok="À revoir" />
              </div>
              <div className="flex justify-center mb-4 py-3 bg-[hsl(30_15%_8%/0.5)] rounded-lg">
                <CapacityGauge currentValue={tauxEffort} maxValue={50} label="Taux d'effort" />
              </div>
              {!isViable && tauxEffort > 33 && (
                <GoldCard className="mb-4">
                  <p className="text-xs font-semibold text-[hsl(40_20%_72%)] mb-1">Recommandation basée sur vos revenus</p>
                  <p className="text-xs text-[hsl(40_20%_50%)] mb-2">Avec <strong className="text-[hsl(40_20%_65%)]">{totalRevenusMensuels.toLocaleString('fr-CH')} CHF/mois</strong>, bien recommandé à&nbsp;:</p>
                  <p className="text-2xl font-bold text-[hsl(38_55%_65%)] text-center">{prixAchatMax.toLocaleString('fr-CH')} CHF</p>
                </GoldCard>
              )}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <GoldCard>
                  <div className="flex items-center gap-1.5 mb-1.5"><TrendingUp size={14} className="text-[hsl(40_20%_45%)]" /><span className="text-xs font-medium text-[hsl(40_20%_65%)]">Taux d'effort</span></div>
                  <p className="text-xl font-bold"><span className={tauxEffort > 33 ? 'text-red-400' : 'text-emerald-400'}>{tauxEffort}%</span><span className="text-[hsl(40_20%_40%)] text-xs font-normal"> / 33% max</span></p>
                </GoldCard>
                <GoldCard>
                  <div className="flex items-center gap-1.5 mb-1.5"><Wallet size={14} className="text-[hsl(40_20%_45%)]" /><span className="text-xs font-medium text-[hsl(40_20%_65%)]">Apport personnel</span></div>
                  <p className="text-xl font-bold"><span className={apportManquant > 0 ? 'text-red-400' : 'text-emerald-400'}>{(data.apport_personnel || 0).toLocaleString('fr-CH')}</span></p>
                  {apportManquant > 0 && <p className="text-[10px] text-red-400 mt-0.5">⚠ Il manque {apportManquant.toLocaleString('fr-CH')} CHF</p>}
                </GoldCard>
              </div>
              <GoldCard>
                <div className="flex items-center gap-1.5 mb-2"><Info size={13} className="text-[hsl(40_20%_45%)]" /><span className="text-xs font-medium text-[hsl(40_20%_65%)]">Exigences pour ce prix d'achat</span></div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {[
                    ['Revenu mensuel min:', `${revenuMinMensuel.toLocaleString('fr-CH')} CHF`, revenuManquant > 0],
                    ["Votre revenu total:", `${totalRevenusMensuels.toLocaleString('fr-CH')} CHF`, false],
                    ['Apport min (26%):', `${apportRequis.toLocaleString('fr-CH')} CHF`, apportManquant > 0],
                    ['Charges mensuelles:', `${chargesMensuelles.toLocaleString('fr-CH')} CHF`, false],
                  ].map(([label, val, warn]) => (
                    <div key={String(label)} className="flex justify-between gap-2">
                      <span className="text-[hsl(40_20%_45%)]">{label}</span>
                      <span className={`font-medium ${warn ? 'text-red-400' : 'text-[hsl(40_20%_70%)]'}`}>{val}</span>
                    </div>
                  ))}
                </div>
              </GoldCard>
              {revenuManquant > 0 && (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-950/15 p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="text-red-300">Il vous manque <strong>{revenuManquant.toLocaleString('fr-CH')} CHF/mois</strong> de revenus.</p>
                    {!hasCandidates && onAddCoBuyer && (
                      <button type="button" onClick={onAddCoBuyer} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-400/30 text-red-300 hover:bg-red-950/30 transition-colors">
                        <UserPlus size={12} /> Ajouter un co-acquéreur maintenant
                      </button>
                    )}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-[hsl(40_20%_35%)] mt-3 pt-3 border-t border-[hsl(38_45%_48%/0.1)]">
                💡 Calcul basé sur les normes bancaires suisses: intérêts théoriques 5% + amortissement 1% + charges 1% = 7%/an.
              </p>
            </div>
          )}
        </>
      )}

      <PremiumTextarea
        label="Souhaits particuliers (étage, quartier, vue...)"
        value={data.souhaits_particuliers}
        onChange={(e) => onChange({ souhaits_particuliers: e.target.value })}
        placeholder="Décrivez vos souhaits particuliers..."
        rows={3}
      />

      {/* Residential lifestyle questions */}
      {!isCommercial && (
        <div className="space-y-4 pt-2">
          <div className="h-px bg-gradient-to-r from-transparent via-[hsl(38_45%_48%/0.12)] to-transparent" />
          <PremiumRadioGroup label="Avez-vous des animaux ?" options={OUNI_NON} value={data.animaux ? 'oui' : 'non'} onChange={(v) => onChange({ animaux: v === 'oui' })} columns={2} />
          <PremiumRadioGroup label="Jouez-vous d'un instrument de musique ?" options={OUNI_NON} value={data.instrument_musique ? 'oui' : 'non'} onChange={(v) => onChange({ instrument_musique: v === 'oui' })} columns={2} />
          <PremiumRadioGroup label="Avez-vous un ou plusieurs véhicules ?" options={OUNI_NON} value={data.vehicules ? 'oui' : 'non'} onChange={(v) => onChange({ vehicules: v === 'oui' })} columns={2} />
          {data.vehicules && (
            <div className="pl-3 border-l-2 border-[hsl(38_45%_48%/0.3)]">
              <PremiumInput label="Numéro(s) de plaque(s)" value={data.numero_plaques} onChange={(e) => onChange({ numero_plaques: e.target.value })} placeholder="Ex: VD 123456" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
