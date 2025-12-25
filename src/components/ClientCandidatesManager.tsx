import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Pencil, Trash2, Shield, Users, DollarSign, AlertTriangle, FileText, CheckCircle, XCircle, Ban } from 'lucide-react';
import { ClientCandidate, CANDIDATE_TYPE_LABELS, CUMULATIVE_TYPES, useClientCandidates } from '@/hooks/useClientCandidates';
import { AddCandidateDialog } from './AddCandidateDialog';
import { hasStableStatus } from '@/hooks/useSolvabilityCheck';

interface ClientCandidatesManagerProps {
  clientId: string;
  clientRevenus?: number;
  budgetDemande?: number;
  onDocumentsClick?: (candidate: ClientCandidate) => void;
  onCandidatesChange?: () => void;
}

export function ClientCandidatesManager({ 
  clientId, 
  clientRevenus = 0, 
  budgetDemande = 0,
  onDocumentsClick,
  onCandidatesChange
}: ClientCandidatesManagerProps) {
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
    // Notifier le parent pour rafraîchir les données
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
      // Notifier le parent pour rafraîchir les données
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

  // Vérifier si un candidat a un statut stable
  const candidateHasStableStatus = (candidate: ClientCandidate) => {
    return hasStableStatus(candidate.type_permis, candidate.nationalite);
  };

  // Vérifier si un garant est valide (avec statut stable)
  const isGarantValid = (candidate: ClientCandidate) => {
    if (candidate.type !== 'garant') return null;
    return !candidate.poursuites && 
           candidateHasStableStatus(candidate) &&
           (candidate.revenus_mensuels || 0) >= budgetDemande * 3;
  };

  // Vérifier si un candidat contribue aux revenus
  const candidateContributes = (candidate: ClientCandidate) => {
    return CUMULATIVE_TYPES.includes(candidate.type) && 
           !candidate.poursuites && 
           candidateHasStableStatus(candidate);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg min-w-0">
              <Users className="w-5 h-5 shrink-0" />
              <span className="truncate">Candidats du dossier</span>
            </CardTitle>
            <Button size="sm" className="shrink-0" onClick={() => { setEditCandidate(null); setAddDialogOpen(true); }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {candidates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun candidat supplémentaire</p>
              <p className="text-xs mt-1">Ajoutez un garant, colocataire ou co-débiteur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((candidate) => {
                const TypeIcon = getTypeIcon(candidate.type);
                const contributes = candidateContributes(candidate);
                const garantValid = isGarantValid(candidate);
                const isStable = candidateHasStableStatus(candidate);
                const isCumulativeType = CUMULATIVE_TYPES.includes(candidate.type);
                
                return (
                  <div 
                    key={candidate.id} 
                    className={`p-4 rounded-lg border ${
                      candidate.poursuites 
                        ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' 
                        : !isStable && (isCumulativeType || candidate.type === 'garant')
                          ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20'
                          : garantValid === true
                            ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20'
                            : garantValid === false
                              ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20'
                              : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          candidate.type === 'garant' 
                            ? 'bg-purple-100 dark:bg-purple-900/30' 
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          <TypeIcon className={`w-5 h-5 ${
                            candidate.type === 'garant' 
                              ? 'text-purple-600' 
                              : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{candidate.prenom} {candidate.nom}</p>
                            <Badge variant="outline" className="text-xs">
                              {CANDIDATE_TYPE_LABELS[candidate.type]}
                            </Badge>
                            {candidate.lien_avec_client && (
                              <Badge variant="secondary" className="text-xs">
                                {candidate.lien_avec_client}
                              </Badge>
                            )}
                            {/* Badge statut permis */}
                            {!isStable && (
                              <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                                Permis non stable
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              CHF {(candidate.revenus_mensuels || 0).toLocaleString()}
                            </span>
                            {candidate.type_permis && (
                              <span className="text-xs">
                                Permis: {candidate.type_permis}
                              </span>
                            )}
                            {candidate.poursuites && (
                              <span className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="w-3 h-3" />
                                Poursuites
                              </span>
                            )}
                          </div>

                          {/* Info contribution */}
                          <div className="mt-2">
                            {contributes ? (
                              <p className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                +CHF {Math.round((candidate.revenus_mensuels || 0) / 3).toLocaleString()} au budget
                              </p>
                            ) : candidate.type === 'garant' ? (
                              garantValid ? (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Garant valide (garantit jusqu'à CHF {Math.round((candidate.revenus_mensuels || 0) / 3).toLocaleString()})
                                </p>
                              ) : (
                                <p className="text-xs text-orange-600 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  {candidate.poursuites 
                                    ? 'Garant invalide (poursuites)' 
                                    : !isStable
                                      ? 'Garant invalide (permis non stable)'
                                      : `Revenus insuffisants (min CHF ${(budgetDemande * 3).toLocaleString()} requis)`
                                  }
                                </p>
                              )
                            ) : isCumulativeType ? (
                              <p className="text-xs text-orange-600 flex items-center gap-1">
                                <Ban className="w-3 h-3" />
                                {candidate.poursuites 
                                  ? 'Non comptabilisé (poursuites)' 
                                  : 'Non comptabilisé (permis non stable)'
                                }
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {onDocumentsClick && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onDocumentsClick(candidate)}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(candidate)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">📊 Récapitulatif des revenus</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client principal</span>
                  <span>CHF {clientRevenus.toLocaleString()}</span>
                </div>
                {candidates
                  .filter(c => CUMULATIVE_TYPES.includes(c.type))
                  .map(c => {
                    const isContributing = candidateContributes(c);
                    return (
                      <div key={c.id} className={`flex justify-between ${isContributing ? 'text-green-600' : 'text-muted-foreground line-through'}`}>
                        <span>
                          {isContributing ? '+' : '✗'} {CANDIDATE_TYPE_LABELS[c.type].split(' ')[1]}: {c.prenom}
                          {!isContributing && (
                            <span className="text-xs ml-1">
                              ({c.poursuites ? 'poursuites' : 'permis'})
                            </span>
                          )}
                        </span>
                        <span>CHF {(c.revenus_mensuels || 0).toLocaleString()}</span>
                      </div>
                    );
                  })
                }
                <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                  <span>Total revenus (comptabilisés)</span>
                  <span>CHF {totalRevenus.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-primary font-semibold">
                  <span>→ Budget max possible</span>
                  <span>CHF {budgetPossible.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce candidat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera {candidateToDelete?.prenom} {candidateToDelete?.nom} du dossier ainsi que tous ses documents associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
