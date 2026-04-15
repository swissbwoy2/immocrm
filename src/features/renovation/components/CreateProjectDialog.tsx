import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createRenovationProject } from '../api/createProject';
import { RenovationPriority } from '../types/renovation';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [immeubleId, setImmeubleId] = useState('');
  const [priority, setPriority] = useState<RenovationPriority>('medium');
  const [budgetEstimated, setBudgetEstimated] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();

  const { data: immeubles } = useQuery({
    queryKey: ['immeubles-for-renovation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('immeubles')
        .select('id, nom, adresse')
        .order('nom');
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: () => createRenovationProject({
      immeuble_id: immeubleId,
      title,
      description: description || undefined,
      priority,
      budget_estimated: budgetEstimated ? parseFloat(budgetEstimated) : undefined,
      start_date_planned: startDate || undefined,
      end_date_planned: endDate || undefined,
    }),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['renovation-projects'] });
      toast.success('Projet créé avec succès');
      setOpen(false);
      resetForm();
      const basePath = userRole === 'admin' ? '/admin' : '/agent';
      navigate(`${basePath}/renovation/${projectId}`);
    },
    onError: (err: Error) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImmeubleId('');
    setPriority('medium');
    setBudgetEstimated('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau projet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouveau projet de rénovation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Immeuble *</Label>
            <Select value={immeubleId} onValueChange={setImmeubleId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un immeuble" />
              </SelectTrigger>
              <SelectContent>
                {immeubles?.map(imm => (
                  <SelectItem key={imm.id} value={imm.id}>
                    {imm.nom || imm.adresse}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Titre du projet *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Rénovation toiture" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description du projet..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={v => setPriority(v as RenovationPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget estimé (CHF)</Label>
              <Input type="number" value={budgetEstimated} onChange={e => setBudgetEstimated(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date début prévue</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date fin prévue</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!title || !immeubleId || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Créer le projet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
