import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { InfosPostulationFields } from '@/components/infos-postulation/InfosPostulationFields';
import {
  INFOS_POSTULATION_VIDES, echeancePour, infosDepuisClient, infosManquantes, infosVersColonnes, type InfosPostulation,
} from '@/lib/infosPostulation';

const COLONNES = 'id, created_at, statut, type_recherche, type_bien, rc_menage, rc_compagnie, parking_souhaite, nombre_enfants, enfants_ages, statut_logement_actuel, mobile_suivi_autorise';
const CLE_REPORT = 'infos-postulation-reporte';

function formatEcheance(d: Date): string {
  return d.toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

/**
 * Dialogue obligatoire pour les clients en recherche de location : assurance RC, parking, enfants,
 * statut du logement actuel et mobile de suivi, exigés par les demandes de location des gérances.
 * Avant l'échéance (lundi 2.11.2026 10h00, ou 24 h ouvrables après l'inscription) le client peut
 * reporter une fois par session ; après l'échéance le dialogue ne se ferme plus tant que ce n'est pas complet.
 * Sans les colonnes en base (migration non appliquée), le composant ne s'affiche pas.
 */
export function InfosPostulationGate() {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [echeance, setEcheance] = useState<Date | null>(null);
  const [infos, setInfos] = useState<InfosPostulation>(INFOS_POSTULATION_VIDES);
  const [ouvert, setOuvert] = useState(false);
  const [saving, setSaving] = useState(false);

  const charger = useCallback(async () => {
    if (!user) { setOuvert(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colonnes ajoutées par la migration 20261029150000
    const { data, error } = await (supabase.from('clients') as any).select(COLONNES).eq('user_id', user.id).maybeSingle();
    if (error || !data) { setOuvert(false); return; }
    const location = (data.type_recherche ?? 'Louer') !== 'Acheter' && !String(data.type_bien ?? '').toLowerCase().includes('commercial');
    if (!location || !['actif', 'en_attente'].includes(data.statut ?? '')) { setOuvert(false); return; }
    const valeurs = infosDepuisClient(data);
    if (infosManquantes(valeurs).length === 0) { setOuvert(false); return; }
    const ech = echeancePour(data.created_at);
    setClientId(data.id);
    setEcheance(ech);
    setInfos(valeurs);
    let reporte = false;
    try { reporte = sessionStorage.getItem(CLE_REPORT) === '1'; } catch { /* stockage indisponible */ }
    setOuvert(Date.now() >= ech.getTime() || !reporte);
  }, [user]);

  useEffect(() => { void charger(); }, [charger]);

  const echu = !!echeance && Date.now() >= echeance.getTime();
  const manquantes = infosManquantes(infos);

  const reporter = () => {
    if (echu) return;
    try { sessionStorage.setItem(CLE_REPORT, '1'); } catch { /* stockage indisponible */ }
    setOuvert(false);
  };

  const enregistrer = async () => {
    if (!clientId || saving) return;
    if (manquantes.length > 0) { toast.error('Il manque : ' + manquantes.join(', ')); return; }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colonnes ajoutées par la migration 20261029150000
    const { error } = await (supabase.from('clients') as any).update(infosVersColonnes(infos)).eq('id', clientId);
    setSaving(false);
    if (error) { toast.error('Enregistrement impossible, réessayez dans un instant'); return; }
    toast.success('Merci, vos informations sont enregistrées');
    setOuvert(false);
  };

  if (!ouvert || !echeance) return null;

  return (
    <Dialog open={ouvert} onOpenChange={(v) => { if (!v) reporter(); }}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        onPointerDownOutside={(e) => { if (echu) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (echu) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" /> Informations obligatoires pour vos candidatures
          </DialogTitle>
          <DialogDescription>
            Les gérances exigent ces informations dans chaque demande de location. Sans elles, nous ne pouvons pas déposer votre dossier.
            {echu
              ? ' Le délai est dépassé : complétez-les maintenant pour que nous puissions continuer à postuler pour vous.'
              : ' À compléter au plus tard ' + formatEcheance(echeance) + '.'}
          </DialogDescription>
        </DialogHeader>

        <InfosPostulationFields idPrefix="gate-ip" value={infos} onChange={(patch) => setInfos((prev) => ({ ...prev, ...patch }))} />

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          {!echu && (
            <Button type="button" variant="ghost" onClick={reporter} disabled={saving}>Plus tard</Button>
          )}
          <Button type="button" onClick={() => void enregistrer()} disabled={saving} className="min-h-11">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
