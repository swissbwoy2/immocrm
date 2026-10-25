import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, UserCheck, UserX, Download, Users } from 'lucide-react';
import { DashBadge, DashEmptyState, DASH_CARD } from '@/components/client/dashboard/DashPrimitives';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import EmployeDialog from './EmployeDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Employe {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  nationalite: string | null;
  type_permis: string | null;
  poste: string | null;
  type_contrat: string | null;
  salaire_mensuel: number;
  taux_activite: number;
  is_independant: boolean;
  statut: string;
  date_engagement: string | null;
  canton_travail: string | null;
  bareme_impot_source: string | null;
  user_id: string | null;
}

export default function EmployesList() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmploye, setEditingEmploye] = useState<Employe | null>(null);

  const { data: employes = [], isLoading } = useQuery({
    queryKey: ['employes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employes')
        .select('*')
        .order('nom');
      if (error) throw error;
      return data as Employe[];
    },
  });

  // Fetch agents and coursiers to identify linked employees
  const { data: agentUserIds = [] } = useQuery({
    queryKey: ['agent-user-ids'],
    queryFn: async () => {
      const { data } = await supabase.from('agents').select('user_id');
      return (data || []).map(a => a.user_id);
    },
  });

  const { data: coursierUserIds = [] } = useQuery({
    queryKey: ['coursier-user-ids'],
    queryFn: async () => {
      const { data } = await supabase.from('coursiers').select('user_id');
      return (data || []).map(c => c.user_id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employes'] });
      toast.success('Employé supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      // Get existing user_ids in employes
      const { data: existing } = await supabase.from('employes').select('user_id');
      const existingUserIds = new Set((existing || []).map(e => e.user_id).filter(Boolean));

      // Fetch agents with profiles
      const { data: agents } = await supabase
        .from('agents')
        .select('user_id, statut, profiles:user_id(prenom, nom, email, telephone)')
        .eq('statut', 'actif');

      // Fetch coursiers with profiles
      const { data: coursiers } = await supabase
        .from('coursiers')
        .select('user_id, statut, profiles:user_id(prenom, nom, email, telephone)')
        .eq('statut', 'actif');

      const toInsert: any[] = [];

      for (const agent of agents || []) {
        if (existingUserIds.has(agent.user_id)) continue;
        const p = agent.profiles as any;
        if (!p) continue;
        toInsert.push({
          user_id: agent.user_id,
          prenom: p.prenom || '',
          nom: p.nom || '',
          email: p.email || null,
          telephone: p.telephone || null,
          poste: 'Agent immobilier',
          type_contrat: 'fixe',
          statut: 'actif',
          salaire_mensuel: 0,
          taux_activite: 100,
        });
      }

      for (const coursier of coursiers || []) {
        if (existingUserIds.has(coursier.user_id)) continue;
        const p = coursier.profiles as any;
        if (!p) continue;
        toInsert.push({
          user_id: coursier.user_id,
          prenom: p.prenom || '',
          nom: p.nom || '',
          email: p.email || null,
          telephone: p.telephone || null,
          poste: 'Coursier',
          type_contrat: 'horaire',
          statut: 'actif',
          salaire_mensuel: 0,
          taux_activite: 100,
        });
      }

      if (toInsert.length === 0) return 0;

      const { error } = await supabase.from('employes').insert(toInsert);
      if (error) throw error;
      return toInsert.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['employes'] });
      if (count === 0) {
        toast.info('Tous les agents et coursiers sont déjà importés');
      } else {
        toast.success(`${count} employé(s) importé(s) avec succès`);
      }
    },
    onError: (e) => toast.error('Erreur: ' + (e as Error).message),
  });

  const getTypeBadge = (emp: Employe) => {
    if (!emp.user_id) return null;
    if (coursierUserIds.includes(emp.user_id)) {
      return <DashBadge tone="neutral">Coursier</DashBadge>;
    }
    if (agentUserIds.includes(emp.user_id)) {
      return <DashBadge tone="primary">Agent</DashBadge>;
    }
    return null;
  };

  const handleEdit = (emp: Employe) => {
    setEditingEmploye(emp);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingEmploye(null);
    setDialogOpen(true);
  };

  const actifs = employes.filter((e) => e.statut === 'actif');
  const masseMensuelle = actifs.reduce((s, e) => s + (e.salaire_mensuel || 0), 0);

  const statutBadge = (emp: Employe) => emp.statut === 'actif' ? (
    <DashBadge tone="success"><UserCheck className="mr-1 h-3 w-3" /> Actif</DashBadge>
  ) : (
    <DashBadge tone="muted"><UserX className="mr-1 h-3 w-3" /> Inactif</DashBadge>
  );

  const contratBadge = (emp: Employe) => (
    <DashBadge tone={emp.is_independant ? 'neutral' : 'muted'}>
      {emp.is_independant ? 'Indépendant' : emp.type_contrat === 'horaire' ? 'Horaire' : 'Fixe'}
    </DashBadge>
  );

  const permisBadge = (emp: Employe) => emp.type_permis ? (
    <DashBadge tone={['B', 'F', 'N', 'L'].includes(emp.type_permis) ? 'warning' : 'muted'}>{emp.type_permis}</DashBadge>
  ) : (
    <DashBadge tone="muted">CH</DashBadge>
  );

  const actions = (emp: Employe, compact = false) => (
    <div className={cn('flex gap-2', compact ? 'justify-end' : '')}>
      <Button
        variant="outline"
        className={cn('rounded-full', compact ? 'h-9 w-9 p-0' : 'h-11 flex-1')}
        onClick={() => handleEdit(emp)}
        aria-label="Modifier l'employé"
      >
        <Pencil className="h-4 w-4" />
        {!compact && <span className="ml-2">Modifier</span>}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            className={cn('shrink-0 rounded-full p-0 text-destructive hover:bg-destructive/10 hover:text-destructive', compact ? 'h-9 w-9' : 'h-11 w-11')}
            aria-label="Supprimer l'employé"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet employé ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera aussi toutes ses fiches de salaire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={() => deleteMutation.mutate(emp.id)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <section className="space-y-4" aria-label="Liste des employés">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Liste des employés</h2>
          {!isLoading && employes.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {actifs.length} actif{actifs.length > 1 ? 's' : ''} sur {employes.length} · masse salariale mensuelle {masseMensuelle.toLocaleString('fr-CH')} CHF
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex">
          <Button variant="outline" onClick={() => importMutation.mutate()} disabled={importMutation.isPending} className="h-11 gap-2 rounded-full md:h-10">
            <Download className="h-4 w-4" /> {importMutation.isPending ? 'Import...' : 'Importer agents & coursiers'}
          </Button>
          <Button onClick={handleNew} className="h-11 gap-2 rounded-full md:h-10">
            <Plus className="h-4 w-4" /> Ajouter un employé
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Chargement...</p>
      ) : employes.length === 0 ? (
        <DashEmptyState icon={Users} title="Aucun employé enregistré" description="Ajoutez un employé ou importez vos agents et coursiers." />
      ) : (
        <>
          {/* Mobile : une carte par employé */}
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {employes.map((emp) => (
              <article key={emp.id} className={cn(DASH_CARD, 'space-y-3 p-4')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-foreground">{emp.prenom} {emp.nom}</p>
                    <p className="truncate text-xs text-muted-foreground">{emp.poste || '-'}</p>
                  </div>
                  {statutBadge(emp)}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {getTypeBadge(emp)}
                  {emp.is_independant && <DashBadge tone="muted">Indépendant</DashBadge>}
                  {contratBadge(emp)}
                  {permisBadge(emp)}
                </div>
                <div className="flex items-baseline justify-between rounded-xl bg-muted/40 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Salaire · taux {emp.taux_activite}%</span>
                  <span className="font-mono text-sm font-semibold">{emp.salaire_mensuel?.toLocaleString('fr-CH')} CHF</span>
                </div>
                {actions(emp)}
              </article>
            ))}
          </div>

          {/* Tablette et PC : tableau */}
          <div className={cn(DASH_CARD, 'hidden overflow-hidden md:block')}>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Contrat</TableHead>
                    <TableHead>Permis</TableHead>
                    <TableHead className="text-right">Salaire</TableHead>
                    <TableHead>Taux</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employes.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {emp.prenom} {emp.nom}
                          {getTypeBadge(emp)}
                          {emp.is_independant && <DashBadge tone="muted">Indépendant</DashBadge>}
                        </div>
                      </TableCell>
                      <TableCell>{emp.poste || '-'}</TableCell>
                      <TableCell>{contratBadge(emp)}</TableCell>
                      <TableCell>{permisBadge(emp)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono">
                        {emp.salaire_mensuel?.toLocaleString('fr-CH')} CHF
                      </TableCell>
                      <TableCell>{emp.taux_activite}%</TableCell>
                      <TableCell>{statutBadge(emp)}</TableCell>
                      <TableCell className="text-right">{actions(emp, true)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      <EmployeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employe={editingEmploye}
      />
    </section>
  );
}
