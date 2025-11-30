import { AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700 dark:text-green-400 font-medium">
            ✅ Votre dossier est complet !
          </span>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-sm text-amber-700 dark:text-amber-400">
          {missingRequired.length} document{missingRequired.length > 1 ? 's' : ''} manquant{missingRequired.length > 1 ? 's' : ''}
        </span>
        <Button 
          variant="link" 
          size="sm" 
          className="text-amber-700 dark:text-amber-400 p-0 h-auto"
          onClick={() => navigate('/client/documents')}
        >
          Compléter
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5" />
          Documents manquants
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-amber-600 dark:text-amber-500">Progression du dossier</span>
            <span className="text-amber-700 dark:text-amber-400 font-medium">{completionPercentage}%</span>
          </div>
          <div className="h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Documents requis manquants */}
        {missingRequired.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Pour compléter votre dossier, veuillez ajouter :
            </p>
            <div className="flex flex-wrap gap-2">
              {missingRequired.map(doc => (
                <Badge 
                  key={doc.key} 
                  variant="outline" 
                  className="bg-white dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                >
                  {doc.emoji} {doc.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Documents post-signature manquants */}
        {shouldShowPostSignature && missingPostSignature.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-800">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              🔑 Avant la remise des clés, ajoutez :
            </p>
            <div className="flex flex-wrap gap-2">
              {missingPostSignature.map(doc => (
                <Badge 
                  key={doc.key} 
                  variant="outline" 
                  className="bg-white dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                >
                  {doc.emoji} {doc.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm"
          className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
          onClick={() => navigate('/client/documents')}
        >
          <FileText className="w-4 h-4 mr-2" />
          Ajouter des documents
        </Button>
      </CardContent>
    </Card>
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
