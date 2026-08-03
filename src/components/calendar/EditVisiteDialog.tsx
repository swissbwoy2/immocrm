import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SWISS_TZ = 'Europe/Zurich';

const STATUT_OPTIONS = [
  { value: 'proposee', label: 'Créneau proposé' },
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'effectuee', label: 'Effectuée' },
  { value: 'annulee', label: 'Annulée' },
  { value: 'refusee', label: 'Refusée' },
];

/** ISO (UTC) -> "yyyy-MM-dd'T'HH:mm" en heure locale suisse */
function isoToSwissInput(iso?: string | null): string {
  if (!iso) return '';
  try {
    return format(toZonedTime(new Date(iso), SWISS_TZ), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

/** "yyyy-MM-dd'T'HH:mm" (heure suisse) -> ISO UTC */
function swissInputToIso(value: string): string | null {
  if (!value) return null;
  try {
    return fromZonedTime(value, SWISS_TZ).toISOString();
  } catch {
    return null;
  }
}

interface EditVisiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Visite de référence (première du groupe) */
  visite: any | null;
  /** Toutes les visites de la même visite physique (même adresse + même date) */
  visitesGroup?: any[];
  onSaved?: () => void;
}

export function EditVisiteDialog({
  open,
  onOpenChange,
  visite,
  visitesGroup,
  onSaved,
}: EditVisiteDialogProps) {
  const [adresse, setAdresse] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [statut, setStatut] = useState('planifiee');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !visite) return;
    setAdresse(visite.adresse || '');
    setDateDebut(isoToSwissInput(visite.date_visite));
    setDateFin(isoToSwissInput(visite.date_visite_fin));
    setStatut(visite.statut || 'planifiee');
    setNotes(visite.notes || '');
  }, [open, visite]);

  const handleSave = async () => {
    if (!visite) return;
    if (!adresse.trim()) {
      toast.error("L'adresse est obligatoire");
      return;
    }
    const isoDebut = swissInputToIso(dateDebut);
    if (!isoDebut) {
      toast.error('La date et l’heure de visite sont obligatoires');
      return;
    }
    const isoFin = swissInputToIso(dateFin);
    if (isoFin && new Date(isoFin) <= new Date(isoDebut)) {
      toast.error("L'heure de fin doit être après l'heure de début");
      return;
    }

    const ids = (visitesGroup && visitesGroup.length > 0 ? visitesGroup : [visite])
      .map((v: any) => v.id)
      .filter(Boolean);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('visites')
        .update({
          adresse: adresse.trim(),
          date_visite: isoDebut,
          date_visite_fin: isoFin,
          statut,
          notes: notes.trim() || null,
        })
        .in('id', ids);

      if (error) throw error;

      toast.success(
        ids.length > 1 ? `${ids.length} visites mises à jour` : 'Visite mise à jour',
      );
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      console.error('Erreur mise à jour visite:', e);
      toast.error(e?.message || 'Erreur lors de la mise à jour de la visite');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Modifier la visite
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visite-adresse">Adresse</Label>
            <Input
              id="visite-adresse"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="Rue, NPA, ville"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="visite-debut">Début (heure suisse)</Label>
              <Input
                id="visite-debut"
                type="datetime-local"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visite-fin">Fin (optionnel)</Label>
              <Input
                id="visite-fin"
                type="datetime-local"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visite-notes">Note / description</Label>
            <Textarea
              id="visite-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Informations pratiques, étage, code d'entrée…"
            />
          </div>

          {visitesGroup && visitesGroup.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Ces modifications seront appliquées aux {visitesGroup.length} clients de cette visite.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
