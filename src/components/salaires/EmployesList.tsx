import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
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

  const handleEdit = (emp: Employe) => {
    setEditingEmploye(emp);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingEmploye(null);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Liste des employés</CardTitle>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter un employé
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center">Chargement...</p>
        ) : employes.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">Aucun employé enregistré</p>
        ) : (
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
                  <TableCell className="font-medium">{emp.prenom} {emp.nom}</TableCell>
                  <TableCell>{emp.poste || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={emp.is_independant ? 'outline' : 'secondary'}>
                      {emp.is_independant ? 'Indépendant' : emp.type_contrat === 'horaire' ? 'Horaire' : 'Fixe'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {emp.type_permis ? (
                      <Badge variant={['B', 'F', 'N', 'L'].includes(emp.type_permis) ? 'destructive' : 'secondary'}>
                        {emp.type_permis}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">CH</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {emp.salaire_mensuel?.toLocaleString('fr-CH')} CHF
                  </TableCell>
                  <TableCell>{emp.taux_activite}%</TableCell>
                  <TableCell>
                    {emp.statut === 'actif' ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                        <UserCheck className="h-3 w-3" /> Actif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <UserX className="h-3 w-3" /> Inactif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
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
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(emp.id)}>
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <EmployeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employe={editingEmploye}
      />
    </Card>
  );
}
