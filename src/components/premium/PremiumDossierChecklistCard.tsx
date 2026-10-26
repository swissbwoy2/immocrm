import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, User, Shield, Users, FileText, Plus } from 'lucide-react';
import { ClientCandidate, CANDIDATE_TYPE_LABELS } from '@/hooks/useClientCandidates';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  type_document?: string;
  candidate_id?: string;
  client_id?: string;
}

interface PremiumDossierChecklistCardProps {
  clientName: string;
  candidates: ClientCandidate[];
  documents: Document[];
  className?: string;
}

const REQUIRED_DOCUMENTS = [
  { type: 'fiche_salaire', label: 'Fiches de salaire', hint: '3 derniers mois', count: 3 },
  { type: 'extrait_poursuites', label: 'Extrait des poursuites', hint: 'moins de 3 mois', count: 1 },
  { type: 'piece_identite', label: "Pièce d'identité", hint: 'ou permis de séjour', count: 1 },
  { type: 'attestation_domicile', label: 'Attestation de domicile', hint: '', count: 1 },
  { type: 'contrat_travail', label: 'Contrat ou attestation de travail', hint: '', count: 1 },
  { type: 'rc_menage', label: 'Assurance RC ménage', hint: '', count: 1 },
];

type Status = (typeof REQUIRED_DOCUMENTS)[number] & { have: number; complete: boolean };

function statusesFor(documents: Document[], personId?: string): Status[] {
  const personDocs = personId ? documents.filter((d) => d.candidate_id === personId) : documents.filter((d) => !d.candidate_id);
  return REQUIRED_DOCUMENTS.map((req) => {
    const have = Math.min(personDocs.filter((d) => d.type_document === req.type).length, req.count);
    return { ...req, have, complete: have >= req.count };
  });
}

/** Anneau de progression (style Apple Santé). */
function ProgressRing({ value, size = 52 }: { value: number; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const done = value >= 100;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-black/[0.07] dark:stroke-white/10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, 100) / 100)}
          className={cn('transition-[stroke-dashoffset] duration-700', done ? 'stroke-emerald-500' : 'stroke-primary')}
        />
      </svg>
      <span className="absolute text-[13px] font-semibold tabular-nums text-foreground">
        {done ? <Check className="h-5 w-5 text-emerald-600" strokeWidth={3} /> : `${Math.round(value)}%`}
      </span>
    </span>
  );
}

function PersonChecklist({ name, subtitle, icon: Icon, statuses, defaultOpen }: {
  name: string; subtitle?: string; icon: React.ElementType; statuses: Status[]; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const done = statuses.filter((s) => s.complete).length;
  const complete = done === statuses.length;
  // Les pièces manquantes d'abord.
  const ordered = [...statuses].sort((a, b) => Number(a.complete) - Number(b.complete));

  return (
    <div className="imr-lg-glass overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-foreground">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {subtitle ? `${subtitle} · ` : ''}{complete ? 'Toutes les pièces fournies' : `${statuses.length - done} pièce${statuses.length - done > 1 ? 's' : ''} manquante${statuses.length - done > 1 ? 's' : ''}`}
          </span>
        </span>
        {complete ? <DashBadge tone="success">Complet</DashBadge> : <DashBadge tone="muted">{done}/{statuses.length}</DashBadge>}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul className="divide-y divide-black/[0.06] border-t border-black/[0.06] dark:divide-white/10 dark:border-white/10">
          {ordered.map((s) => (
            <li key={s.type} className="flex min-h-12 items-center gap-3 px-3 py-2 sm:px-4">
              <span className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                s.complete ? 'bg-emerald-500 text-white' : 'border-2 border-dashed border-muted-foreground/40',
              )}>
                {s.complete && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm', s.complete ? 'text-muted-foreground' : 'font-medium text-foreground')}>{s.label}</span>
                {!s.complete && s.hint && <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>}
              </span>
              {s.count > 1 && (
                <span className={cn('shrink-0 text-xs font-semibold tabular-nums', s.complete ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
                  {s.have}/{s.count}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PremiumDossierChecklistCard({ clientName, candidates, documents, className }: PremiumDossierChecklistCardProps) {
  const persons = [
    { key: 'client', name: clientName, subtitle: undefined as string | undefined, icon: User, statuses: statusesFor(documents) },
    ...candidates.map((c) => ({
      key: c.id,
      name: `${c.prenom} ${c.nom}`,
      subtitle: CANDIDATE_TYPE_LABELS[c.type]?.split(' ').slice(1).join(' '),
      icon: c.type === 'garant' ? Shield : Users,
      statuses: statusesFor(documents, c.id),
    })),
  ];

  const totalRequired = persons.reduce((n, p) => n + p.statuses.reduce((m, s) => m + s.count, 0), 0);
  const totalHave = persons.reduce((n, p) => n + p.statuses.reduce((m, s) => m + s.have, 0), 0);
  const missingItems = persons.reduce((n, p) => n + p.statuses.filter((s) => !s.complete).length, 0);
  const progress = totalRequired > 0 ? (totalHave / totalRequired) * 100 : 0;
  const complete = missingItems === 0;

  return (
    <div className={cn(DASH_CARD, 'p-4 md:p-5', className)}>
      {/* En-tête : anneau de progression + verdict */}
      <div className="flex items-center gap-3.5">
        <ProgressRing value={progress} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-[17px] font-semibold leading-tight text-foreground">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            Checklist du dossier
          </h3>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {complete
              ? 'Votre dossier est complet : vos candidatures partent sans attendre.'
              : `${missingItems} pièce${missingItems > 1 ? 's' : ''} à fournir pour ${persons.length > 1 ? `${persons.length} personnes` : 'un dossier complet'}.`}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {persons.map((p, i) => (
          <PersonChecklist
            key={p.key}
            name={p.name}
            subtitle={p.subtitle}
            icon={p.icon}
            statuses={p.statuses}
            defaultOpen={i === 0 || p.statuses.some((s) => !s.complete) && persons.length <= 2}
          />
        ))}

        {candidates.length === 0 && (
          <p className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-center text-sm text-muted-foreground dark:border-white/15">
            Aucun garant ni colocataire pour l'instant.
          </p>
        )}
      </div>

      {!complete && (
        <Link
          to="/client/documents"
          className="imr-lg-tint mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold active:scale-[0.98] sm:w-auto sm:px-6"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Ajouter mes documents
        </Link>
      )}
    </div>
  );
}
