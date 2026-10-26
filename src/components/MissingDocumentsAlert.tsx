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

  const have = REQUIRED_DOCUMENTS.length - missingRequired.length;
  const ring = 2 * Math.PI * 23.5;
  const Item = ({ label }: { label: string }) => (
    <li className="flex min-h-11 items-center gap-3 py-1.5">
      <span className="h-5 w-5 shrink-0 rounded-full border-2 border-dashed border-amber-500/70" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
    </li>
  );

  return (
    <div className={`${DASH_CARD} p-4 md:p-5`}>
      <div className="flex items-center gap-3.5">
        {/* Anneau : pièces fournies */}
        <span className="relative inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center">
          <svg width="52" height="52" className="-rotate-90" aria-hidden>
            <circle cx="26" cy="26" r="23.5" fill="none" strokeWidth="5" className="stroke-black/[0.07] dark:stroke-white/10" />
            <circle cx="26" cy="26" r="23.5" fill="none" strokeWidth="5" strokeLinecap="round" className="stroke-amber-500"
              strokeDasharray={ring} strokeDashoffset={ring * (1 - completionPercentage / 100)} />
          </svg>
          <span className="absolute text-[13px] font-semibold tabular-nums text-foreground">{have}/{REQUIRED_DOCUMENTS.length}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[17px] font-semibold leading-tight text-foreground">Documents manquants</p>
            <span className="shrink-0"><DashBadge tone="warning">{missingRequired.length} à ajouter</DashBadge></span>
          </div>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">Complétez votre dossier pour que vos candidatures partent sans attendre.</p>
        </div>
      </div>

      {missingRequired.length > 0 && (
        <ul className="imr-lg-glass mt-4 divide-y divide-black/[0.06] rounded-[20px] px-3.5 dark:divide-white/10">
          {missingRequired.map((doc) => <Item key={doc.key} label={doc.label} />)}
        </ul>
      )}

      {shouldShowPostSignature && missingPostSignature.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="h-4 w-4 text-primary" />
            Avant la remise des clés
          </p>
          <ul className="imr-lg-glass mt-2 divide-y divide-black/[0.06] rounded-[20px] px-3.5 dark:divide-white/10">
            {missingPostSignature.map((doc) => <Item key={doc.key} label={doc.label} />)}
          </ul>
        </div>
      )}

      <Button className="mt-4 h-12 w-full gap-2 sm:w-auto" onClick={() => navigate('/client/documents')}>
        <FileText className="h-4 w-4" />
        Ajouter mes documents
      </Button>
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
