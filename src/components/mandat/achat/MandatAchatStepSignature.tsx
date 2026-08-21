import { useState } from 'react';
import { MandatFormData } from '../types';
import SignaturePad from '../SignaturePad';
import { LandingCheckbox } from '@/components/forms-premium/LandingCheckbox';
import { LandingInput } from '@/components/forms-premium/LandingInput';
import {
  FileCheck, PenLine, CheckCircle2, AlertCircle,
  User, Home, Shield, Scale, Gift, Briefcase, Mail
} from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

// Design tokens premium lisibles
const C = {
  ink: '#1B2A24',        // texte principal vert-noir doux
  inkSoft: '#3A4A42',
  forest: '#1F5132',     // vert forêt titres
  gold: '#B8893A',       // accent doré
  goldSoft: '#C9A05B',
  cardBg: '#FFFFFF',
  cardAlt: '#FBF8F1',    // blanc cassé
  border: 'rgba(184, 137, 58, 0.22)',
  borderSoft: 'rgba(31, 81, 50, 0.12)',
  rowDivider: 'rgba(31, 81, 50, 0.08)',
};

function Section({ title, icon, children, alt = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; alt?: boolean }) {
  return (
    <div
      className="rounded-xl p-5 space-y-3 shadow-sm"
      style={{ background: alt ? C.cardAlt : C.cardBg, border: `1px solid ${C.border}` }}
    >
      <div className="flex items-center gap-2.5 pb-2" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(184, 137, 58, 0.12)', color: C.gold }}
        >
          {icon}
        </div>
        <h3 className="text-base font-semibold" style={{ color: C.forest }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 py-1.5" style={{ borderBottom: `1px dashed ${C.rowDivider}` }}>
      <span className="text-[13px]" style={{ color: C.inkSoft }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: C.ink }}>{value || '—'}</span>
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

const AUTORISATIONS = [
  "Le Mandant autorise Immo-Rama à transmettre les seules données nécessaires à une démarche déterminée (financement, offre, acte) aux partenaires concernés : banques et courtiers en financement, notaires, agences, propriétaires et vendeurs.",
  "Tout contrôle de solvabilité ou contact avec l'employeur n'a lieu qu'après information préalable et accord spécifique du Mandant, dans le respect de la LPD (finalité, proportionnalité, sécurité et transparence).",
  "Le Mandant autorise Immo-Rama à le représenter dans les démarches de recherche, prise de contact, coordination et négociation liées à son projet d'achat. La prospection commerciale repose sur un consentement séparé, facultatif et révocable.",
];

const LIMITES = [
  "Immo-Rama agit avec diligence et fidélité, sans obligation de résultat.",
  "Immo-Rama ne garantit ni la disponibilité d'un bien, ni l'obtention d'un financement hypothécaire, ni l'acceptation d'une offre par un vendeur.",
  "Les décisions juridiques, techniques, fiscales et financières appartiennent au Mandant, assisté au besoin de professionnels qualifiés.",
  "Aucune exclusion ne couvre le dol, la faute grave, la violation d'une obligation essentielle imputable à Immo-Rama, ni les responsabilités légalement impératives.",
  "La décision finale d'achat et de signature de l'acte authentique reste sous la responsabilité du Mandant.",
];

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('fr-CH'); } catch { return dateStr; }
}
function formatBudget(n: number): string {
  if (!n) return '';
  return n.toLocaleString('fr-CH') + ' CHF';
}
function usageLabel(usage: string): string {
  const map: Record<string, string> = {
    residence_principale: 'Résidence principale',
    residence_secondaire: 'Résidence secondaire',
    investissement: 'Investissement locatif',
  };
  return map[usage] || usage || '';
}
function horizonLabel(mois: number): string {
  if (!mois) return '';
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
    <div className="space-y-5" style={{ color: C.ink }}>
      {/* Header premium */}
      <div
        className="rounded-xl p-5"
        style={{ background: `linear-gradient(135deg, ${C.cardAlt} 0%, #FFFFFF 100%)`, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <FileCheck size={18} style={{ color: C.gold }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.gold }}>Mandat de recherche immobilière — Achat (Vaud)</span>
        </div>
        <h2 className="text-2xl font-bold" style={{ color: C.forest }}>Vérification, lecture et signature</h2>
        <p className="text-sm mt-1.5" style={{ color: C.inkSoft }}>
          Relisez attentivement le présent mandat. Une fois signé, il sera transmis par email au format PDF et votre espace client sera activé après validation de l'acompte.
        </p>
      </div>

      {/* 1. Récapitulatif du mandant */}
      <Section title="1. Récapitulatif du mandant" icon={<User size={15} />}>
        <Row label="Nom" value={data.nom} />
        <Row label="Prénom" value={data.prenom} />
        <Row label="Email" value={data.email} />
        <Row label="Téléphone" value={data.telephone} />
        <Row label="Adresse" value={data.adresse} />
        {data.date_naissance && <Row label="Date de naissance" value={formatDate(data.date_naissance)} />}
        {data.nationalite && <Row label="Nationalité" value={data.nationalite} />}
        {data.profession && <Row label="Profession" value={<span className="inline-flex items-center gap-1"><Briefcase size={12} style={{ color: C.gold }} />{data.profession}</span>} />}
      </Section>

      {/* 2. Projet d'achat */}
      <Section title="2. Projet d'achat immobilier" icon={<Home size={15} />} alt>
        <Row label="Type de bien recherché" value={data.type_bien} />
        <Row label="Région recherchée" value={data.region_recherche} />
        <Row label="Budget cible" value={formatBudget(data.budget_max)} />
        <Row label="Nombre de pièces minimum" value={data.pieces_recherche} />
        {data.surface_souhaitee > 0 && <Row label="Surface minimum" value={`${data.surface_souhaitee} m²`} />}
        <Row label="Usage du bien" value={usageLabel(data.achat_usage || '')} />
        <Row label="Horizon de réalisation" value={horizonLabel(data.achat_horizon_mois)} />
        {data.candidats.length > 0 && (
          <div className="pt-3 mt-2" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
            <p className="text-xs font-semibold mb-2" style={{ color: C.forest }}>Co-acquéreurs ({data.candidats.length})</p>
            <div className="space-y-1">
              {data.candidats.map(c => (
                <div key={c.id} className="text-sm" style={{ color: C.ink }}>
                  • <strong>{c.prenom} {c.nom}</strong> <span style={{ color: C.inkSoft }}>— {c.lien_avec_client}</span>
                  {c.revenus_mensuels > 0 && <span style={{ color: C.inkSoft }}> · {c.revenus_mensuels.toLocaleString('fr-CH')} CHF/mois</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* 3. Conditions financières */}
      <Section title="3. Conditions financières Immo-Rama.ch" icon={<span className="text-[11px] font-bold">CHF</span>}>
        <div className="space-y-1">
          <div className="flex justify-between items-center py-2" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
            <span className="text-sm" style={{ color: C.inkSoft }}>Commission de courtage (au succès, min. CHF 500, + TVA si due)</span>
            <strong className="text-base" style={{ color: C.forest }}>1 % du prix de vente</strong>
          </div>
          <div className="flex justify-between items-center py-2" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
            <span className="text-sm" style={{ color: C.inkSoft }}>Montant d'activation (imputé sur la commission)</span>
            <strong className="text-base" style={{ color: C.gold }}>CHF 2&apos;500.–</strong>
          </div>
          <div className="flex justify-between items-center py-2" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
            <span className="text-sm" style={{ color: C.inkSoft }}>Solde à la conclusion de l'acte (commission − activation)</span>
            <strong className="text-base" style={{ color: C.ink }}>1 % du prix − activation CHF 2&apos;500.–</strong>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm" style={{ color: C.inkSoft }}>Durée du mandat</span>
            <strong className="text-base" style={{ color: C.ink }}>6 mois, reconduction tacite 6 mois</strong>
          </div>
        </div>
      </Section>

      {/* 4. Mission */}
      <Section title="4. Mission confiée à Immo-Rama.ch" icon={<FileCheck size={15} />} alt>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
          {PERIMETRE_MISSION.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
              <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" style={{ color: C.forest }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* 5. Autorisations */}
      <Section title="5. Autorisations et consentements" icon={<Shield size={15} />}>
        <ul className="space-y-2.5">
          {AUTORISATIONS.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: C.ink }}>
              <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" style={{ color: C.forest }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* 6. Limites */}
      <Section title="6. Limites de responsabilité" icon={<Scale size={15} />} alt>
        <ul className="space-y-2">
          {LIMITES.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: C.ink }}>
              <span className="font-bold mt-0.5" style={{ color: C.gold }}>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Code promo */}
      <div className="rounded-xl p-4" style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 mb-2">
          <Gift size={15} style={{ color: C.gold }} />
          <span className="text-sm font-medium" style={{ color: C.forest }}>Code promo (optionnel)</span>
        </div>
        <LandingInput
          label=""
          value={data.code_promo}
          onChange={(e) => onChange({ code_promo: e.target.value })}
          placeholder="Entrez votre code promo si vous en avez un"
        />
      </div>

      {/* 7. Signature */}
      <div
        className="rounded-xl p-5 transition-all"
        style={{
          background: C.cardBg,
          border: `2px solid ${hasSignature ? C.forest : C.border}`,
          boxShadow: hasSignature ? '0 4px 20px rgba(31, 81, 50, 0.12)' : 'none',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PenLine size={16} style={{ color: hasSignature ? C.forest : C.gold }} />
            <h3 className="text-base font-semibold" style={{ color: C.forest }}>
              7. Signature électronique <span style={{ color: '#C0392B' }}>*</span>
            </h3>
          </div>
          {hasSignature && (
            <span className="text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-full" style={{ color: C.forest, background: 'rgba(31, 81, 50, 0.08)' }}>
              <CheckCircle2 size={12} /> Signé
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 rounded-lg" style={{ background: C.cardAlt }}>
          <div>
            <div className="text-[11px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: C.gold }}>Nom du signataire</div>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>{data.prenom} {data.nom}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: C.gold }}>Date et heure</div>
            <div className="text-sm font-semibold" style={{ color: C.ink }}>{signatureTimestamp}</div>
          </div>
        </div>

        <p className="text-sm mb-2 leading-relaxed" style={{ color: C.inkSoft }}>
          En signant, je confirme avoir lu et accepté le présent mandat de recherche immobilière (achat), ses honoraires (commission de 1 % du prix de vente, min. CHF 500, + TVA si due), son périmètre de mission, ses autorisations et ses limites de responsabilité.
        </p>
        <SignaturePad value={data.signature_data} onChange={(value) => onChange({ signature_data: value })} />
        <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>
          L'adresse IP et l'horodatage exact sont enregistrés côté serveur lors de la soumission.
        </p>
      </div>

      {/* Acceptation */}
      <div className="rounded-xl p-4" style={{ background: C.cardAlt, border: `1px solid ${C.border}` }}>
        <LandingCheckbox
          checked={data.cgv_acceptees}
          onCheckedChange={(checked) => onChange({ cgv_acceptees: checked })}
          required
          label="Je déclare avoir lu et accepté l'intégralité du présent mandat de recherche immobilière (achat) : la commission de 1 % du prix de vente (min. CHF 500, + TVA si due), le montant d'activation de CHF 2’500 imputé sur la commission, le périmètre de mission, les autorisations de transmission de données et les limites de responsabilité. Je comprends que le mandat est conclu pour une période initiale de 6 mois reconductible tacitement par périodes de 6 mois, et que chaque partie peut y mettre fin en tout temps conformément à l'art. 404 CO, aux conséquences financières prévues."
        />
      </div>

      {!isComplete && (
        <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: '#FDECEA', border: '1px solid #E5A29A' }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#A93226' }} />
          <p className="text-sm" style={{ color: '#7B241C' }}>
            {!hasSignature && !hasCGVAccepted && 'Veuillez signer le mandat et accepter les conditions pour continuer.'}
            {!hasSignature && hasCGVAccepted && 'Veuillez signer le mandat pour continuer.'}
            {hasSignature && !hasCGVAccepted && 'Veuillez accepter les conditions du mandat pour continuer.'}
          </p>
        </div>
      )}

      {isComplete && (
        <div className="rounded-xl p-4 flex items-start gap-2.5" style={{ background: 'rgba(31, 81, 50, 0.06)', border: `1px solid ${C.forest}` }}>
          <Mail size={18} className="flex-shrink-0 mt-0.5" style={{ color: C.forest }} />
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: C.forest }}>Mandat prêt à être envoyé</p>
            <p className="text-sm" style={{ color: C.ink }}>
              Après validation, votre mandat signé sera transmis par email au format PDF et votre espace client sera créé.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
