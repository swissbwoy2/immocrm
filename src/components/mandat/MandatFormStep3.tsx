import { MandatFormData, UTILISATIONS_LOGEMENT } from './types';
import { LandingInput } from '@/components/forms-premium/LandingInput';
import { LandingSelect } from '@/components/forms-premium/LandingSelect';
import { LandingRadioGroup } from '@/components/forms-premium/LandingRadioGroup';
import { LuxuryIconBadge } from '@/components/forms-premium/LuxuryIconBadge';
import { IconWallet, IconHome, IconCalendar } from '@/components/forms-premium/icons/LuxuryIcons';
import { Briefcase, Building2, AlertTriangle, Scale, CreditCard, TrendingUp, Home, Users } from 'lucide-react';
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
        ? 'border-border bg-primary/10'
        : 'border-border bg-muted/40'
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
        <h2 className="text-2xl font-bold text-foreground">
          {isCommercial ? 'Informations sur le locataire' : 'Situation financière et professionnelle'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isCommercial ? "Indiquez si vous louez en nom propre ou au nom d'une société." : 'Vos revenus et informations professionnelles.'}
        </p>
      </div>

      {isCommercial ? (
        <CommercialFieldsStep3 data={data} onChange={onChange} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LandingInput label="Profession" value={data.profession} onChange={(e) => onChange({ profession: e.target.value })} icon={<Briefcase size={16} strokeWidth={1.5} className="text-primary" />} placeholder="Votre profession" required />
          <LandingInput label="Employeur" value={data.employeur} onChange={(e) => onChange({ employeur: e.target.value })} icon={<Building2 size={16} strokeWidth={1.5} className="text-primary" />} placeholder="Nom de l'entreprise" required />

          {/* Revenus CHF */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="text-primary"><IconWallet size={16} /></span>
              Revenu mensuel net (CHF) <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={data.revenus_mensuels || ''}
                onChange={(e) => onChange({ revenus_mensuels: Number(e.target.value) })}
                placeholder="Ex: 5000"
                className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium pointer-events-none">CHF</span>
            </div>
          </div>

          {/* Budget locatif indicatif (règle suisse du tiers) */}
          {data.revenus_mensuels >= 1000 && (
            <div className="md:col-span-2 rounded-2xl border border-border bg-gradient-to-br from-primary to-primary p-5 space-y-4 transition-all duration-500 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp size={16} strokeWidth={2} />
                <span className="text-sm font-semibold uppercase tracking-wide">Budget locatif indicatif</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary tabular-nums">
                  {Math.floor(data.revenus_mensuels / 3).toLocaleString('fr-CH').replace(/\u202F|\u00A0/g, "'")}
                </span>
                <span className="text-sm text-muted-foreground">CHF / mois</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-foreground">
                <Home size={14} strokeWidth={1.5} className="text-primary" />
                <span>Nombre de pièces conseillé :</span>
                <span className="font-semibold text-primary">
                  {Math.max(1, Math.round((Math.floor(data.revenus_mensuels / 3) / 600) * 2) / 2)} pièces
                </span>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                <Users size={14} strokeWidth={1.5} className="text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vous avez un garant, un co-locataire ou d'autres revenus ? Ces éléments peuvent aussi être pris en compte pour augmenter votre budget.
                </p>
              </div>
            </div>
          )}

          <LandingInput label="Date d'engagement au poste" type="date" value={data.date_engagement} onChange={(e) => onChange({ date_engagement: e.target.value })} icon={<IconCalendar size={16} />} />

          <div className="md:col-span-2">
            <LandingSelect
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
          <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

          <LuxuryQuestionCard active={data.charges_extraordinaires}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard size={16} strokeWidth={1.5} className={data.charges_extraordinaires ? 'text-primary' : 'text-muted-foreground'} />
                <span className="text-sm font-medium text-foreground">
                  Avez-vous des charges extraordinaires ? <span className="text-destructive">*</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Leasing, crédit, pension alimentaire, etc.</p>
              <LandingRadioGroup
                options={OUNI_NON}
                value={data.charges_extraordinaires ? 'oui' : 'non'}
                onChange={(v) => onChange({ charges_extraordinaires: v === 'oui' })}
                columns={2}
              />
            </div>
            {data.charges_extraordinaires && (
              <div className="mt-4 pl-3 border-l-2 border-border">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Montant des charges / échéance (CHF)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={data.montant_charges_extra || ''}
                      onChange={(e) => onChange({ montant_charges_extra: Number(e.target.value) })}
                      placeholder="Ex: 500"
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium pointer-events-none">CHF</span>
                  </div>
                </div>
              </div>
            )}
          </LuxuryQuestionCard>

          <LuxuryQuestionCard active={data.poursuites} danger>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} strokeWidth={1.5} className={data.poursuites ? 'text-destructive' : 'text-muted-foreground'} />
                <span className="text-sm font-medium text-foreground">
                  Avez-vous des poursuites ou actes de défaut de biens ? <span className="text-destructive">*</span>
                </span>
              </div>
              <LandingRadioGroup
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
                <Scale size={16} strokeWidth={1.5} className={data.curatelle ? 'text-destructive' : 'text-muted-foreground'} />
                <span className="text-sm font-medium text-foreground">
                  Êtes-vous sous curatelle ? <span className="text-destructive">*</span>
                </span>
              </div>
              <LandingRadioGroup
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
