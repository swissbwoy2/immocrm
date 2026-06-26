import { useState } from 'react';
import { MandatFormData } from '../types';
import SignaturePad from '../SignaturePad';
import { LandingCheckbox } from '@/components/forms-premium/LandingCheckbox';
import { LandingInput } from '@/components/forms-premium/LandingInput';
import {
  FileCheck, PenLine, CheckCircle2, Sparkles, AlertCircle,
  User, Home, Shield, Scale, Gift
} from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_12%_10%/0.5)] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-[hsl(38_45%_48%/0.15)] flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-[hsl(40_20%_75%)]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const PERIMETRE_MISSION = [
  "Analyse du projet d'achat",
  'Analyse de la capacité financière',
  'Collecte et vérification des documents',
  'Transmission aux partenaires financiers',
  'Recherche de biens correspondant aux critères',
  'Sélection et analyse des biens',
  'Organisation et coordination des visites',
  'Contre-visite avec le client',
  'Analyse détaillée du bien sélectionné',
  'Négociation avec les vendeurs',
  'Coordination bancaire et hypothécaire',
  'Coordination avec le notaire',
  "Suivi jusqu'à la remise des clés",
];

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-CH');
  } catch {
    return dateStr;
  }
}

function formatBudget(n: number): string {
  if (!n) return '—';
  return n.toLocaleString('fr-CH') + ' CHF';
}

function usageLabel(usage: string): string {
  const map: Record<string, string> = {
    residence_principale: 'Résidence principale',
    residence_secondaire: 'Résidence secondaire',
    investissement: 'Investissement locatif',
  };
  return map[usage] || usage || '—';
}

function horizonLabel(mois: number): string {
  if (!mois) return '—';
  if (mois <= 3) return '0-3 mois';
  if (mois <= 6) return '3-6 mois';
  return '6-12 mois';
}

