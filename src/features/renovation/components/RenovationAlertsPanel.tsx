import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const severityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  critical: 'destructive',
  warning: 'default',
  info: 'secondary',
};

interface Props {
  projectId: string;
  canManage: boolean;
}

export function RenovationAlertsPanel({ projectId, canManage }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ['renovation-alerts', projectId];

  const { data: alerts, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renovation_ai_alerts')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('renovation-generate-alerts', {
        body: { projectId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(`Alertes générées: ${data.created} créée(s), ${data.resolved} résolue(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const count = alerts?.length || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alertes
          {count > 0 && <Badge variant="destructive">{count}</Badge>}
        </CardTitle>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        )}
      </CardHeader>
      {count > 0 && (
        <CardContent className="pt-0 space-y-2">
          {(alerts || []).slice(0, 5).map((a) => (
            <div key={a.id} className="flex items-start gap-2 text-sm">
              <Badge variant={severityVariant[a.severity] || 'secondary'} className="mt-0.5 text-xs shrink-0">
                {a.severity}
              </Badge>
              <div className="min-w-0">
                <p className="font-medium truncate">{a.title}</p>
                {a.message && <p className="text-xs text-muted-foreground truncate">{a.message}</p>}
              </div>
            </div>
          ))}
          {count > 5 && (
            <p className="text-xs text-muted-foreground text-center">+ {count - 5} autres</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
