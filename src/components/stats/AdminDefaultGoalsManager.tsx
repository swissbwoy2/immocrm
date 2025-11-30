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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Objectifs par défaut des agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Objectifs par défaut des agents
        </CardTitle>
        <CardDescription>
          Définissez les objectifs journaliers/mensuels qui s'appliquent à tous les agents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new goal */}
        {isAdding ? (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type d'objectif</Label>
                  <Select
                    value={newGoal.goal_type}
                    onValueChange={(v) => setNewGoal({ ...newGoal, goal_type: v, title: goalTypeLabels[v] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(goalTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Période</Label>
                  <Select
                    value={newGoal.period}
                    onValueChange={(v) => setNewGoal({ ...newGoal, period: v })}
                  >
                    <SelectTrigger>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input
                    value={newGoal.title || ''}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    placeholder={goalTypeLabels[newGoal.goal_type || 'offres']}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Objectif minimum</Label>
                  <Input
                    type="number"
                    value={newGoal.target_min || 0}
                    onChange={(e) => setNewGoal({ ...newGoal, target_min: Number(e.target.value) })}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Objectif maximum</Label>
                  <Input
                    type="number"
                    value={newGoal.target_max || 0}
                    onChange={(e) => setNewGoal({ ...newGoal, target_max: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newGoal.description || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Description de l'objectif"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Annuler
                </Button>
                <Button size="sm" onClick={() => createGoalMutation.mutate(newGoal)} disabled={createGoalMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  Créer
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un objectif par défaut
          </Button>
        )}

        {/* Goals list */}
        <div className="space-y-2">
          {goals.map((goal) => (
            <Card key={goal.id} className={!goal.is_active ? 'opacity-50' : ''}>
              <CardContent className="py-3">
                {editingGoal?.id === goal.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={editingGoal.goal_type}
                          onValueChange={(v) => setEditingGoal({ ...editingGoal, goal_type: v })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(goalTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Période</Label>
                        <Select
                          value={editingGoal.period}
                          onValueChange={(v) => setEditingGoal({ ...editingGoal, period: v })}
                        >
                          <SelectTrigger className="h-8">
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
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Titre</Label>
                        <Input
                          className="h-8"
                          value={editingGoal.title}
                          onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Min</Label>
                        <Input
                          className="h-8"
                          type="number"
                          value={editingGoal.target_min}
                          onChange={(e) => setEditingGoal({ ...editingGoal, target_min: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max</Label>
                        <Input
                          className="h-8"
                          type="number"
                          value={editingGoal.target_max}
                          onChange={(e) => setEditingGoal({ ...editingGoal, target_max: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingGoal(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => updateGoalMutation.mutate(editingGoal)}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{goal.title}</p>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{periodLabels[goal.period]}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Objectif: {goal.target_min} - {goal.target_max} {goal.goal_type === 'commissions' ? 'CHF' : ''}
                      </p>
                      {goal.description && (
                        <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={goal.is_active}
                        onCheckedChange={() => toggleGoalActive(goal)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => setEditingGoal(goal)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
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
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
