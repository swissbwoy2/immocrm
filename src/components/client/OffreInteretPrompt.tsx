import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, CalendarCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInteretState } from '@/lib/offreInteret';

interface OffreInteretPromptProps {
  offre: any;
  /** Visites liées à cette offre (pour afficher une date proposée) */
  visites?: any[];
  onRespond: (statut: 'interesse' | 'refusee') => Promise<void> | void;
}

function formatDateVisite(d: string) {
  try {
    return new Date(d).toLocaleString('fr-CH', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zurich',
    });
  } catch {
    return d;
  }
}

/**
 * Bloc proéminent : « Cette offre vous intéresse-t-elle ? »
 * Tant que le client n'a pas répondu, aucune visite n'est organisée.
 */
export function OffreInteretPrompt({ offre, visites = [], onRespond }: OffreInteretPromptProps) {
  const [saving, setSaving] = useState<null | 'interesse' | 'refusee'>(null);
  const state = getInteretState(offre?.statut);

  const related = (visites || []).filter((v) => v.offre_id === offre?.id);
  const upcoming = related
    .filter((v) => v.date_visite && new Date(v.date_visite).getTime() >= Date.now() && v.statut !== 'annulee')
    .sort((a, b) => new Date(a.date_visite).getTime() - new Date(b.date_visite).getTime())[0];

  const handle = async (statut: 'interesse' | 'refusee') => {
    if (saving) return;
    setSaving(statut);
    try {
      await onRespond(statut);
    } finally {
      setSaving(null);
    }
  };

  const isPending = state.key === 'attente';
  const isRefused = state.key === 'refuse';

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 mb-5',
        isPending && 'border-amber-500/40 bg-amber-500/5',
        !isPending && !isRefused && 'border-emerald-500/40 bg-emerald-500/5',
        isRefused && 'border-red-500/40 bg-red-500/5'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <h4 className="text-base font-bold">
          {isPending ? 'Cette offre vous intéresse-t-elle ?' : 'Votre réponse'}
        </h4>
        <Badge variant="outline" className={cn('text-xs', state.className)}>
          {isPending ? 'En attente de votre réponse' : state.label}
        </Badge>
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground mb-3">
          Aucune visite ne sera organisée tant que vous n'avez pas confirmé votre intérêt.
        </p>
      )}

      {upcoming && (
        <div className="flex items-start gap-2 text-sm mb-3 p-2.5 rounded-xl bg-background/70 border border-border/50">
          <CalendarCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div>
            <div className="font-medium">Date de visite proposée : {formatDateVisite(upcoming.date_visite)}</div>
            {isPending && (
              <div className="text-muted-foreground">Confirmez-vous vouloir visiter ce bien ?</div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {state.key !== 'interesse' && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-primary-foreground"
            disabled={!!saving}
            onClick={() => handle('interesse')}
          >
            {saving === 'interesse' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            ✅ Oui, je veux la visiter
          </Button>
        )}
        {!isRefused && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/40 text-red-700 hover:bg-red-500/10"
            disabled={!!saving}
            onClick={() => handle('refusee')}
          >
            {saving === 'refusee' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            ❌ Non, pas intéressé
          </Button>
        )}
        {!isPending && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground self-center">
            <Clock className="h-3.5 w-3.5" /> Vous pouvez modifier votre choix à tout moment.
          </span>
        )}
      </div>
    </div>
  );
}
