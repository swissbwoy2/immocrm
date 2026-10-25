import { CheckCircle, XCircle, User, Shield, Users, FileText } from 'lucide-react';
import { ClientCandidate, CANDIDATE_TYPE_LABELS } from '@/hooks/useClientCandidates';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';

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
  { type: 'fiche_salaire', label: 'Fiches de salaire (3)', emoji: '💰', count: 3 },
  { type: 'extrait_poursuites', label: 'Extrait poursuites', emoji: '📋', count: 1 },
  { type: 'piece_identite', label: 'Pièce d\'identité', emoji: '🪪', count: 1 },
  { type: 'attestation_domicile', label: 'Attestation domicile', emoji: '🏠', count: 1 },
  { type: 'contrat_travail', label: 'Contrat/Attestation', emoji: '📝', count: 1 },
  { type: 'rc_menage', label: 'RC Ménage', emoji: '🛡️', count: 1 },
];

function getDocumentStatus(docs: Document[], requiredType: string, requiredCount: number) {
  const count = docs.filter(d => d.type_document === requiredType).length;
  return {
    count,
    complete: count >= requiredCount,
    missing: Math.max(0, requiredCount - count),
  };
}

function progressBarCls(isComplete: boolean, percent: number) {
  return isComplete ? 'bg-emerald-500' : percent > 50 ? 'bg-amber-500' : 'bg-destructive';
}

function PremiumPersonChecklist({ 
  name, 
  subtitle,
  icon: Icon, 
  documents, 
  personId,
}: { 
  name: string; 
  subtitle?: string;
  icon: React.ElementType; 
  documents: Document[];
  personId?: string;
}) {
  const personDocs = personId 
    ? documents.filter(d => d.candidate_id === personId)
    : documents.filter(d => !d.candidate_id);

  const statuses = REQUIRED_DOCUMENTS.map(req => ({
    ...req,
    ...getDocumentStatus(personDocs, req.type, req.count),
  }));

  const completedCount = statuses.filter(s => s.complete).length;
  const totalRequired = REQUIRED_DOCUMENTS.length;
  const progressPercent = (completedCount / totalRequired) * 100;
  const isComplete = completedCount === totalRequired;

  return (
    <div className="imr-lg-glass space-y-3 rounded-2xl p-3 sm:p-4">
      {/* En-tête personne */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
            {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
          </span>
        </div>
        {isComplete ? (
          <DashBadge tone="success">Complet</DashBadge>
        ) : (
          <DashBadge tone="muted">{completedCount}/{totalRequired}</DashBadge>
        )}
      </div>
      
      {/* Barre de progression */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${progressBarCls(isComplete, progressPercent)}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      {/* Grille de documents */}
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        {statuses.map((status) => (
          <div 
            key={status.type}
            className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2 text-xs sm:text-sm"
          >
            {status.complete ? (
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
            )}
            <span className={`truncate font-medium ${status.complete ? 'text-foreground' : 'text-muted-foreground'}`}>{status.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PremiumDossierChecklistCard({ 
  clientName, 
  candidates, 
  documents,
  className 
}: PremiumDossierChecklistCardProps) {
  // Calculer le total de documents requis et complétés
  const allPersons = [
    { id: undefined, name: clientName, isClient: true },
    ...candidates.map(c => ({ id: c.id, name: `${c.prenom} ${c.nom}`, type: c.type })),
  ];

  let totalRequired = 0;
  let totalComplete = 0;

  allPersons.forEach(person => {
    const personDocs = person.id 
      ? documents.filter(d => d.candidate_id === person.id)
      : documents.filter(d => !d.candidate_id);

    REQUIRED_DOCUMENTS.forEach(req => {
      totalRequired += req.count;
      const count = personDocs.filter(d => d.type_document === req.type).length;
      totalComplete += Math.min(count, req.count);
    });
  });

  const overallProgress = totalRequired > 0 ? (totalComplete / totalRequired) * 100 : 0;
  const isFullyComplete = totalComplete === totalRequired;

  return (
    <div className={`${DASH_CARD} p-4 md:p-5 ${className ?? ''}`}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">Checklist du dossier</h3>
            <p className="text-sm text-muted-foreground">
              {allPersons.length} personne{allPersons.length > 1 ? 's' : ''} à documenter
            </p>
          </div>
        </div>
        
        {isFullyComplete ? (
          <DashBadge tone="success">Dossier complet</DashBadge>
        ) : (
          <DashBadge tone="neutral">{Math.round(overallProgress)}% complet</DashBadge>
        )}
      </div>

      {/* Barre de progression globale */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <div 
          className={`h-full rounded-full transition-all duration-700 ${progressBarCls(isFullyComplete, overallProgress)}`}
          style={{ width: `${overallProgress}%` }}
        />
      </div>
      
      {/* Liste des personnes */}
      <div className="space-y-3">
        {/* Client principal */}
        <PremiumPersonChecklist
          name={clientName}
          icon={User}
          documents={documents}
          personId={undefined}
        />

        {/* Candidats */}
        {candidates.map((candidate) => (
          <PremiumPersonChecklist
            key={candidate.id}
            name={`${candidate.prenom} ${candidate.nom}`}
            subtitle={CANDIDATE_TYPE_LABELS[candidate.type].split(' ').slice(1).join(' ')}
            icon={candidate.type === 'garant' ? Shield : Users}
            documents={documents}
            personId={candidate.id}
          />
        ))}

        {candidates.length === 0 && (
          <p className="rounded-xl border border-dashed border-border/70 py-4 text-center text-sm text-muted-foreground">
            Aucun candidat supplémentaire (garant, colocataire...)
          </p>
        )}
      </div>
    </div>
  );
}
