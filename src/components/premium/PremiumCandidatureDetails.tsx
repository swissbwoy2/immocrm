import { ReactNode } from 'react';
import { 
  User, MapPin, Calendar, Phone, Mail, Clock, CheckCircle, XCircle,
  FileCheck, Building2, FileSignature, CalendarCheck, Key, Send, 
  FastForward, Eye, Trash2, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
}

interface Offre {
  adresse: string;
  prix: number;
  pieces: number | null;
  surface: number | null;
}

interface Candidature {
  id: string;
  statut: string;
  date_depot: string;
  created_at: string;
  dates_signature_proposees: any;
  date_signature_choisie: string | null;
  date_etat_lieux: string | null;
  heure_etat_lieux: string | null;
  client_accepte_conclure: boolean | null;
  client_accepte_conclure_at: string | null;
  bail_recu_at: string | null;
  signature_effectuee_at: string | null;
  cles_remises_at: string | null;
  offres: Offre | null;
  client_id: string;
  offre_id: string;
}

interface PremiumCandidatureDetailsProps {
  candidature: Candidature;
  profile: Profile | null;
  onNavigateToClient: () => void;
  onDelete: () => void;
  onStatutChange: (candidatureId: string, newStatut: string, additionalData?: any) => Promise<void>;
  onSendDossier: () => void;
  onProposeDates: () => void;
  onSetEtatLieux: () => void;
  onForceProgression: (targetStatut: string, label: string) => void;
  workflowTimeline: ReactNode;
}

const WORKFLOW_STEPS = [
  { key: 'candidature_deposee', label: 'Demande reçue', icon: FileCheck },
  { key: 'en_attente', label: 'Dossier envoyé', icon: Clock },
  { key: 'acceptee', label: 'Acceptée', icon: CheckCircle },
  { key: 'bail_conclu', label: 'Client confirme', icon: FileSignature },
  { key: 'attente_bail', label: 'Validation régie', icon: Building2 },
  { key: 'bail_recu', label: 'Bail reçu', icon: FileCheck },
  { key: 'signature_planifiee', label: 'Date choisie', icon: CalendarCheck },
  { key: 'signature_effectuee', label: 'Bail signé', icon: FileSignature },
  { key: 'etat_lieux_fixe', label: 'EDL fixé', icon: Calendar },
  { key: 'cles_remises', label: 'Clés remises', icon: Key },
];

const STEP_ORDER = WORKFLOW_STEPS.map(s => s.key);

