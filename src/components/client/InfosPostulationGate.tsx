import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { InfosCoCandidatFields, InfosPostulationFields } from '@/components/infos-postulation/InfosPostulationFields';
import {
  INFOS_POSTULATION_VIDES, coCandidatConcerne, coCandidatDepuisLigne, coCandidatVersColonnes, echeancePour,
  infosCoCandidatManquantes, infosDepuisClient, infosManquantes, infosVersColonnes,
  type InfosCoCandidat, type InfosPostulation,
} from '@/lib/infosPostulation';

const COLONNES = 'id, created_at, statut, type_recherche, type_bien, rc_menage, rc_compagnie, parking_souhaite, nombre_enfants, enfants_ages, statut_logement_actuel, mobile_suivi_autorise';
const COLONNES_CO = 'id, prenom, nom, type, rc_menage, rc_compagnie, statut_logement_actuel, mobile_suivi_autorise';
const CLE_REPORT = 'infos-postulation-reporte';

type CoCandidat = { id: string; nom: string; infos: InfosCoCandidat };

function formatEcheance(d: Date): string {
  return d.toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

/**
 * Dialogue obligatoire pour les clients en recherche de location : assurance RC, parking, enfants,
 * statut du logement actuel et mobile de suivi, exigés par les demandes de location des gérances,
 * pour le client ET pour chaque co-candidat qui habitera le logement (pas les garants).
 * Avant l'échéance (lundi 2.11.2026 10h00, ou 24 h ouvrables après l'inscription) le client peut
 * reporter une fois par session ; après l'échéance le dialogue ne se ferme plus tant que ce n'est pas complet.
 * Sans les colonnes en base, le composant ne s'affiche pas.
 */
export function InfosPostulationGate() {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [echeance, setEcheance] = useState<Date | null>(null);
  const [infos, setInfos] = useState<InfosPostulation>(INFOS_POSTULATION_VIDES);
  const [clientComplet, setClientComplet] = useState(true);
  const [coCandidats, setCoCandidats] = useState<CoCandidat[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [saving, setSaving] = useState(false);

  const charger = useCallback(async () => {
    if (!user) { setOuvert(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colonnes ajoutées par les migrations du 29-30.10.2026
    const db = supabase as any;
    const { data, error } = await db.from('clients').select(COLONNES).eq('user_id', user.id).maybeSingle();
    if (error || !data) { setOuvert(false); return; }
    const location = (data.type_recherche ?? 'Louer') !== 'Acheter' && !String(data.type_bien ?? '').toLowerCase().includes('commercial');
    if (!location || !['actif', 'en_attente'].includes(data.statut ?? '')) { setOuvert(false); return; }
    const valeurs = infosDepuisClient(data);
    const completClient = infosManquantes(valeurs).length === 0;

    const { data: cc } = await db.from('client_candidates').select(COLONNES_CO).eq('client_id', data.id);
    const aCompleter: CoCandidat[] = ((cc ?? []) as Record<string, unknown>[])
      .filter((k) => coCandidatConcerne(String(k.type ?? '')))
      .map((k) => ({ id: String(k.id), nom: (String(k.prenom ?? '') + ' ' + String(k.nom ?? '')).trim() || 'Co-candidat', infos: coCandidatDepuisLigne(k) }))
      .filter((k) => infosCoCandidatManquantes(k.infos).length > 0);

    if (completClient && aCompleter.length === 0) { setOuvert(false); return; }
    const ech = echeancePour(data.created_at);
    setClientId(data.id);
    setEcheance(ech);
    setInfos(valeurs);
    setClientComplet(completClient);
    setCoCandidats(aCompleter);
    let reporte = false;
    try { reporte = sessionStorage.getItem(CLE_REPORT) === '1'; } catch { /* stockage indisponible */ }
    setOuvert(Date.now() >= ech.getTime() || !reporte);
  }, [user]);

  useEffect(() => { void charger(); }, [charger]);

  const echu = !!echeance && Date.now() >= echeance.getTime();
  const manquantes = [
    ...(clientComplet ? [] : infosManquantes(infos)),
    ...coCandidats.flatMap((k) => infosCoCandidatManquantes(k.infos).map((m) => k.nom + ' : ' + m)),
  ];

  const reporter = () => {
    if (echu) return;
    try { sessionStorage.setItem(CLE_REPORT, '1'); } catch { /* stockage indisponible */ }
    setOuvert(false);
  };

  const enregistrer = async () => {
    if (!clientId || saving) return;
    if (manquantes.length > 0) { toast.error('Il manque : ' + manquantes.join(', ')); return; }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colonnes ajoutées par les migrations du 29-30.10.2026
    const db = supabase as any;
    let erreur = false;
    if (!clientComplet) {
      const { error } = await db.from('clients').update(infosVersColonnes(infos)).eq('id', clientId);
      if (error) erreur = true;
    }
    for (const k of coCandidats) {
      const { error } = await db.from('client_candidates').update(coCandidatVersColonnes(k.infos)).eq('id', k.id);
      if (error) erreur = true;
    }
    setSaving(false);
    if (erreur) { toast.error('Enregistrement impossible, réessayez dans un instant'); return; }
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

        {!clientComplet && (
          <InfosPostulationFields idPrefix="gate-ip" value={infos} onChange={(patch) => setInfos((prev) => ({ ...prev, ...patch }))} />
        )}

        {coCandidats.map((k, i) => (
          <div key={k.id} className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground">{k.nom} (personne qui habitera avec vous)</p>
            <InfosCoCandidatFields
              idPrefix={'gate-cc-' + i}
              value={k.infos}
              onChange={(patch) => setCoCandidats((prev) => prev.map((x) => (x.id === k.id ? { ...x, infos: { ...x.infos, ...patch } } : x)))}
            />
          </div>
        ))}

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
