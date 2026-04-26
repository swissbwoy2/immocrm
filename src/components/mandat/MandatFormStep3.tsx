import { MandatFormData, UTILISATIONS_LOGEMENT } from './types';
import { PremiumInput } from '@/components/forms-premium/PremiumInput';
import { PremiumSelect } from '@/components/forms-premium/PremiumSelect';
import { PremiumRadioGroup } from '@/components/forms-premium/PremiumRadioGroup';
import { LuxuryIconBadge } from '@/components/forms-premium/LuxuryIconBadge';
import { IconWallet, IconHome, IconCalendar } from '@/components/forms-premium/icons/LuxuryIcons';
import { Briefcase, Building2, AlertTriangle, Scale, CreditCard } from 'lucide-react';
import CommercialFieldsStep3 from './CommercialFieldsStep3';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

const OUNI_NON = [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }];

function LuxuryQuestionCard({ children, active, danger }: { children: React.ReactNode; active?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 ${
      danger && active
        ? 'border-red-500/40 bg-red-950/15'
        : active
        ? 'border-[hsl(38_45%_48%/0.4)] bg-[hsl(38_45%_48%/0.07)]'
        : 'border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_15%_10%/0.4)]'
    }`}>
      {children}
    </div>
  );
}

export default function MandatFormStep3({ data, onChange }: Props) {
  const isCommercial = data.type_bien === 'Local commercial';
  const isPersonnel = data.location_type === 'personnel';

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">
          {isCommercial ? 'Informations sur le locataire' : 'Situation financière et professionnelle'}
        </h2>
        <p className="text-sm text-[hsl(40_20%_55%)] mt-1">
          {isCommercial ? "Indiquez si vous louez en nom propre ou au nom d'une société." : 'Vos revenus et informations professionnelles.'}
        </p>
      </div>

      {isCommercial ? (
        <CommercialFieldsStep3 data={data} onChange={onChange} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PremiumInput label="Profession" value={data.profession} onChange={(e) => onChange({ profession: e.target.value })} icon={<Briefcase size={16} strokeWidth={1.5} className="text-[hsl(38_45%_48%)]" />} placeholder="Votre profession" required />
          <PremiumInput label="Employeur" value={data.employeur} onChange={(e) => onChange({ employeur: e.target.value })} icon={<Building2 size={16} strokeWidth={1.5} className="text-[hsl(38_45%_48%)]" />} placeholder="Nom de l'entreprise" required />

          {/* Revenus CHF */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-[hsl(40_20%_60%)]">
              <span className="text-[hsl(38_45%_48%)]"><IconWallet size={16} /></span>
              Revenu mensuel net (CHF) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={data.revenus_mensuels || ''}
                onChange={(e) => onChange({ revenus_mensuels: Number(e.target.value) })}
                placeholder="Ex: 5000"
                className="w-full bg-[hsl(30_15%_9%/0.6)] border border-[hsl(38_45%_48%/0.2)] rounded-xl px-4 py-3 pr-14 text-sm text-[hsl(40_20%_75%)] placeholder:text-[hsl(40_20%_38%)] focus:outline-none focus:border-[hsl(38_55%_65%/0.7)] focus:ring-2 focus:ring-[hsl(38_45%_48%/0.25)] transition-all duration-300"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(40_20%_45%)] text-xs font-medium pointer-events-none">CHF</span>
            </div>
          </div>

          <PremiumInput label="Date d'engagement au poste" type="date" value={data.date_engagement} onChange={(e) => onChange({ date_engagement: e.target.value })} icon={<IconCalendar size={16} />} />

          <div className="md:col-span-2">
            <PremiumSelect
              label="Utilisation du logement à titre"
              icon={<IconHome size={16} />}
              value={data.utilisation_logement}
              onValueChange={(v) => onChange({ utilisation_logement: v })}
              options={UTILISATIONS_LOGEMENT.map(u => ({ value: u, label: u }))}
              required
            />
          </div>
        </div>
      )}

      {(!isCommercial || isPersonnel) && (
        <div className="space-y-3 pt-4">
          <div className="h-px bg-gradient-to-r from-transparent via-[hsl(38_45%_48%/0.12)] to-transparent" />

          <LuxuryQuestionCard active={data.charges_extraordinaires}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard size={16} strokeWidth={1.5} className={data.charges_extraordinaires ? 'text-[hsl(38_55%_65%)]' : 'text-[hsl(40_20%_45%)]'} />
                <span className="text-sm font-medium text-[hsl(40_20%_70%)]">
                  Avez-vous des charges extraordinaires ? <span className="text-red-400">*</span>
                </span>
              </div>
              <p className="text-xs text-[hsl(40_20%_40%)]">Leasing, crédit, pension alimentaire, etc.</p>
              <PremiumRadioGroup
                options={OUNI_NON}
                value={data.charges_extraordinaires ? 'oui' : 'non'}
                onChange={(v) => onChange({ charges_extraordinaires: v === 'oui' })}
                columns={2}
              />
            </div>
            {data.charges_extraordinaires && (
              <div className="mt-4 pl-3 border-l-2 border-[hsl(38_45%_48%/0.4)]">
                <div className="space-y-1.5">
                  <label className="text-xs text-[hsl(40_20%_55%)] font-medium">Montant des charges / échéance (CHF)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={data.montant_charges_extra || ''}
                      onChange={(e) => onChange({ montant_charges_extra: Number(e.target.value) })}
                      placeholder="Ex: 500"
                      className="w-full bg-[hsl(30_15%_9%/0.6)] border border-[hsl(38_45%_48%/0.2)] rounded-xl px-4 py-3 pr-14 text-sm text-[hsl(40_20%_75%)] placeholder:text-[hsl(40_20%_38%)] focus:outline-none focus:border-[hsl(38_55%_65%/0.7)] focus:ring-2 focus:ring-[hsl(38_45%_48%/0.25)] transition-all duration-300"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(40_20%_45%)] text-xs font-medium pointer-events-none">CHF</span>
                  </div>
                </div>
              </div>
            )}
          </LuxuryQuestionCard>

          <LuxuryQuestionCard active={data.poursuites} danger>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} strokeWidth={1.5} className={data.poursuites ? 'text-red-400' : 'text-[hsl(40_20%_45%)]'} />
                <span className="text-sm font-medium text-[hsl(40_20%_70%)]">
                  Avez-vous des poursuites ou actes de défaut de biens ? <span className="text-red-400">*</span>
                </span>
              </div>
              <PremiumRadioGroup
                options={OUNI_NON}
                value={data.poursuites ? 'oui' : 'non'}
                onChange={(v) => onChange({ poursuites: v === 'oui' })}
                columns={2}
              />
            </div>
          </LuxuryQuestionCard>

          <LuxuryQuestionCard active={data.curatelle} danger>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Scale size={16} strokeWidth={1.5} className={data.curatelle ? 'text-red-400' : 'text-[hsl(40_20%_45%)]'} />
                <span className="text-sm font-medium text-[hsl(40_20%_70%)]">
                  Êtes-vous sous curatelle ? <span className="text-red-400">*</span>
                </span>
              </div>
              <PremiumRadioGroup
                options={OUNI_NON}
                value={data.curatelle ? 'oui' : 'non'}
                onChange={(v) => onChange({ curatelle: v === 'oui' })}
                columns={2}
              />
            </div>
          </LuxuryQuestionCard>
        </div>
      )}
    </div>
  );
}
