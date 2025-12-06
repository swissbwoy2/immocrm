import { AlertTriangle, FileText, CheckCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

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
      <div className="group relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl border border-success/30 hover:border-success/50 hover:shadow-xl hover:shadow-success/10 transition-all duration-500 animate-fade-in">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-emerald-500/10" />
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-success/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
        
        <div className="relative flex items-center gap-4 p-5">
          <div className="p-3 rounded-xl bg-success/20 group-hover:bg-success/30 transition-colors duration-300">
            <CheckCircle className="w-6 h-6 text-success group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-success flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse-soft" />
              Votre dossier est complet !
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">Tous les documents requis ont été ajoutés</p>
          </div>
          <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-success/20 text-success font-bold text-lg">
            100%
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="group relative overflow-hidden rounded-xl bg-card/80 backdrop-blur-xl border border-warning/30 hover:border-warning/50 transition-all duration-300 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-r from-warning/5 via-transparent to-orange-500/5" />
        <div className="relative flex items-center gap-3 p-3">
          <div className="p-1.5 rounded-lg bg-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <span className="text-sm text-warning font-medium">
            {missingRequired.length} document{missingRequired.length > 1 ? 's' : ''} manquant{missingRequired.length > 1 ? 's' : ''}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto text-warning hover:text-warning hover:bg-warning/10 transition-all duration-300"
            onClick={() => navigate('/client/documents')}
          >
            Compléter →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl border border-warning/30 hover:border-warning/50 hover:shadow-xl hover:shadow-warning/10 transition-all duration-500 animate-fade-in">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-warning/10 via-transparent to-orange-500/10" />
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-4 right-10 w-16 h-16 bg-warning/20 rounded-full blur-2xl animate-float-particle" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-4 left-10 w-12 h-12 bg-orange-400/20 rounded-full blur-xl animate-float-particle" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-warning/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-warning/20 group-hover:bg-warning/30 transition-colors duration-300">
            <AlertTriangle className="w-5 h-5 text-warning group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h3 className="text-lg font-semibold text-warning">Documents manquants</h3>
          <Badge className="ml-auto bg-warning/20 text-warning border-warning/30 hover:bg-warning/30 transition-colors">
            {missingRequired.length} restant{missingRequired.length > 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Progress bar premium */}
        <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border border-warning/20">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground font-medium">Progression du dossier</span>
            <span className="text-warning font-bold">{completionPercentage}%</span>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden bg-warning/10">
            <Progress 
              value={completionPercentage} 
              className="h-3 bg-transparent"
              indicatorClassName="bg-gradient-to-r from-warning via-orange-400 to-amber-400 shadow-lg shadow-warning/30"
            />
            {/* Glow effect */}
            <div 
              className="absolute top-0 h-full bg-gradient-to-r from-warning/50 to-transparent blur-sm rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{REQUIRED_DOCUMENTS.length - missingRequired.length} / {REQUIRED_DOCUMENTS.length} documents</span>
            <span>{missingRequired.length > 0 ? `${missingRequired.length} à ajouter` : 'Complet !'}</span>
          </div>
        </div>

        {/* Documents requis manquants */}
        {missingRequired.length > 0 && (
          <div className="space-y-3 mb-5">
            <p className="text-sm font-medium text-foreground">
              Pour compléter votre dossier, veuillez ajouter :
            </p>
            <div className="flex flex-wrap gap-2">
              {missingRequired.map((doc, index) => (
                <Badge 
                  key={doc.key} 
                  variant="outline" 
                  className="group/badge relative overflow-hidden bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border-warning/30 text-foreground hover:border-warning/50 hover:scale-105 transition-all duration-300 py-2 px-3 cursor-default animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Badge glow on hover */}
                  <div className="absolute inset-0 bg-warning/5 opacity-0 group-hover/badge:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center gap-2">
                    <span className="text-base">{doc.emoji}</span>
                    <span>{doc.label}</span>
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Documents post-signature manquants */}
        {shouldShowPostSignature && missingPostSignature.length > 0 && (
          <div className="space-y-3 mb-5 pt-4 border-t border-warning/20">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="text-lg">🔑</span>
              Avant la remise des clés, ajoutez :
            </p>
            <div className="flex flex-wrap gap-2">
              {missingPostSignature.map((doc, index) => (
                <Badge 
                  key={doc.key} 
                  variant="outline" 
                  className="group/badge relative overflow-hidden bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-sm border-primary/30 text-foreground hover:border-primary/50 hover:scale-105 transition-all duration-300 py-2 px-3 cursor-default animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/badge:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center gap-2">
                    <span className="text-base">{doc.emoji}</span>
                    <span>{doc.label}</span>
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* CTA Button premium */}
        <Button 
          size="lg"
          className="w-full bg-gradient-to-r from-warning to-orange-500 hover:from-warning/90 hover:to-orange-500/90 text-warning-foreground shadow-lg shadow-warning/20 hover:shadow-warning/30 hover:scale-[1.02] transition-all duration-300 group/btn"
          onClick={() => navigate('/client/documents')}
        >
          <FileText className="w-4 h-4 mr-2 group-hover/btn:rotate-6 transition-transform duration-300" />
          Ajouter des documents
          <Sparkles className="w-4 h-4 ml-2 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
        </Button>
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
