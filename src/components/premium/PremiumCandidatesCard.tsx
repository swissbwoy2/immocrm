import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Pencil, Trash2, Shield, Users, DollarSign, AlertTriangle, FileText, CheckCircle, XCircle, Ban, Sparkles } from 'lucide-react';
import { ClientCandidate, CANDIDATE_TYPE_LABELS, CUMULATIVE_TYPES, useClientCandidates } from '@/hooks/useClientCandidates';
import { AddCandidateDialog } from '@/components/AddCandidateDialog';
import { hasStableStatus } from '@/hooks/useSolvabilityCheck';
import { cn } from '@/lib/utils';

interface PremiumCandidatesCardProps {
  clientId: string;
  clientRevenus?: number;
  budgetDemande?: number;
  onDocumentsClick?: (candidate: ClientCandidate) => void;
  onCandidatesChange?: () => void;
}

export function PremiumCandidatesCard({ 
  clientId, 
  clientRevenus = 0, 
  budgetDemande = 0,
  onDocumentsClick,
  onCandidatesChange
}: PremiumCandidatesCardProps) {
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
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-24 bg-muted/50 rounded-xl"></div>
          <div className="h-24 bg-muted/50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20">
        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>

        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300">
                  <Users className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  Candidats du dossier
                  <Sparkles className="w-4 h-4 text-primary/50" />
                </h3>
                <p className="text-xs text-muted-foreground">
                  {candidates.length} candidat{candidates.length > 1 ? 's' : ''} dans le dossier
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={() => { setEditCandidate(null); setAddDialogOpen(true); }}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
          
          <div className="p-6 pt-4 space-y-4">
            {candidates.length === 0 ? (
              <div className="text-center py-10 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-transparent rounded-xl" />
                <div className="relative z-10">
                  <div className="p-4 rounded-2xl bg-muted/30 w-20 h-20 mx-auto flex items-center justify-center mb-4">
                    <Users className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucun candidat supplémentaire</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Ajoutez un garant, colocataire ou co-débiteur</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((candidate, index) => {
                  const TypeIcon = getTypeIcon(candidate.type);
                  const contributes = candidateContributes(candidate);
                  const garantValid = isGarantValid(candidate);
                  const isStable = candidateHasStableStatus(candidate);
                  const isCumulativeType = CUMULATIVE_TYPES.includes(candidate.type);
                  
                  const getBgClass = () => {
                    if (candidate.poursuites) return 'from-destructive/10 to-destructive/5 border-destructive/30';
                    if (!isStable && (isCumulativeType || candidate.type === 'garant')) return 'from-warning/10 to-warning/5 border-warning/30';
                    if (garantValid === true) return 'from-success/10 to-success/5 border-success/30';
                    if (garantValid === false) return 'from-warning/10 to-warning/5 border-warning/30';
                    return 'from-muted/50 to-muted/20 border-border/50';
                  };
                  
                  return (
                    <div 
                      key={candidate.id} 
                      className={cn(
                        "group/card relative overflow-hidden p-4 rounded-xl border bg-gradient-to-br transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
                        getBgClass()
                      )}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Card shine */}
                      <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500">
                        <div className="absolute inset-0 translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      </div>

                      <div className="relative z-10 flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2.5 rounded-xl transition-all duration-300 group-hover/card:scale-110",
                            candidate.type === 'garant' 
                              ? 'bg-purple-500/20 dark:bg-purple-500/30' 
                              : 'bg-blue-500/20 dark:bg-blue-500/30'
                          )}>
                            <TypeIcon className={cn(
                              "w-5 h-5",
                              candidate.type === 'garant' 
                                ? 'text-purple-600 dark:text-purple-400' 
                                : 'text-blue-600 dark:text-blue-400'
                            )} />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{candidate.prenom} {candidate.nom}</p>
                              <Badge variant="outline" className="text-xs bg-background/50 backdrop-blur-sm">
                                {CANDIDATE_TYPE_LABELS[candidate.type]}
                              </Badge>
                              {candidate.lien_avec_client && (
                                <Badge variant="secondary" className="text-xs bg-secondary/50 backdrop-blur-sm">
                                  {candidate.lien_avec_client}
                                </Badge>
                              )}
                              {!isStable && (
                                <Badge className="text-xs bg-warning/20 text-warning border-warning/40 hover:bg-warning/30">
                                  Permis non stable
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5 font-medium">
                                <DollarSign className="w-3.5 h-3.5 text-primary" />
                                CHF {(candidate.revenus_mensuels || 0).toLocaleString()}
                              </span>
                              {candidate.type_permis && (
                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted/50">
                                  📄 Permis {candidate.type_permis}
                                </span>
                              )}
                              {candidate.poursuites && (
                                <span className="flex items-center gap-1 text-destructive font-medium">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Poursuites
                                </span>
                              )}
                            </div>

                            {/* Info contribution */}
                            <div className="pt-1">
                              {contributes ? (
                                <p className="text-xs text-success flex items-center gap-1.5 font-medium">
                                  <CheckCircle className="w-4 h-4" />
                                  +CHF {Math.round((candidate.revenus_mensuels || 0) / 3).toLocaleString()} au budget
                                </p>
                              ) : candidate.type === 'garant' ? (
                                garantValid ? (
                                  <p className="text-xs text-success flex items-center gap-1.5 font-medium">
                                    <CheckCircle className="w-4 h-4" />
                                    Garant valide (garantit jusqu'à CHF {Math.round((candidate.revenus_mensuels || 0) / 3).toLocaleString()})
                                  </p>
                                ) : (
                                  <p className="text-xs text-warning flex items-center gap-1.5 font-medium">
                                    <XCircle className="w-4 h-4" />
                                    {candidate.poursuites 
                                      ? 'Garant invalide (poursuites)' 
                                      : !isStable
                                        ? 'Garant invalide (permis non stable)'
                                        : `Revenus insuffisants (min CHF ${(budgetDemande * 3).toLocaleString()} requis)`
                                    }
                                  </p>
                                )
                              ) : isCumulativeType ? (
                                <p className="text-xs text-warning flex items-center gap-1.5 font-medium">
                                  <Ban className="w-4 h-4" />
                                  {candidate.poursuites 
                                    ? 'Non comptabilisé (poursuites)' 
                                    : 'Non comptabilisé (permis non stable)'
                                  }
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-0.5">
                          {onDocumentsClick && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                              onClick={() => onDocumentsClick(candidate)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => handleEdit(candidate)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => handleDeleteClick(candidate)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Récapitulatif budget */}
            {candidates.length > 0 && (
              <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent border border-primary/10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">Récapitulatif des revenus</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1.5 px-3 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">Client principal</span>
                    <span className="font-medium">CHF {clientRevenus.toLocaleString()}</span>
                  </div>
                  {candidates
                    .filter(c => CUMULATIVE_TYPES.includes(c.type))
                    .map(c => {
                      const isContributing = candidateContributes(c);
                      return (
                        <div 
                          key={c.id} 
                          className={cn(
                            "flex justify-between items-center py-1.5 px-3 rounded-lg transition-colors",
                            isContributing ? 'bg-success/10 text-success' : 'bg-muted/20 text-muted-foreground line-through'
                          )}
                        >
                          <span className="flex items-center gap-1">
                            {isContributing ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {CANDIDATE_TYPE_LABELS[c.type].split(' ')[1]}: {c.prenom}
                            {!isContributing && (
                              <span className="text-xs opacity-70 ml-1">
                                ({c.poursuites ? 'poursuites' : 'permis'})
                              </span>
                            )}
                          </span>
                          <span className="font-medium">CHF {(c.revenus_mensuels || 0).toLocaleString()}</span>
                        </div>
                      );
                    })
                  }
                  <div className="border-t border-border/50 pt-3 mt-3 space-y-2">
                    <div className="flex justify-between items-center py-1.5 px-3 rounded-lg bg-muted/50 font-medium">
                      <span>Total revenus (comptabilisés)</span>
                      <span>CHF {totalRevenus.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 text-primary font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Budget max possible
                      </span>
                      <span className="text-lg">CHF {budgetPossible.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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
        <AlertDialogContent className="border-border/50 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce candidat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera {candidateToDelete?.prenom} {candidateToDelete?.nom} du dossier ainsi que tous ses documents associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
