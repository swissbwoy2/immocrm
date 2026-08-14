import { useMemo } from 'react';
import { MandatFormData } from '../types';
import { LandingInput } from '@/components/forms-premium/LandingInput';
import { computeFinancing, DEFAULT_FINANCING_SETTINGS, formatCHF } from '@/lib/purchaseFinancing';
import { Wallet, Banknote, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatAchatStepFinancing({ data, onChange }: Props) {
  const revenuAnnuel = useMemo(() => {
    if (data.achat_revenu_annuel_retenu > 0) return data.achat_revenu_annuel_retenu;
    return (data.revenus_mensuels || 0) * 12;
  }, [data.achat_revenu_annuel_retenu, data.revenus_mensuels]);

  const computed = useMemo(
    () =>
      computeFinancing(
        {
          revenu_annuel_retenu: revenuAnnuel,
          bonus_3ans_moyenne: data.achat_bonus_3ans,
          autres_revenus: data.achat_autres_revenus,
          fonds_propres_cash: data.apport_personnel,
          fonds_propres_3a: data.achat_fonds_propres_3a,
          fonds_propres_lpp: data.achat_fonds_propres_lpp,
          montant_epl_disponible: data.achat_montant_epl,
          credit_prive_mensuel: data.achat_credit_mensuel,
          leasing_mensuel: data.achat_leasing_mensuel,
          cartes_credit_mensuel: data.achat_cartes_credit_mensuel,
          pensions_versees: data.achat_pensions_versees,
          prix_cible: data.budget_max,
        },
        DEFAULT_FINANCING_SETTINGS,
      ),
    [data, revenuAnnuel],
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-primary">
        <Wallet className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Financement &amp; tenue des charges</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LandingInput
          label="Revenu mensuel du ménage (CHF)"
          type="number"
          icon={<TrendingUp className="h-4 w-4" />}
          value={data.revenus_mensuels || ''}
          onChange={(e) => {
            const mensuel = Number(e.target.value) || 0;
            onChange({ revenus_mensuels: mensuel, achat_revenu_annuel_retenu: mensuel * 12 });
          }}
          placeholder="ex. 9000"
          required
        />
        <LandingInput
          label="Revenu annuel retenu (CHF) — référence bancaire"
          type="number"
          icon={<TrendingUp className="h-4 w-4" />}
          value={data.achat_revenu_annuel_retenu || ''}
          onChange={(e) => {
            const annuel = Number(e.target.value) || 0;
            onChange({ achat_revenu_annuel_retenu: annuel, revenus_mensuels: Math.round(annuel / 12) });
          }}
          placeholder="ex. 108 000"
        />
        <LandingInput
          label="Bonus / 13e (moyenne 3 ans, CHF/an)"
          type="number"
          value={data.achat_bonus_3ans || ''}
          onChange={(e) => onChange({ achat_bonus_3ans: Number(e.target.value) || 0 })}
          placeholder="0"
        />
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Les deux champs sont synchronisés automatiquement (annuel = mensuel × 12).
      </p>


      <div className="border-t pt-4">
        <p className="font-medium text-sm mb-3 flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /> Fonds propres disponibles</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LandingInput
            label="Cash / épargne (CHF)"
            type="number"
            value={data.apport_personnel || ''}
            onChange={(e) => onChange({ apport_personnel: Number(e.target.value) || 0 })}
            placeholder="ex. 50000"
            required
          />
          <LandingInput
            label="3e pilier A (CHF)"
            type="number"
            value={data.achat_fonds_propres_3a || ''}
            onChange={(e) => onChange({ achat_fonds_propres_3a: Number(e.target.value) || 0 })}
            placeholder="0"
          />
          <LandingInput
            label="Avoirs LPP (2e pilier, CHF)"
            type="number"
            value={data.achat_fonds_propres_lpp || ''}
            onChange={(e) => onChange({ achat_fonds_propres_lpp: Number(e.target.value) || 0 })}
            placeholder="0"
          />
          <LandingInput
            label="EPL disponible (CHF)"
            type="number"
            value={data.achat_montant_epl || ''}
            onChange={(e) => onChange({ achat_montant_epl: Number(e.target.value) || 0 })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="font-medium text-sm mb-3">Engagements mensuels (crédits / leasing)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <LandingInput
            label="Crédit privé (CHF/mois)"
            type="number"
            value={data.achat_credit_mensuel || ''}
            onChange={(e) => onChange({ achat_credit_mensuel: Number(e.target.value) || 0 })}
          />
          <LandingInput
            label="Leasing (CHF/mois)"
            type="number"
            value={data.achat_leasing_mensuel || ''}
            onChange={(e) => onChange({ achat_leasing_mensuel: Number(e.target.value) || 0 })}
          />
          <LandingInput
            label="Cartes crédit (CHF/mois)"
            type="number"
            value={data.achat_cartes_credit_mensuel || ''}
            onChange={(e) => onChange({ achat_cartes_credit_mensuel: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      {/* Résultat tenue des charges */}
      {(data.budget_max > 0 || data.revenus_mensuels > 0) && (
        <div className={`rounded-xl border-2 p-4 ${computed.conforme ? 'border-emerald-400/50 bg-emerald-500/5' : 'border-amber-400/50 bg-amber-500/5'}`}>
          <div className="flex items-center gap-2 mb-3">
            {computed.conforme ? (
              <><CheckCircle2 className="h-5 w-5 text-emerald-500" /><strong className="text-emerald-700 dark:text-emerald-400">Projet finançable selon nos critères</strong></>
            ) : (
              <><AlertTriangle className="h-5 w-5 text-amber-500" /><strong className="text-amber-700 dark:text-amber-400">À optimiser</strong></>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>Prix cible : <strong>{formatCHF(computed.prixCible)}</strong></div>
            <div>Capacité d'achat max : <strong>{formatCHF(computed.capaciteAchatMax)}</strong></div>
            <div>Hypothèque estimée : <strong>{formatCHF(computed.montantHypothecaire)}</strong></div>
            <div>Charges théoriques : <strong>{formatCHF(computed.chargesMensuelles)}/mois</strong></div>
            <div>Taux d'effort : <strong>{computed.tauxEffort.toFixed(1)} %</strong> (max {DEFAULT_FINANCING_SETTINGS.taux_effort_max} %)</div>
            <div>Fonds propres requis : <strong>{formatCHF(computed.fondsPropresRequis)}</strong></div>
          </div>
          {computed.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-amber-700 dark:text-amber-300">
              {computed.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Estimation indicative basée sur les normes FINMA (taux théorique 5 %, entretien 1 %, amortissement 1 %, taux d'effort max 33 %, fonds propres min 20 %). La validation bancaire sera demandée à votre partenaire après activation.
          </p>
        </div>
      )}
    </div>
  );
}
