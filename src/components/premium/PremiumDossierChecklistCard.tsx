import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, User, Shield, Users, FileText } from 'lucide-react';
import { ClientCandidate, CANDIDATE_TYPE_LABELS } from '@/hooks/useClientCandidates';

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

function PremiumPersonChecklist({ 
  name, 
  icon: Icon, 
  iconColor, 
  documents, 
  personId,
  index 
}: { 
  name: string; 
  icon: React.ElementType; 
  iconColor: string; 
  documents: Document[];
  personId?: string;
  index: number;
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
    <div 
      className="group relative bg-muted/30 hover:bg-muted/50 rounded-xl p-4 space-y-3 transition-all duration-300 border border-border/30 hover:border-border/50 animate-fade-in"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Header avec icône et badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="w-5 h-5 text-foreground" />
          </div>
          <span className="font-semibold text-foreground">{name}</span>
        </div>
        {isComplete ? (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            Complet
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-muted/80 text-muted-foreground border border-border/50">
            {completedCount}/{totalRequired}
          </Badge>
        )}
      </div>
      
      {/* Barre de progression premium */}
      <div className="relative">
        <Progress 
          value={progressPercent} 
          className="h-2 bg-muted/50" 
        />
        <div 
          className={`absolute inset-0 h-2 rounded-full transition-all duration-500 ${
            isComplete 
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
              : progressPercent > 50 
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-red-500 to-red-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      {/* Grille de documents */}
      <div className="grid grid-cols-2 gap-2">
        {statuses.map((status) => (
          <div 
            key={status.type}
            className={`flex items-center gap-2 text-sm p-2.5 rounded-lg transition-all duration-200 ${
              status.complete 
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
            }`}
          >
            {status.complete ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate font-medium">{status.emoji} {status.label}</span>
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
    <div className={`group relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-6 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 overflow-hidden ${className}`}>
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Checklist du dossier</h3>
            <p className="text-sm text-muted-foreground">
              {allPersons.length} personne{allPersons.length > 1 ? 's' : ''} à documenter
            </p>
          </div>
        </div>
        
        {isFullyComplete ? (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5">
            <CheckCircle className="w-4 h-4 mr-2" />
            Dossier complet
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-background/50 border-border/50 px-3 py-1.5">
            <span className="font-semibold text-foreground">{Math.round(overallProgress)}%</span>
            <span className="text-muted-foreground ml-1">complet</span>
          </Badge>
        )}
      </div>

      {/* Barre de progression globale */}
      <div className="relative mb-6">
        <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-700 ${
              isFullyComplete 
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                : overallProgress > 50 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-red-500 to-red-400'
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
      
      {/* Liste des personnes */}
      <div className="relative space-y-4">
        {/* Client principal */}
        <PremiumPersonChecklist
          name={`👤 ${clientName}`}
          icon={User}
          iconColor="bg-blue-500/15"
          documents={documents}
          personId={undefined}
          index={0}
        />

        {/* Candidats */}
        {candidates.map((candidate, idx) => (
          <PremiumPersonChecklist
            key={candidate.id}
            name={`${CANDIDATE_TYPE_LABELS[candidate.type].split(' ')[0]} ${candidate.prenom} ${candidate.nom}`}
            icon={candidate.type === 'garant' ? Shield : Users}
            iconColor={candidate.type === 'garant' ? 'bg-purple-500/15' : 'bg-green-500/15'}
            documents={documents}
            personId={candidate.id}
            index={idx + 1}
          />
        ))}

        {candidates.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-xl border border-dashed border-border/50">
            Aucun candidat supplémentaire (garant, colocataire...)
          </p>
        )}
      </div>
    </div>
  );
}
