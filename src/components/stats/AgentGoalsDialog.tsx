import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Target, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';

interface AgentGoal {
  id: string;
  agent_id: string;
  title: string;
  goal_type: string;
  target_value: number;
  period: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

interface AgentGoalsDialogProps {
  agentId: string;
  agentName: string;
  trigger?: React.ReactNode;
}

const goalTypeLabels: Record<string, string> = {
  offres: 'Offres envoyées',
  transactions: 'Affaires conclues',
  commissions: 'Commissions (CHF)',
  clients: 'Nouveaux clients',
  visites: 'Visites effectuées',
  candidatures: 'Candidatures',
};

const periodLabels: Record<string, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
};

const goalTypeIcons: Record<string, string> = {
  offres: '📨',
  transactions: '🏆',
  commissions: '💰',
  clients: '👥',
  visites: '🏠',
  candidatures: '📋',
};

export function AgentGoalsDialog({ agentId, agentName, trigger }: AgentGoalsDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<AgentGoal | null>(null);
  const [newGoal, setNewGoal] = useState<Partial<AgentGoal>>({
    goal_type: 'offres',
    period: 'monthly',
    target_value: 10,
    is_active: true,
    title: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['agent-goals', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_goals')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AgentGoal[];
    },
    enabled: open,
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goal: Partial<AgentGoal>) => {
      const { error } = await supabase.from('agent_goals').insert({
        agent_id: agentId,
        title: goal.title || goalTypeLabels[goal.goal_type || 'offres'],
        goal_type: goal.goal_type,
        target_value: goal.target_value,
        period: goal.period,
        is_active: goal.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-goals', agentId] });
      toast.success('Objectif créé');
      setIsAdding(false);
      setNewGoal({
        goal_type: 'offres',
        period: 'monthly',
        target_value: 10,
        is_active: true,
        title: '',
      });
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (goal: AgentGoal) => {
      const { error } = await supabase
        .from('agent_goals')
        .update({
          title: goal.title,
          goal_type: goal.goal_type,
          target_value: goal.target_value,
          period: goal.period,
          is_active: goal.is_active,
        })
        .eq('id', goal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-goals', agentId] });
      toast.success('Objectif mis à jour');
      setEditingGoal(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from('agent_goals').delete().eq('id', goalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-goals', agentId] });
      toast.success('Objectif supprimé');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const handleCreateGoal = () => {
    if (!newGoal.goal_type || !newGoal.period || !newGoal.target_value) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    createGoalMutation.mutate(newGoal);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Target className="h-4 w-4 mr-2" />
            Objectifs
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objectifs de {agentName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new goal form */}
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
                          <SelectItem key={value} value={value}>
                            {goalTypeIcons[value]} {label}
                          </SelectItem>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Titre personnalisé</Label>
                    <Input
                      value={newGoal.title || ''}
                      onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                      placeholder={goalTypeLabels[newGoal.goal_type || 'offres']}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Objectif cible</Label>
                    <Input
                      type="number"
                      value={newGoal.target_value || 0}
                      onChange={(e) => setNewGoal({ ...newGoal, target_value: Number(e.target.value) })}
                      min={1}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                    <X className="h-4 w-4 mr-1" />
                    Annuler
                  </Button>
                  <Button size="sm" onClick={handleCreateGoal} disabled={createGoalMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    Créer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setIsAdding(true)} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un objectif
            </Button>
          )}

          {/* Existing goals list */}
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Chargement...</div>
          ) : goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Aucun objectif défini pour cet agent</p>
              <p className="text-sm">Ajoutez des objectifs pour le motiver !</p>
            </div>
          ) : (
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
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Titre</Label>
                            <Input
                              className="h-8"
                              value={editingGoal.title}
                              onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Cible</Label>
                            <Input
                              className="h-8"
                              type="number"
                              value={editingGoal.target_value}
                              onChange={(e) => setEditingGoal({ ...editingGoal, target_value: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editingGoal.is_active}
                              onCheckedChange={(v) => setEditingGoal({ ...editingGoal, is_active: v })}
                            />
                            <Label className="text-xs">Actif</Label>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingGoal(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => updateGoalMutation.mutate(editingGoal)}>
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{goalTypeIcons[goal.goal_type]}</span>
                          <div>
                            <p className="font-medium">{goal.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {goal.target_value.toLocaleString()} {goal.goal_type === 'commissions' ? 'CHF' : ''} / {periodLabels[goal.period]}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setEditingGoal(goal)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Supprimer cet objectif ?')) {
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
