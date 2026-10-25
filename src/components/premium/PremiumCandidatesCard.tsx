import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Pencil, Trash2, Shield, Users, DollarSign, AlertTriangle, FileText, CheckCircle, XCircle, Ban, Mail, Phone, Globe } from 'lucide-react';
import { ClientCandidate, CANDIDATE_TYPE_LABELS, CUMULATIVE_TYPES, useClientCandidates } from '@/hooks/useClientCandidates';
import { AddCandidateDialog } from '@/components/AddCandidateDialog';
import { hasStableStatus } from '@/hooks/useSolvabilityCheck';
import { cn } from '@/lib/utils';
import { CandidateFullDetails } from '@/components/candidates/CandidateFullDetails';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';


interface PremiumCandidatesCardProps {
  clientId: string;
  clientRevenus?: number;
  budgetDemande?: number;
  onDocumentsClick?: (candidate: ClientCandidate) => void;
  onCandidatesChange?: () => void;
}

export function PremiumCandidatesCard({ 
  clientId, 
  clientRevenus: clientRevenusProp, 
  budgetDemande: budgetDemandeProp,
  onDocumentsClick,
  onCandidatesChange
}: PremiumCandidatesCardProps) {
  const clientRevenus = clientRevenusProp ?? 0;
  const budgetDemande = budgetDemandeProp ?? 0;
  const { candidates, loading, addCandidate, updateCandidate, deleteCandidate, getCumulativeIncome } = useClientCandidates(clientId);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editCandidate, setEditCandidate] = useState<ClientCandidate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<ClientCandidate | null>(null);

  const handleSave = async (data: Omit<ClientCandidate, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => {
    let result;
    if (editCandidate) {
      result = await updateCandidate(editCandidate.id, data);
    } else {
      result = await addCandidate(data);
    }
    if (result && onCandidatesChange) {
      onCandidatesChange();
    }
    return result;
  };

  const handleEdit = (candidate: ClientCandidate) => {
    setEditCandidate(candidate);
    setAddDialogOpen(true);
  };

  const handleDeleteClick = (candidate: ClientCandidate) => {
    setCandidateToDelete(candidate);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (candidateToDelete) {
      const success = await deleteCandidate(candidateToDelete.id);
      setDeleteDialogOpen(false);
      setCandidateToDelete(null);
      if (success && onCandidatesChange) {
        onCandidatesChange();
      }
    }
  };

  const cumulativeIncome = getCumulativeIncome();
  const totalRevenus = clientRevenus + cumulativeIncome;
  const budgetPossible = Math.round(totalRevenus / 3);

  const getTypeIcon = (type: string) => {
    if (type === 'garant') return Shield;
    return Users;
  };

  const candidateHasStableStatus = (candidate: ClientCandidate) => {
    return hasStableStatus(candidate.type_permis, candidate.nationalite);
  };

  const isGarantValid = (candidate: ClientCandidate) => {
    if (candidate.type !== 'garant') return null;
    return !candidate.poursuites && 
           candidateHasStableStatus(candidate) &&
           (candidate.revenus_mensuels || 0) >= budgetDemande * 3;
  };

  const candidateContributes = (candidate: ClientCandidate) => {
    return CUMULATIVE_TYPES.includes(candidate.type) && 
           !candidate.poursuites && 
           candidateHasStableStatus(candidate);
  };

  if (loading) {
    return (
      <div className={`${DASH_CARD} p-4 md:p-5`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded bg-muted"></div>
          <div className="h-24 rounded-xl bg-muted/50"></div>
          <div className="h-24 rounded-xl bg-muted/50"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${DASH_CARD} p-4 md:p-5`}>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">Candidats du dossier</h3>
              <p className="text-xs text-muted-foreground">
                {candidates.length} candidat{candidates.length > 1 ? 's' : ''} dans le dossier
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={() => { setEditCandidate(null); setAddDialogOpen(true); }}
            className="shrink-0 rounded-full"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        </div>
          
        <div className="space-y-4">
          {candidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">Aucun candidat supplémentaire</p>
              <p className="mt-1 text-xs text-muted-foreground">Ajoutez un garant, colocataire ou co-débiteur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((candidate) => {
                const TypeIcon = getTypeIcon(candidate.type);
                const contributes = candidateContributes(candidate);
                const garantValid = isGarantValid(candidate);
                const isStable = candidateHasStableStatus(candidate);
                const isCumulativeType = CUMULATIVE_TYPES.includes(candidate.type);
                
                const getBorderClass = () => {
                  if (candidate.poursuites) return 'border-destructive/30';
                  if (!isStable && (isCumulativeType || candidate.type === 'garant')) return 'border-amber-500/30';
                  if (garantValid === true) return 'border-emerald-500/30';
                  if (garantValid === false) return 'border-amber-500/30';
                  return 'border-border/70';
                };
                
                return (
                  <div 
                    key={candidate.id} 
                    className={cn('rounded-xl border bg-card p-3 sm:p-4', getBorderClass())}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                        <TypeIcon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <p className="text-sm font-semibold text-foreground">{candidate.prenom} {candidate.nom}</p>
                            <DashBadge tone="neutral">
                              {CANDIDATE_TYPE_LABELS[candidate.type].split(' ').slice(1).join(' ')}
                            </DashBadge>
                            {candidate.lien_avec_client && (
                              <DashBadge tone="muted">{candidate.lien_avec_client}</DashBadge>
                            )}
                            {!isStable && (
                              <DashBadge tone="warning">Permis non stable</DashBadge>
                            )}
                          </div>

                          <div className="-mr-1 -mt-1 flex shrink-0 items-center">
                            {onDocumentsClick && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => onDocumentsClick(candidate)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 rounded-full"
                              onClick={() => handleEdit(candidate)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 rounded-full text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDeleteClick(candidate)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                          
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <DollarSign className="h-3.5 w-3.5 text-primary" />
                            CHF {(candidate.revenus_mensuels || 0).toLocaleString()}
                          </span>
                          {candidate.type_permis && (
                            <span className="flex items-center gap-1 text-xs">
                              <FileText className="h-3.5 w-3.5" />
                              Permis {candidate.type_permis}
                            </span>
                          )}
                          {candidate.poursuites && (
                            <span className="flex items-center gap-1 font-medium text-destructive">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Poursuites
                            </span>
                          )}
                        </div>

                        {/* Coordonnées */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex min-w-0 items-center gap-1">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            {candidate.email ? (
                              <a href={`mailto:${candidate.email}`} className="truncate hover:underline">{candidate.email}</a>
                            ) : (
                              <span className="text-amber-600">E-mail manquant</span>
                            )}
                          </span>
                          <span className="flex min-w-0 items-center gap-1">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {candidate.telephone ? (
                              <a href={`tel:${candidate.telephone}`} className="truncate hover:underline">{candidate.telephone}</a>
                            ) : (
                              <span className="text-amber-600">Téléphone manquant</span>
                            )}
                          </span>
                          {candidate.nationalite && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5 shrink-0" />
                              {candidate.nationalite}
                            </span>
                          )}
                        </div>

                        {/* Info contribution */}
                        <div className="pt-1">
                          {contributes ? (
                            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                              <CheckCircle className="h-4 w-4" />
                              +CHF {Math.round((candidate.revenus_mensuels || 0) / 3).toLocaleString()} au budget
                            </p>
                          ) : candidate.type === 'garant' ? (
                            garantValid ? (
                              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                <CheckCircle className="h-4 w-4" />
                                Garant valide (garantit jusqu'à CHF {Math.round((candidate.revenus_mensuels || 0) / 3).toLocaleString()})
                              </p>
                            ) : (
                              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                                <XCircle className="h-4 w-4" />
                                {candidate.poursuites 
                                  ? 'Garant invalide (poursuites)' 
                                  : !isStable
                                    ? 'Garant invalide (permis non stable)'
                                    : `Revenus insuffisants (min CHF ${(budgetDemande * 3).toLocaleString()} requis)`
                                }
                              </p>
                            )
                          ) : isCumulativeType ? (
                            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                              <Ban className="h-4 w-4" />
                              {candidate.poursuites 
                                ? 'Non comptabilisé (poursuites)' 
                                : 'Non comptabilisé (permis non stable)'
                              }
                            </p>
                          ) : null}
                        </div>

                        <CandidateFullDetails candidate={candidate} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Récapitulatif budget */}
          {candidates.length > 0 && (
            <div className="rounded-xl border border-border/70 p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <DollarSign className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-foreground">Récapitulatif des revenus</p>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5">
                  <span className="text-muted-foreground">Client principal</span>
                  <span className="font-medium text-foreground">CHF {clientRevenus.toLocaleString()}</span>
                </div>
                {candidates
                  .filter(c => CUMULATIVE_TYPES.includes(c.type))
                  .map(c => {
                    const isContributing = candidateContributes(c);
                    return (
                      <div 
                        key={c.id} 
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-lg px-3 py-1.5',
                          isContributing ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted/30 text-muted-foreground line-through'
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-1">
                          {isContributing ? <CheckCircle className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
                          {CANDIDATE_TYPE_LABELS[c.type].split(' ')[1]}: {c.prenom}
                          {!isContributing && (
                            <span className="ml-1 text-xs opacity-70">
                              ({c.poursuites ? 'poursuites' : 'permis'})
                            </span>
                          )}
                        </span>
                        <span className="font-medium">CHF {(c.revenus_mensuels || 0).toLocaleString()}</span>
                      </div>
                    );
                  })
                }
                <div className="mt-3 space-y-1.5 border-t border-border/70 pt-3">
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 font-medium text-foreground">
                    <span>Total revenus (comptabilisés)</span>
                    <span>CHF {totalRevenus.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 font-semibold text-primary">
                    <span>Budget max possible</span>
                    <span className="text-base">CHF {budgetPossible.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddCandidateDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditCandidate(null);
        }}
        onSave={handleSave}
        editCandidate={editCandidate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce candidat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera {candidateToDelete?.prenom} {candidateToDelete?.nom} du dossier ainsi que tous ses documents associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