export default function MandatAchatStepSignature({ data, onChange }: Props) {
  const hasSignature = !!data.signature_data;
  const hasCGVAccepted = data.cgv_acceptees;
  const isComplete = hasSignature && hasCGVAccepted;
  const [signatureTimestamp] = useState(() => new Date().toLocaleString('fr-CH'));

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white">Mandat d'accompagnement à l'achat</h2>
        <p className="text-sm text-[hsl(40_20%_55%)] mt-1">Vérifiez vos informations, lisez les conditions et signez votre mandat.</p>
      </div>

      {/* 1. Récapitulatif client */}
      <Section title="1. Récapitulatif client" icon={<User size={14} className="text-[hsl(38_55%_65%)]" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[hsl(40_20%_65%)]">
          <div><span className="text-[hsl(40_20%_45%)]">Nom :</span> <strong className="text-[hsl(40_20%_82%)]">{data.prenom} {data.nom}</strong></div>
          <div><span className="text-[hsl(40_20%_45%)]">Email :</span> <strong className="text-[hsl(40_20%_82%)]">{data.email || '—'}</strong></div>
          <div><span className="text-[hsl(40_20%_45%)]">Téléphone :</span> <strong className="text-[hsl(40_20%_82%)]">{data.telephone || '—'}</strong></div>
          <div><span className="text-[hsl(40_20%_45%)]">Adresse :</span> <strong className="text-[hsl(40_20%_82%)]">{data.adresse || '—'}</strong></div>
          {data.date_naissance && (
            <div><span className="text-[hsl(40_20%_45%)]">Date de naissance :</span> <strong className="text-[hsl(40_20%_82%)]">{formatDate(data.date_naissance)}</strong></div>
          )}
          {data.nationalite && (
            <div><span className="text-[hsl(40_20%_45%)]">Nationalité :</span> <strong className="text-[hsl(40_20%_82%)]">{data.nationalite}</strong></div>
          )}
        </div>
      </Section>

      {/* 2. Récapitulatif projet */}
      <Section title="2. Récapitulatif projet d'achat" icon={<Home size={14} className="text-[hsl(38_55%_65%)]" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[hsl(40_20%_65%)]">
          <div><span className="text-[hsl(40_20%_45%)]">Type de bien :</span> <strong className="text-[hsl(40_20%_82%)]">{data.type_bien || '—'}</strong></div>
          <div><span className="text-[hsl(40_20%_45%)]">Région :</span> <strong className="text-[hsl(40_20%_82%)]">{data.region_recherche || '—'}</strong></div>
          <div><span className="text-[hsl(40_20%_45%)]">Budget cible :</span> <strong className="text-[hsl(40_20%_82%)]">{formatBudget(data.budget_max)}</strong></div>
          <div><span className="text-[hsl(40_20%_45%)]">Pièces min. :</span> <strong className="text-[hsl(40_20%_82%)]">{data.pieces_recherche || '—'}</strong></div>
          {data.surface_souhaitee > 0 && (
            <div><span className="text-[hsl(40_20%_45%)]">Surface min. :</span> <strong className="text-[hsl(40_20%_82%)]">{data.surface_souhaitee} m²</strong></div>
          )}
          <div><span className="text-[hsl(40_20%_45%)]">Usage :</span> <strong className="text-[hsl(40_20%_82%)]">{usageLabel(data.achat_usage || '')}</strong></div>
          <div><span className="text-[hsl(40_20%_45%)]">Horizon :</span> <strong className="text-[hsl(40_20%_82%)]">{horizonLabel(data.achat_horizon_mois)}</strong></div>
        </div>
        {data.candidats.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[hsl(38_45%_48%/0.15)]">
            <p className="text-xs text-[hsl(40_20%_50%)] mb-1.5">Co-acquéreurs :</p>
            <div className="space-y-1">
              {data.candidats.map(c => (
                <div key={c.id} className="text-xs text-[hsl(40_20%_65%)]">
                  • {c.prenom} {c.nom} ({c.lien_avec_client}){c.revenus_mensuels > 0 ? ` — ${c.revenus_mensuels.toLocaleString('fr-CH')} CHF/mois` : ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* 3. Conditions financières */}
      <Section title="3. Conditions financières Immo-Rama.ch" icon={<span className="text-[hsl(38_55%_65%)] text-xs font-bold">CHF</span>}>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-[hsl(38_45%_48%/0.1)]">
            <span className="text-sm text-[hsl(40_20%_60%)]">Prix total du mandat d'accompagnement</span>
            <strong className="text-[hsl(38_55%_65%)]">CHF 4&apos;999.–</strong>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[hsl(38_45%_48%/0.1)]">
            <span className="text-sm text-[hsl(40_20%_60%)]">Acompte à l'activation du dossier</span>
            <strong className="text-[hsl(38_55%_65%)]">CHF 2&apos;499.–</strong>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[hsl(38_45%_48%/0.1)]">
            <span className="text-sm text-[hsl(40_20%_60%)]">Solde de succès (à la remise des clés)</span>
            <strong className="text-[hsl(38_55%_65%)]">CHF 2&apos;500.–</strong>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[hsl(38_45%_48%/0.1)]">
            <span className="text-sm text-[hsl(40_20%_60%)]">Durée contractuelle du mandat</span>
            <strong className="text-[hsl(40_20%_75%)]">6 mois</strong>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-[hsl(40_20%_60%)]">Suivi opérationnel intensif après activation</span>
            <strong className="text-[hsl(40_20%_75%)]">60 jours</strong>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300">
          <strong>Important :</strong> Le suivi opérationnel de 60 jours débute après l'activation de votre dossier par votre conseiller. Cette période ne remplace pas la durée contractuelle de 6 mois du mandat.
        </div>
      </Section>

      {/* 4. Périmètre de mission */}
      <Section title="4. Périmètre de mission" icon={<FileCheck size={14} className="text-[hsl(38_55%_65%)]" />}>
        <ul className="space-y-1.5">
          {PERIMETRE_MISSION.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[hsl(40_20%_65%)]">
              <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </Section>

      {/* 5. Autorisations */}
      <Section title="5. Autorisations et consentements" icon={<Shield size={14} className="text-[hsl(38_55%_65%)]" />}>
        <ul className="space-y-2 text-sm text-[hsl(40_20%_65%)]">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            Autorisation de transmettre mes données personnelles et financières aux partenaires bancaires et courtiers en financement d'Immo-Rama.ch.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            Consentement au traitement de mes données financières aux fins d'analyse de capacité d'achat et de recherche de financement.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            Autorisation de contacter en mon nom les banques, courtiers, propriétaires, agences, notaires et partenaires nécessaires à la réalisation du projet d'achat.
          </li>
        </ul>
      </Section>

      {/* 6. Limites de responsabilité */}
      <Section title="6. Limites de responsabilité" icon={<Scale size={14} className="text-[hsl(38_55%_65%)]" />}>
        <div className="space-y-2 text-sm text-[hsl(40_20%_60%)]">
          <p>Immo-Rama.ch agit en tant qu'accompagnateur et conseiller dans le cadre de ce mandat. En signant ce document, le client reconnaît que :</p>
          <ul className="space-y-1.5 mt-2">
            <li className="flex items-start gap-2">
              <span className="text-[hsl(38_55%_65%)] font-bold mt-0.5">•</span>
              Immo-Rama.ch ne garantit pas l'obtention d'un financement hypothécaire.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[hsl(38_55%_65%)] font-bold mt-0.5">•</span>
              Immo-Rama.ch ne garantit pas l'acceptation d'une offre d'achat par un tiers vendeur.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[hsl(38_55%_65%)] font-bold mt-0.5">•</span>
              La décision finale d'achat et de signature de l'acte authentique reste entièrement la responsabilité du client.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[hsl(38_55%_65%)] font-bold mt-0.5">•</span>
              Immo-Rama.ch ne peut être tenu responsable des fluctuations du marché immobilier ou des décisions de tiers.
            </li>
          </ul>
        </div>
      </Section>

      {/* Code promo */}
      <div className="rounded-xl border border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_12%_10%/0.5)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift size={15} className="text-[hsl(38_55%_65%)]" />
          <span className="text-sm font-medium text-[hsl(40_20%_70%)]">Code promo (optionnel)</span>
        </div>
        <LandingInput
          label=""
          value={data.code_promo}
          onChange={(e) => onChange({ code_promo: e.target.value })}
          placeholder="Entrez votre code promo si vous en avez un"
        />
      </div>

      {/* 7. Signature électronique */}
      <div className={`rounded-xl border p-4 transition-all duration-500 ${
        hasSignature
          ? 'border-emerald-500/25 bg-emerald-950/10 shadow-[0_0_20px_hsl(142_60%_40%/0.08)]'
          : 'border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_12%_10%/0.5)]'
      }`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PenLine size={15} className={hasSignature ? 'text-emerald-400' : 'text-[hsl(38_55%_65%)]'} />
              <span className="text-sm font-semibold text-[hsl(40_20%_75%)]">
                7. Signature électronique <span className="text-red-400">*</span>
              </span>
            </div>
            {hasSignature && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={13} /> Signé
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[hsl(40_20%_45%)] text-xs">Nom du signataire :</span>
              <p className="text-[hsl(40_20%_82%)] font-medium">{data.prenom} {data.nom}</p>
            </div>
            <div>
              <span className="text-[hsl(40_20%_45%)] text-xs">Date et heure :</span>
              <p className="text-[hsl(40_20%_82%)] font-medium">{signatureTimestamp}</p>
            </div>
          </div>

          <p className="text-xs text-[hsl(40_20%_45%)]">Dessinez votre signature dans le cadre ci-dessous. Utilisez votre souris, votre doigt ou un stylet.</p>
          <SignaturePad value={data.signature_data} onChange={(value) => onChange({ signature_data: value })} />
          <p className="text-[10px] text-[hsl(40_20%_35%)]">L'adresse IP et l'horodatage exact sont enregistrés côté serveur lors de la soumission.</p>
        </div>
      </div>

      {/* Acceptation mandat */}
      <LandingCheckbox
        checked={data.cgv_acceptees}
        onCheckedChange={(checked) => onChange({ cgv_acceptees: checked })}
        required
        label="En cochant cette case, je déclare avoir lu et accepté l'intégralité du présent mandat d'accompagnement à l'achat immobilier, ainsi que les conditions financières, le périmètre de mission, les autorisations de transmission de données et les limites de responsabilité d'Immo-Rama.ch. Je comprends que ce mandat est conclu pour une durée de 6 mois à compter de son activation par un conseiller Immo-Rama.ch."
      />

      {!isComplete && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/15 p-3 flex items-start gap-2">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">
            {!hasSignature && !hasCGVAccepted && 'Veuillez signer le mandat et accepter les conditions pour continuer.'}
            {!hasSignature && hasCGVAccepted && 'Veuillez signer le mandat pour continuer.'}
            {hasSignature && !hasCGVAccepted && 'Veuillez accepter les conditions du mandat pour continuer.'}
          </p>
        </div>
      )}

      {isComplete && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/10 p-3 flex items-start gap-2">
          <Sparkles size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-300">
            Mandat signé. Après validation, votre mandat signé vous sera envoyé par email au format PDF et votre espace client sera créé.
          </p>
        </div>
      )}
    </div>
  );
}
