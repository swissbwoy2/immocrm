import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  warrantiesNotApplicable: boolean;
}

export function RenovationCloseProjectDialog({ open, onClose, projectId, warrantiesNotApplicable }: Props) {
  const queryClient = useQueryClient();
  const [wna, setWna] = useState(warrantiesNotApplicable);

  const toggleWna = useMutation({
    mutationFn: async (value: boolean) => {
      const { error } = await supabase
        .from('renovation_projects')
        .update({ warranties_not_applicable: value })
        .eq('id', projectId);
      if (error) throw error;

      // Audit log via insert
      await supabase.from('renovation_audit_logs').insert({
        project_id: projectId,
        action: 'warranties_not_applicable',
        target_table: 'renovation_projects',
        target_id: projectId,
        new_data: { warranties_not_applicable: value },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renovation-project', projectId] });
    },
  });

  const closeProject = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('renovation-close-project', {
        body: { projectId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.closed) {
        toast.success('Projet clôturé avec succès');
        queryClient.invalidateQueries({ queryKey: ['renovation-project', projectId] });
        onClose();
      } else {
        toast.error('Clôture impossible', {
          description: (data.blockingReasons || []).join('\n'),
          duration: 8000,
        });
      }
    },
    onError: (e: Error) => {
      try {
        const parsed = JSON.parse(e.message);
        if (parsed.blockingReasons) {
          toast.error('Clôture impossible', {
            description: parsed.blockingReasons.join('\n'),
            duration: 8000,
          });
          return;
        }
      } catch { /* not json */ }
      toast.error(e.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Clôturer le projet
          </DialogTitle>
          <DialogDescription>
            La clôture vérifie automatiquement que tous les critères sont remplis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 border rounded-md p-3 text-sm space-y-1">
            <p className="font-medium">Critères vérifiés :</p>
            <ul className="list-disc pl-4 text-muted-foreground text-xs space-y-0.5">
              <li>Aucun incident critique non résolu</li>
              <li>Aucune réserve bloquante non levée</li>
              <li>Tous les jalons terminés ou annulés</li>
              <li>Au moins une ligne budgétaire</li>
              <li>Au moins une garantie (ou garanties marquées N/A)</li>
            </ul>
          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <div className="space-y-0.5">
              <Label>Garanties non applicables</Label>
              <p className="text-xs text-muted-foreground">Dispense de garantie pour ce projet</p>
            </div>
            <Switch
              checked={wna}
              onCheckedChange={(v) => {
                setWna(v);
                toggleWna.mutate(v);
              }}
            />
          </div>

          <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Cette action est irréversible. Le projet passera en statut «Clôturé».</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => closeProject.mutate()} disabled={closeProject.isPending}>
            {closeProject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Clôturer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
