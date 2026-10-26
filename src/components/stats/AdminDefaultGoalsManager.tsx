import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Plus, Trash2, Edit2, Save, X, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';

interface DefaultGoal {
  id: string;
  title: string;
  description: string;
  goal_type: string;
  target_min: number;
  target_max: number;
  period: string;
  is_active: boolean;
}

const goalTypeLabels: Record<string, string> = {
  offres: 'Offres envoyées',
  visites: 'Visites effectuées',
  candidatures: 'Candidatures déposées',
  transactions: 'Affaires conclues',
  commissions: 'Commissions (CHF)',
  clients: 'Nouveaux clients',
  offres_par_client: 'Offres par client',
  visites_par_client: 'Visites par client',
  dossiers_par_client: 'Dossiers par client',
};

const periodLabels: Record<string, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
};

export function AdminDefaultGoalsManager() {
  const [editingGoal, setEditingGoal] = useState<DefaultGoal | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<DefaultGoal>>({
    goal_type: 'offres',
    period: 'daily',
    target_min: 3,
    target_max: 5,
    is_active: true,
    title: '',
    description: '',
  });
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['default-agent-goals-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_agent_goals')
        .select('*')
        .order('created_at');
      
      if (error) throw error;
      return data as DefaultGoal[];
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goal: Partial<DefaultGoal>) => {
      const { error } = await supabase.from('default_agent_goals').insert({
        title: goal.title || goalTypeLabels[goal.goal_type || 'offres'],
        description: goal.description,
        goal_type: goal.goal_type,
        target_min: goal.target_min,
        target_max: goal.target_max,
        period: goal.period,
        is_active: goal.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-agent-goals-admin'] });
      queryClient.invalidateQueries({ queryKey: ['default-agent-goals'] });
      toast.success('Objectif par défaut créé');
      setIsAdding(false);
      setNewGoal({
        goal_type: 'offres',
        period: 'daily',
        target_min: 3,
        target_max: 5,
        is_active: true,
        title: '',
        description: '',
      });
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (goal: DefaultGoal) => {
      const { error } = await supabase
        .from('default_agent_goals')
        .update({
          title: goal.title,
          description: goal.description,
          goal_type: goal.goal_type,
          target_min: goal.target_min,
          target_max: goal.target_max,
          period: goal.period,
          is_active: goal.is_active,
        })
        .eq('id', goal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-agent-goals-admin'] });
      queryClient.invalidateQueries({ queryKey: ['default-agent-goals'] });
      toast.success('Objectif mis à jour');
      setEditingGoal(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from('default_agent_goals').delete().eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-agent-goals-admin'] });
      queryClient.invalidateQueries({ queryKey: ['default-agent-goals'] });
      toast.success('Objectif supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const toggleGoalActive = async (goal: DefaultGoal) => {
    const { error } = await supabase
      .from('default_agent_goals')
      .update({ is_active: !goal.is_active })
      .eq('id', goal.id);
    
    if (error) {
      toast.error('Erreur lors de la mise à jour');
    } else {
      queryClient.invalidateQueries({ queryKey: ['default-agent-goals-admin'] });
      queryClient.invalidateQueries({ queryKey: ['default-agent-goals'] });
      toast.success(`Objectif ${!goal.is_active ? 'activé' : 'désactivé'}`);
    }
  };

  if (isLoading) {
    return (
      <Card className="imr-lg-card min-w-0 rounded-[22px]">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-3 text-base font-semibold md:text-[17px]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Settings className="h-5 w-5" /></span>
            Objectifs par défaut des agents
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="imr-lg-card min-w-0 rounded-[22px]">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-3 text-base font-semibold md:text-[17px]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Target className="h-5 w-5" /></span>
          Objectifs par défaut des agents
        </CardTitle>
        <CardDescription className="text-sm">
          Définissez les objectifs journaliers/mensuels qui s'appliquent à tous les agents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 md:px-6 md:pb-6">
        {/* Add new goal */}
        {isAdding ? (
          <div className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type d'objectif</Label>
                <Select
                  value={newGoal.goal_type}
                  onValueChange={(v) => setNewGoal({ ...newGoal, goal_type: v, title: goalTypeLabels[v] })}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(goalTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Période</Label>
                <Select
                  value={newGoal.period}
                  onValueChange={(v) => setNewGoal({ ...newGoal, period: v })}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(periodLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label>Titre</Label>
                <Input
                  className="h-11 rounded-xl"
                  value={newGoal.title || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder={goalTypeLabels[newGoal.goal_type || 'offres']}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Objectif minimum</Label>
                <Input
                  className="h-11 rounded-xl"
                  type="number"
                  inputMode="numeric"
                  value={newGoal.target_min || 0}
                  onChange={(e) => setNewGoal({ ...newGoal, target_min: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Objectif maximum</Label>
                <Input
                  className="h-11 rounded-xl"
                  type="number"
                  inputMode="numeric"
                  value={newGoal.target_max || 0}
                  onChange={(e) => setNewGoal({ ...newGoal, target_max: Number(e.target.value) })}
                  min={1}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                className="h-11 rounded-xl"
                value={newGoal.description || ''}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Description de l'objectif"
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" className="min-h-11" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
              <Button className="min-h-11" onClick={() => createGoalMutation.mutate(newGoal)} disabled={createGoalMutation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                Créer
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsAdding(true)} variant="outline" className="min-h-11 w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un objectif par défaut
          </Button>
        )}

        {/* Goals list */}
        {goals.length > 0 && (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-background/50 dark:bg-white/[0.03]">
          {goals.map((goal) => (
            <li key={goal.id} className={`p-3 sm:p-4 ${!goal.is_active ? 'opacity-50' : ''}`}>
                {editingGoal?.id === goal.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <Select
                          value={editingGoal.goal_type}
                          onValueChange={(v) => setEditingGoal({ ...editingGoal, goal_type: v })}
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(goalTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Période</Label>
                        <Select
                          value={editingGoal.period}
                          onValueChange={(v) => setEditingGoal({ ...editingGoal, period: v })}
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(periodLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="col-span-2 space-y-1.5 sm:col-span-1">
                        <Label>Titre</Label>
                        <Input
                          className="h-11 rounded-xl"
                          value={editingGoal.title}
                          onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Min</Label>
                        <Input
                          className="h-11 rounded-xl"
                          type="number"
                          inputMode="numeric"
                          value={editingGoal.target_min}
                          onChange={(e) => setEditingGoal({ ...editingGoal, target_min: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Max</Label>
                        <Input
                          className="h-11 rounded-xl"
                          type="number"
                          inputMode="numeric"
                          value={editingGoal.target_max}
                          onChange={(e) => setEditingGoal({ ...editingGoal, target_max: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="min-h-11" onClick={() => setEditingGoal(null)} aria-label="Annuler la modification">
                        <X className="h-4 w-4 mr-1" /> Annuler
                      </Button>
                      <Button className="min-h-11" onClick={() => updateGoalMutation.mutate(editingGoal)} aria-label="Enregistrer l'objectif">
                        <Save className="h-4 w-4 mr-1" /> Enregistrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{goal.title}</p>
                        <DashBadge tone="muted">{periodLabels[goal.period]}</DashBadge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Objectif: {goal.target_min} - {goal.target_max} {goal.goal_type === 'commissions' ? 'CHF' : ''}
                      </p>
                      {goal.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <span className="flex h-11 items-center px-1">
                        <Switch
                          checked={goal.is_active}
                          onCheckedChange={() => toggleGoalActive(goal)}
                          aria-label={goal.is_active ? 'Désactiver l’objectif' : 'Activer l’objectif'}
                        />
                      </span>
                      <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setEditingGoal(goal)} aria-label="Modifier l'objectif">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11"
                        aria-label="Supprimer l'objectif"
                        onClick={() => {
                          if (confirm('Supprimer cet objectif par défaut ?')) {
                            deleteGoalMutation.mutate(goal.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
            </li>
          ))}
        </ul>
        )}
      </CardContent>
    </Card>
  );
}
