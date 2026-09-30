import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CalendarCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function useAnnonceCreneaux(annonceId?: string) {
  return useQuery({
    queryKey: ['annonce-creneaux-public', annonceId],
    enabled: !!annonceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonce_creneaux')
        .select('id, date_heure')
        .eq('annonce_id', annonceId!)
        .eq('actif', true)
        .gt('date_heure', new Date().toISOString())
        .order('date_heure', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export const formatCreneau = (iso: string) =>
  new Date(iso)
    .toLocaleString('fr-CH', {
      timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })
    .replace(':', 'h');

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  annonce: { id: string; titre: string };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ReserverVisiteDialog({ open, onOpenChange, annonce }: Props) {
  const { data: creneaux = [], isLoading } = useAnnonceCreneaux(annonce.id);
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '' });
  const [creneauId, setCreneauId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom.trim() || !form.nom.trim() || !form.telephone.trim()) return toast.error('Veuillez remplir tous les champs');
    if (!EMAIL_RE.test(form.email.trim())) return toast.error('Adresse e-mail invalide');
    if (!creneauId) return toast.error('Choisissez un créneau');
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('inscription-candidat-visite', {
        body: { annonce_id: annonce.id, creneau_id: creneauId, ...form },
      });
      let payload: any = data;
      if (error) {
        try { payload = await (error as any).context?.json(); } catch { payload = null; }
      }
      if (!payload?.ok) {
        toast.error(payload?.error || 'Réservation impossible, réessayez');
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(() => { setDone(false); setCreneauId(null); }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" />Réserver une visite</DialogTitle>
          <DialogDescription>{annonce.titre}</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="text-lg font-semibold text-foreground">Votre visite est réservée</p>
            <p className="text-sm text-muted-foreground">Vérifiez votre e-mail pour vos identifiants et la confirmation.</p>
            <Button className="mt-2" onClick={() => close(false)}>Fermer</Button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : creneaux.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Aucun créneau de visite disponible pour le moment.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Choisissez un créneau *</Label>
              <div className="grid gap-2">
                {creneaux.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCreneauId(c.id)}
                    className={cn(
                      'min-h-[44px] rounded-lg border px-4 py-2 text-left text-sm capitalize transition-colors',
                      creneauId === c.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted',
                    )}
                  >
                    {formatCreneau(c.date_heure)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="rv-prenom">Prénom *</Label><Input id="rv-prenom" maxLength={80} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="rv-nom">Nom *</Label><Input id="rv-nom" maxLength={80} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label htmlFor="rv-email">E-mail *</Label><Input id="rv-email" type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="rv-tel">Téléphone *</Label><Input id="rv-tel" type="tel" maxLength={30} placeholder="+41 XX XXX XX XX" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Un espace candidat sera créé avec cet e-mail ; vos identifiants vous seront envoyés par e-mail.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => close(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCheck className="mr-2 h-4 w-4" />}Réserver
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