export function PremiumCandidatureDetails({
  candidature,
  profile,
  onNavigateToClient,
  onDelete,
  onStatutChange,
  onSendDossier,
  onProposeDates,
  onSetEtatLieux,
  onForceProgression,
  workflowTimeline,
}: PremiumCandidatureDetailsProps) {
  const currentIndex = STEP_ORDER.indexOf(candidature.statut);
  const progressPercent = currentIndex >= 0 ? ((currentIndex + 1) / STEP_ORDER.length) * 100 : 0;
  const isCompleted = candidature.statut === 'cles_remises';
  const isRefused = candidature.statut === 'refusee';

  return (
    <div className="space-y-6 pt-6">
      {/* Premium Progress Section */}
      <div className="relative">
        {/* Background glow */}
        {isCompleted && (
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-emerald-500/10 rounded-2xl blur-xl" />
        )}
        
        <div className={cn(
          "relative p-5 rounded-2xl border-2 transition-all duration-500",
          isCompleted && "border-emerald-500/50 bg-gradient-to-br from-emerald-500/5 to-green-500/5",
          isRefused && "border-destructive/50 bg-destructive/5",
          !isCompleted && !isRefused && "border-border/50 bg-gradient-to-br from-card/80 to-card/60"
        )}>
          {/* Progress bar */}
          {!isRefused && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Progression</span>
                <span className={cn(
                  "text-sm font-bold",
                  isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                )}>
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="h-3 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out relative",
                    isCompleted 
                      ? "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400" 
                      : "bg-gradient-to-r from-primary via-primary/80 to-blue-500"
                  )}
                  style={{ width: `${progressPercent}%` }}
                >
                  {/* Animated shine */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* Workflow Timeline */}
          {workflowTimeline}
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Info Card */}
        <div className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-card/95 to-card/80 border border-border/50 hover:border-primary/30 transition-all duration-300">
          {/* Shine effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-lg">Informations client</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{profile?.email || 'N/A'}</span>
              </div>
              
              {profile?.telephone && (
                <a 
                  href={`tel:${profile.telephone}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-primary/10 text-primary transition-colors group/phone"
                >
                  <Phone className="h-4 w-4 shrink-0 group-hover/phone:animate-pulse" />
                  <span className="text-sm font-medium">{profile.telephone}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Dates Card */}
        <div className="group relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-card/95 to-card/80 border border-border/50 hover:border-primary/30 transition-all duration-300">
          {/* Shine effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Calendar className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-lg">Dates importantes</h4>
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                <span className="text-sm text-muted-foreground">Dépôt</span>
                <span className="text-sm font-medium">
                  {format(new Date(candidature.date_depot || candidature.created_at), 'dd/MM/yyyy', { locale: fr })}
                </span>
              </div>
              
              {candidature.client_accepte_conclure_at && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10">
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">Confirmation</span>
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {format(new Date(candidature.client_accepte_conclure_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
              )}
              
              {candidature.date_signature_choisie && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-500/10">
                  <span className="text-sm text-blue-600 dark:text-blue-400">Signature</span>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {format(new Date(candidature.date_signature_choisie), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
              )}
              
              {candidature.date_etat_lieux && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-violet-500/10">
                  <span className="text-sm text-violet-600 dark:text-violet-400">État des lieux</span>
                  <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                    {format(new Date(candidature.date_etat_lieux), 'dd/MM/yyyy', { locale: fr })} {candidature.heure_etat_lieux}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="relative p-5 rounded-2xl bg-gradient-to-br from-card/95 to-card/80 border border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h4 className="font-semibold text-lg">Actions disponibles</h4>
        </div>

        <div className="space-y-4">
          {/* Status-specific actions */}
          {candidature.statut === 'candidature_deposee' && (
            <>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <FileCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Le client souhaite postuler à ce bien. Vérifiez son dossier et envoyez-le à la régie.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={onSendDossier} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  <Send className="h-4 w-4 mr-2" />Envoyer le dossier
                </Button>
                <Button variant="destructive" onClick={() => onStatutChange(candidature.id, 'refusee')}>
                  <XCircle className="h-4 w-4 mr-2" />Refuser
                </Button>
              </div>
            </>
          )}

          {candidature.statut === 'en_attente' && (
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => onStatutChange(candidature.id, 'acceptee')}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle className="h-4 w-4 mr-2" />Accepter
              </Button>
              <Button variant="destructive" onClick={() => onStatutChange(candidature.id, 'refusee')}>
                <XCircle className="h-4 w-4 mr-2" />Refuser
              </Button>
            </div>
          )}

          {candidature.statut === 'acceptee' && (
            <>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  En attente du client (Conclure le bail)
                </span>
              </div>
              <Button 
                variant="outline"
                onClick={() => onForceProgression('bail_conclu', 'Conclure pour le client')}
                className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
              >
                <FastForward className="h-4 w-4 mr-2" />Forcer progression
              </Button>
            </>
          )}

          {candidature.statut === 'bail_conclu' && (
            <Button 
              onClick={() => onStatutChange(candidature.id, 'attente_bail', { 
                agent_valide_regie: true, 
                agent_valide_regie_at: new Date().toISOString() 
              })}
              className="shadow-lg"
            >
              <Building2 className="h-4 w-4 mr-2" />Valider auprès de la régie
            </Button>
          )}

          {candidature.statut === 'attente_bail' && (
            <Button onClick={onProposeDates} className="shadow-lg">
              <FileCheck className="h-4 w-4 mr-2" />Bail reçu - Proposer dates
            </Button>
          )}

          {candidature.statut === 'bail_recu' && (
            <>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  En attente du client (Choix date signature)
                </span>
              </div>
              
              {candidature.dates_signature_proposees && (
                <div className="p-4 rounded-xl bg-muted/30">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Dates proposées:</p>
                  <ul className="space-y-1.5">
                    {(candidature.dates_signature_proposees as any[]).map((d: any, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {format(new Date(d.date), 'EEEE dd MMMM yyyy HH:mm', { locale: fr })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <Button 
                variant="outline"
                onClick={() => onForceProgression('signature_planifiee', 'Confirmer date pour le client')}
                className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
              >
                <FastForward className="h-4 w-4 mr-2" />Forcer progression
              </Button>
            </>
          )}

          {candidature.statut === 'signature_planifiee' && (
            <Button 
              onClick={() => onStatutChange(candidature.id, 'signature_effectuee', { 
                signature_effectuee: true, 
                signature_effectuee_at: new Date().toISOString() 
              })}
              className="shadow-lg"
            >
              <FileSignature className="h-4 w-4 mr-2" />Marquer bail signé
            </Button>
          )}

          {candidature.statut === 'signature_effectuee' && (
            <Button onClick={onSetEtatLieux} className="shadow-lg">
              <Calendar className="h-4 w-4 mr-2" />Fixer état des lieux
            </Button>
          )}

          {candidature.statut === 'etat_lieux_fixe' && (
            <Button 
              onClick={() => onStatutChange(candidature.id, 'cles_remises', { 
                cles_remises: true, 
                cles_remises_at: new Date().toISOString() 
              })}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
            >
              <Key className="h-4 w-4 mr-2" />Clés remises
            </Button>
          )}

          {candidature.statut === 'cles_remises' && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                ✅ Terminé - Dossier complet
              </span>
            </div>
          )}

          {candidature.statut === 'refusee' && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Candidature refusée
              </span>
            </div>
          )}

          {/* Common actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={onNavigateToClient} className="shadow-sm">
              <Eye className="h-4 w-4 mr-2" />Voir fiche client
            </Button>
            <Button variant="destructive" onClick={onDelete} className="shadow-sm">
              <Trash2 className="h-4 w-4 mr-2" />Supprimer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
