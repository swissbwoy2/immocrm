import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, Clock, Play } from 'lucide-react';
import { useRenovationProject } from '../hooks/useRenovationProject';
import { updateRenovationProgress } from '../api/progress';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  projectId: string;
  canManage: boolean;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
];

export function RenovationMilestoneEditor({ projectId, canManage }: Props) {
  const { milestones } = useRenovationProject(projectId);
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatusChange = async (milestoneId: string, newStatus: string) => {
    setUpdating(milestoneId);
    try {
      await updateRenovationProgress({
        projectId,
        milestoneId,
        status: newStatus,
      });
      queryClient.invalidateQueries({ queryKey: ['renovation-milestones', projectId] });
      toast.success('Jalon mis à jour');
    } catch (err: any) {
      toast.error(err.message);
    }
    setUpdating(null);
  };

  if (milestones.isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin mx-auto" />;
  }

  const list = milestones.data || [];
  const completedCount = list.filter(m => m.status === 'completed').length;
  const progressPct = list.length > 0 ? Math.round((completedCount / list.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Planning — Jalons</CardTitle>
          <Badge variant="outline">{progressPct}% ({completedCount}/{list.length})</Badge>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {list.map(m => {
            const isUpdating = updating === m.id;
            return (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50">
                {m.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : m.status === 'in_progress' ? (
                  <Play className="h-5 w-5 text-blue-600 flex-shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.title}</p>
                  {m.planned_date && (
                    <p className="text-xs text-muted-foreground">
                      Prévu: {new Date(m.planned_date).toLocaleDateString('fr-CH')}
                      {m.actual_date && (
                        <span className="ml-2">
                          Réel: {new Date(m.actual_date).toLocaleDateString('fr-CH')}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                {canManage ? (
                  <div className="flex items-center gap-2">
                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Select
                      value={m.status}
                      onValueChange={(v) => handleStatusChange(m.id, v)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Badge variant={m.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                    {STATUS_OPTIONS.find(o => o.value === m.status)?.label || m.status}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
