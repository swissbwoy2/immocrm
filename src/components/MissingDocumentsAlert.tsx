import { AlertTriangle, FileText, CheckCircle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';

// Documents requis pour un dossier complet (avant acceptation)
const REQUIRED_DOCUMENTS = [
  { key: 'piece_identite', label: 'Pièce d\'identité', emoji: '🪪' },
  { key: 'fiche_salaire', label: 'Fiches de salaire (3 dernières)', emoji: '💰' },
  { key: 'contrat_travail', label: 'Contrat de travail', emoji: '📝' },
  { key: 'attestation_employeur', label: 'Attestation employeur', emoji: '👔' },
  { key: 'extrait_poursuites', label: 'Extrait des poursuites', emoji: '📋' },
  { key: 'attestation_domicile', label: 'Attestation de domicile', emoji: '🏠' },
];

// Documents requis après signature du bail (avant remise des clés)
const POST_SIGNATURE_DOCUMENTS = [
  { key: 'copie_bail', label: 'Copie du bail', emoji: '📋' },
  { key: 'attestation_garantie_loyer', label: 'Attestation garantie de loyer', emoji: '🔐' },
];

interface Document {
  id: string;
  type_document?: string;
}

interface MissingDocumentsAlertProps {
  documents: Document[];
  candidatureStatut?: string;
  variant?: 'full' | 'compact';
  showPostSignature?: boolean;
}

export function MissingDocumentsAlert({ 
  documents, 
  candidatureStatut,
  variant = 'full',
  showPostSignature = false
}: MissingDocumentsAlertProps) {
  const navigate = useNavigate();
  
  // Vérifier quels documents sont présents
  const documentTypes = documents.map(d => d.type_document).filter(Boolean);
  
  // Documents requis manquants (dossier initial)
  const missingRequired = REQUIRED_DOCUMENTS.filter(
    req => !documentTypes.includes(req.key)
  );
  
  // Documents post-signature manquants
  const missingPostSignature = POST_SIGNATURE_DOCUMENTS.filter(
    req => !documentTypes.includes(req.key)
  );

  // Déterminer si on doit montrer l'alerte post-signature
  const postSignatureStatuts = ['signature_effectuee', 'etat_lieux_fixe'];
  const shouldShowPostSignature = showPostSignature || 
    (candidatureStatut && postSignatureStatuts.includes(candidatureStatut));

  const hasAllRequired = missingRequired.length === 0;
  const hasAllPostSignature = missingPostSignature.length === 0;
  const completionPercentage = Math.round(
    ((REQUIRED_DOCUMENTS.length - missingRequired.length) / REQUIRED_DOCUMENTS.length) * 100
  );

  if (hasAllRequired && (!shouldShowPostSignature || hasAllPostSignature)) {
    if (variant === 'compact') return null;
    
    return (
      <div className={`${DASH_CARD} p-4 md:p-5`}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">Votre dossier est complet !</p>
            <p className="mt-1 text-sm text-muted-foreground">Tous les documents requis ont été ajoutés</p>
          </div>
          <DashBadge tone="success">100%</DashBadge>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`${DASH_CARD} flex items-center gap-3 p-3`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium text-foreground">
          {missingRequired.length} document{missingRequired.length > 1 ? 's' : ''} manquant{missingRequired.length > 1 ? 's' : ''}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-auto rounded-full"
          onClick={() => navigate('/client/documents')}
        >
          Compléter →
        </Button>
      </div>
    );
  }

  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-foreground">Documents manquants</p>
            <DashBadge tone="warning">
              {missingRequired.length} restant{missingRequired.length > 1 ? 's' : ''}
            </DashBadge>
          </div>

          {/* Progression du dossier */}
          <div className="mt-3">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-muted-foreground">Progression du dossier</span>
              <span className="font-semibold text-foreground">{completionPercentage}%</span>
            </div>
            <Progress 
              value={completionPercentage} 
              className="h-1.5 bg-muted"
              indicatorClassName="bg-amber-500"
            />
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{REQUIRED_DOCUMENTS.length - missingRequired.length} / {REQUIRED_DOCUMENTS.length} documents</span>
              <span>{missingRequired.length > 0 ? `${missingRequired.length} à ajouter` : 'Complet !'}</span>
            </div>
          </div>

          {/* Documents requis manquants */}
          {missingRequired.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Pour compléter votre dossier, veuillez ajouter :
              </p>
              <div className="flex flex-wrap gap-2">
                {missingRequired.map((doc) => (
                  <span
                    key={doc.key}
                    className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {doc.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Documents post-signature manquants */}
          {shouldShowPostSignature && missingPostSignature.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-border/70 pt-4">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <KeyRound className="h-4 w-4 text-primary" />
                Avant la remise des clés, ajoutez :
              </p>
              <div className="flex flex-wrap gap-2">
                {missingPostSignature.map((doc) => (
                  <span
                    key={doc.key}
                    className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {doc.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-4">
            <Button 
              size="sm"
              className="rounded-full"
              onClick={() => navigate('/client/documents')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Ajouter des documents
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function getDocumentCompletionStatus(documents: Document[]) {
  const documentTypes = documents.map(d => d.type_document).filter(Boolean);
  
  const missingRequired = REQUIRED_DOCUMENTS.filter(
    req => !documentTypes.includes(req.key)
  );
  
  const missingPostSignature = POST_SIGNATURE_DOCUMENTS.filter(
    req => !documentTypes.includes(req.key)
  );

  return {
    isComplete: missingRequired.length === 0,
    missingCount: missingRequired.length,
    missingRequired,
    missingPostSignature,
    completionPercentage: Math.round(
      ((REQUIRED_DOCUMENTS.length - missingRequired.length) / REQUIRED_DOCUMENTS.length) * 100
    ),
  };
}
