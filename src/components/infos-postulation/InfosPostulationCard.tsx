import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InfosPostulationFields } from './InfosPostulationFields';
import {
  INFOS_POSTULATION_VIDES, infosDepuisClient, infosManquantes, infosVersColonnes, libelleParking, libelleStatutLogement,
  type InfosPostulation,
} from '@/lib/infosPostulation';

const COLONNES = 'rc_menage, rc_compagnie, parking_souhaite, nombre_enfants, enfants_ages, statut_logement_actuel, mobile_suivi_autorise, infos_postulation_completees_at';

/**
 * Fiche client (admin / agent) : « Infos de postulation » lues par les routines de candidature.
 * Affiche les valeurs, ce qui manque, et permet de les corriger. Masquée si la migration n'est pas en base.
 */
export function InfosPostulationCard({ clientId }: { clientId: string }) {
  const [infos, setInfos] = useState<InfosPostulation | null>(null);
  const [completeLe, setCompleteLe] = useState<string | null>(null);
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState<InfosPostulation>(INFOS_POSTULATION_VIDES);
  const [saving, setSaving] = useState(false);

  const charger = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colonnes ajoutées par la migration 20261029150000
    const { data, error } = await (supabase.from('clients') as any).select(COLONNES).eq('id', clientId).maybeSingle();
    if (error || !data) { setInfos(null); return; }
    setInfos(infosDepuisClient(data));
    setCompleteLe(data.infos_postulation_completees_at ?? null);
  }, [clientId]);

  useEffect(() => { void charger(); }, [charger]);

  if (!infos) return null;
  const manquantes = infosManquantes(infos);

  const enregistrer = async () => {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colonnes ajoutées par la migration 20261029150000
    const { error } = await (supabase.from('clients') as any).update(infosVersColonnes(brouillon)).eq('id', clientId);
    setSaving(false);
    if (error) { toast.error('Enregistrement impossible'); return; }
    toast.success('Infos de postulation enregistrées');
    setEdition(false);
    void charger();
  };

  const ligne = (label: string, valeur: string) => (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-right font-medium', valeur === '—' ? 'text-destructive' : 'text-foreground')}>{valeur}</span>
    </div>
  );
  const ouiNon = (v: '' | 'oui' | 'non') => (v === 'oui' ? 'Oui' : v === 'non' ? 'Non' : '—');

  return (
    <section aria-labelledby={'ip-' + clientId} className={cn(DASH_CARD, 'p-4 md:p-5')}>
      <header className="flex flex-wrap items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 id={'ip-' + clientId} className="flex-1 text-base font-semibold text-foreground">Infos de postulation</h3>
        <DashBadge tone={manquantes.length ? 'warning' : 'success'}>
          {manquantes.length ? manquantes.length + ' manquante(s)' : 'Complètes'}
        </DashBadge>
        {!edition && (
          <Button size="sm" variant="outline" onClick={() => { setBrouillon(infos); setEdition(true); }}>
            <Pencil className="mr-1.5 h-4 w-4" /> Modifier
          </Button>
        )}
      </header>

      {edition ? (
        <div className="mt-4 space-y-4">
          <InfosPostulationFields idPrefix={'card-ip-' + clientId} value={brouillon} onChange={(p) => setBrouillon((prev) => ({ ...prev, ...p }))} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEdition(false)} disabled={saving}>Annuler</Button>
            <Button onClick={() => void enregistrer()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 divide-y divide-border/60">
          {ligne('Assurance RC ménage', infos.rc_menage === 'oui' ? 'Oui' + (infos.rc_compagnie ? ' — ' + infos.rc_compagnie : ' — compagnie ?') : ouiNon(infos.rc_menage))}
          {ligne('Parking souhaité', infos.parking_souhaite ? libelleParking(infos.parking_souhaite) : '—')}
          {ligne('Enfants', infos.nombre_enfants == null ? '—' : String(infos.nombre_enfants) + (infos.enfants_ages ? ' (' + infos.enfants_ages + ')' : ''))}
          {ligne('Statut du logement actuel', infos.statut_logement_actuel ? libelleStatutLogement(infos.statut_logement_actuel) : '—')}
          {ligne('Mobile de suivi autorisé', ouiNon(infos.mobile_suivi_autorise))}
          {manquantes.length > 0 && <p className="pt-2 text-xs text-destructive">Manquant : {manquantes.join(', ')}</p>}
          {completeLe && <p className="pt-2 text-xs text-muted-foreground">Complétées le {new Date(completeLe).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich' })}</p>}
        </div>
      )}
    </section>
  );
}
