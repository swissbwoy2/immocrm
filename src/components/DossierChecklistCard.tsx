import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface DossierChecklistCardProps {
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

function PersonChecklist({ 
  name, 
  icon: Icon, 
  iconColor, 
  documents, 
  personId 
}: { 
  name: string; 
  icon: any; 
  iconColor: string; 
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
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="font-medium text-sm">{name}</span>
        </div>
        {isComplete ? (
          <Badge className="bg-green-600 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Complet
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            {completedCount}/{totalRequired}
          </Badge>
        )}
      </div>
      
      <Progress value={progressPercent} className="h-1.5" />
      
      <div className="grid grid-cols-2 gap-1">
        {statuses.map((status) => (
          <div 
            key={status.type}
            className={`flex items-center gap-1.5 text-xs p-1.5 rounded ${
              status.complete 
                ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400' 
                : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
            }`}
          >
            {status.complete ? (
              <CheckCircle className="w-3 h-3 flex-shrink-0" />
            ) : (
              <XCircle className="w-3 h-3 flex-shrink-0" />
            )}
            <span className="truncate">{status.emoji} {status.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DossierChecklistCard({ 
  clientName, 
  candidates, 
  documents,
  className 
}: DossierChecklistCardProps) {
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
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-5 h-5" />
            Checklist du dossier
          </CardTitle>
          {isFullyComplete ? (
            <Badge className="bg-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              Dossier complet
            </Badge>
          ) : (
            <Badge variant="outline">
              {Math.round(overallProgress)}% complet
            </Badge>
          )}
        </div>
        <Progress value={overallProgress} className="h-2 mt-2" />
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Client principal */}
        <PersonChecklist
          name={`👤 ${clientName}`}
          icon={User}
          iconColor="text-blue-600"
          documents={documents}
          personId={undefined}
        />

        {/* Candidats */}
        {candidates.map(candidate => (
          <PersonChecklist
            key={candidate.id}
            name={`${CANDIDATE_TYPE_LABELS[candidate.type].split(' ')[0]} ${candidate.prenom} ${candidate.nom}`}
            icon={candidate.type === 'garant' ? Shield : Users}
            iconColor={candidate.type === 'garant' ? 'text-purple-600' : 'text-green-600'}
            documents={documents}
            personId={candidate.id}
          />
        ))}

        {candidates.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Aucun candidat supplémentaire (garant, colocataire...)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
