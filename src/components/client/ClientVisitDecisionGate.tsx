import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, MapPin, CalendarClock, Banknote, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { submitVisitVideoDecision } from '@/components/client/VisitVideoDecisionCard';
import { formatSwissDateTime } from '@/lib/dateUtils';
import { useClientParcours } from '@/hooks/useClientParcours';
import {
  confirmerVisiteFaiteAchat, renoncerApresVisiteAchat, souhaiteFaireOffreAchat, visiteNonFaiteAchat,
} from '@/lib/achatOffreActions';

const GATE_SINCE = '2026-09-04T00:00:00+02:00';

interface PendingVisite {
  id: string;
  offre_id: string | null;
  agent_id: string | null;
  adresse: string | null;
  date_visite: string | null;
  est_deleguee?: boolean | null;
  compte_rendu?: any;
  compte_rendu_at?: string | null;
  medias?: any;
  offres?: { adresse?: string | null; statut?: string | null; prix?: number | null } | null;
}

function firstSharedVideo(v: PendingVisite): string | null {
  const arr = Array.isArray(v.medias) ? v.medias : [];
  const vid = arr.find((m: any) => m && (m.shared_to_clients !== false) && (m.type === 'video' || (typeof m.mime === 'string' && m.mime.startsWith('video'))) && m.url);
  return vid ? vid.url : null;
}

function crReady(v: PendingVisite): boolean {
  return !!v.compte_rendu_at || !!firstSharedVideo(v);
}

/**
 * Question obligatoire après une visite (faite par le client, ou compte-rendu disponible).
 * Location : « je souhaite déposer ma candidature » / « non ».
 * Achat : « je souhaite faire une offre d'achat » / « je réfléchis encore » / « ce bien ne me convient pas »
 * — jamais de postulation locative pour un acheteur.
 */
export function ClientVisitDecisionGate() {
  const { user } = useAuth();
  // Résolu pour tout compte connecté (comptes multi-rôles compris) ; « location » par défaut.
  const parcours = useClientParcours(!!user);
  const isAchat = parcours === 'achat';
  const [pending, setPending] = useState<PendingVisite[]>([]);
  const [saving, setSaving] = useState<null | 'oui' | 'non' | 'reflechir'>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setPending([]); setLoaded(true); return; }
    const { data: client } = await supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle();
    if (!client) { setPending([]); setLoaded(true); return; }
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from('visites')
      .select('id, offre_id, agent_id, adresse, date_visite, est_deleguee, statut, source, client_confirme_visite_at, client_decision, compte_rendu, compte_rendu_at, medias, offres(adresse, statut, prix)')
      .eq('client_id', client.id)
      .is('client_decision', null)
      .gte('date_visite', GATE_SINCE)
      .order('date_visite', { ascending: true });
    const rows = (data || []).filter((v: any) => {
      if (v.statut === 'annulee') return false;
      if (['refusee', 'candidature_deposee', 'souhaite_postuler', 'acceptee', 'offre_envisagee'].includes(v.offres?.statut)) return false;
      const cr = crReady(v);
      const prevueParClient = v.statut === 'confirmee' || !!v.client_confirme_visite_at || (v.statut !== 'proposee' && ['planifiee_client', 'portail', 'manuel', 'manuelle', 'proposee_agent'].includes(v.source));
      const clientVisitDone = v.est_deleguee !== true && prevueParClient && v.date_visite && v.date_visite < nowIso;
      return cr || clientVisitDone;
    });
    setPending(rows as any);
    setLoaded(true);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  const current = pending[0];
  const hasCr = current ? crReady(current) : false;
  const videoUrl = current ? firstSharedVideo(current) : null;

  const finish = () => {
    setSaving(null);
    setPending((prev) => prev.filter((p) => p.id !== current?.id));
    load();
  };

  // ---------- Location (comportement inchangé) ----------
  const resolveOui = async () => {
    if (!user || !current || saving) return;
    setSaving('oui');
    try {
      if (!hasCr) {
        await supabase.from('visites').update({ statut: 'effectuee' }).eq('id', current.id).neq('statut', 'effectuee');
      }
      await submitVisitVideoDecision({ user, visiteId: current.id, offreId: current.offre_id, agentIdHint: current.agent_id, address: current.adresse || current.offres?.adresse || '', choice: 'souhaite_postuler' });
      toast.success('Demande enregistrée et transmise à l’équipe.');
    } catch (e: any) {
      toast.error(e?.message || `Impossible d'enregistrer votre choix`);
    } finally {
      finish();
    }
  };

  const resolveNon = async () => {
    if (!user || !current || saving) return;
    setSaving('non');
    try {
      if (hasCr) {
        await submitVisitVideoDecision({ user, visiteId: current.id, offreId: current.offre_id, agentIdHint: current.agent_id, address: current.adresse || current.offres?.adresse || '', choice: 'refuse' });
      } else {
        const { error } = await supabase.from('visites').update({ client_decision: 'refuse', client_decision_at: new Date().toISOString() }).eq('id', current.id);
        if (error) throw error;
        try {
          await supabase.from('visites').update({ statut: 'annulee' }).eq('id', current.id);
          if (current.offre_id) {
            const { data: futures } = await supabase.from('visites').select('id').eq('offre_id', current.offre_id).neq('id', current.id).neq('statut', 'annulee').gt('date_visite', new Date().toISOString());
            if (!futures || futures.length === 0) {
              const { data: oui } = await supabase.from('visites').select('id').eq('offre_id', current.offre_id).eq('client_decision', 'souhaite_postuler').limit(1);
              if (!oui || oui.length === 0) await supabase.from('offres').update({ statut: 'refusee' }).eq('id', current.offre_id).not('statut', 'in', '(souhaite_postuler,candidature_deposee,acceptee)');
            }
          }
        } catch (_e) { /* best effort */ }
      }
      toast('Merci, votre réponse a bien été enregistrée.');
    } catch (e: any) {
      toast.error(e?.message || `Impossible d'enregistrer votre choix`);
    } finally {
      finish();
    }
  };

  // ---------- Achat ----------
  const offreAchat = current
    ? { id: current.offre_id, adresse: current.adresse || current.offres?.adresse || '', prix: current.offres?.prix ?? null, statut: current.offres?.statut }
    : null;

  const marquerVisiteFaite = async () => {
    if (!current) return;
    if (!hasCr) {
      await supabase.from('visites').update({ statut: 'effectuee' }).eq('id', current.id).neq('statut', 'effectuee');
    }
  };

  const achatOffre = async () => {
    if (!user || !current || saving) return;
    setSaving('oui');
    try {
      await marquerVisiteFaite();
      if (offreAchat?.id) {
        await souhaiteFaireOffreAchat(user.id, offreAchat, { visites: [{ ...current, offre_id: offreAchat.id, statut: 'effectuee' }] });
      } else {
        await supabase.from('visites').update({ client_decision: 'interesse', client_decision_at: new Date().toISOString() }).eq('id', current.id);
      }
      toast.success('Souhait d’offre transmis : votre conseiller vous recontacte pour la préparer.');
    } catch (e: any) {
      toast.error(e?.message || `Impossible d'enregistrer votre choix`);
    } finally {
      finish();
    }
  };

  const achatReflechir = async () => {
    if (!user || !current || saving) return;
    setSaving('reflechir');
    try {
      await marquerVisiteFaite();
      await supabase.from('visites').update({ client_decision: 'interesse', client_decision_at: new Date().toISOString() }).eq('id', current.id);
      if (offreAchat?.id && !['visite_effectuee', 'offre_envisagee', 'acceptee'].includes(offreAchat.statut || '')) {
        await confirmerVisiteFaiteAchat(user.id, offreAchat, [{ ...current, offre_id: offreAchat.id }]);
      }
      toast('Noté. Vous pourrez faire une offre depuis « Biens proposés » quand vous serez prêt.');
    } catch (e: any) {
      toast.error(e?.message || `Impossible d'enregistrer votre choix`);
    } finally {
      finish();
    }
  };

  const achatRenoncer = async () => {
    if (!user || !current || saving) return;
    setSaving('non');
    try {
      await marquerVisiteFaite();
      if (offreAchat?.id) {
        await renoncerApresVisiteAchat(user.id, offreAchat, [{ ...current, offre_id: offreAchat.id }]);
      } else {
        await supabase.from('visites').update({ client_decision: 'refuse', client_decision_at: new Date().toISOString() }).eq('id', current.id);
      }
      toast('Merci, votre réponse a bien été enregistrée.');
    } catch (e: any) {
      toast.error(e?.message || `Impossible d'enregistrer votre choix`);
    } finally {
      finish();
    }
  };

  const achatPasVisite = async () => {
    if (!user || !current || saving) return;
    setSaving('non');
    try {
      // Visite non faite : annulée sans écarter le bien ; le conseiller est prévenu pour proposer une nouvelle date.
      await visiteNonFaiteAchat(user.id, offreAchat, current.id);
      toast('Merci. Votre conseiller vous proposera une nouvelle date de visite.');
    } catch (e: any) {
      toast.error(e?.message || `Impossible d'enregistrer votre choix`);
    } finally {
      finish();
    }
  };

  if (!loaded || !current || parcours === null) return null;

  return (
    <Dialog open={true}>
      <DialogContent
        className="max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{hasCr ? 'Compte-rendu de visite disponible' : 'Avez-vous effectué la visite ?'}</DialogTitle>
          <DialogDescription>
            {hasCr
              ? (isAchat
                ? 'Votre conseiller a visité le bien pour vous. Consultez le compte-rendu puis indiquez la suite.'
                : 'La visite a été réalisée par notre équipe. Consultez le compte-rendu puis indiquez votre décision pour continuer.')
              : 'Merci de répondre pour continuer. Cette étape est obligatoire.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-2 space-y-1 rounded-xl border p-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            {current.adresse || current.offres?.adresse || 'Adresse non renseignée'}
          </div>
          {current.date_visite && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              {formatSwissDateTime(current.date_visite)}
            </div>
          )}
        </div>

        {hasCr && videoUrl && <video src={videoUrl} controls className="mb-2 max-h-64 w-full rounded-lg bg-black" />}

        {hasCr && current.compte_rendu && typeof current.compte_rendu === 'object' && (
          <div className="mb-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border p-3 text-sm">
            {current.compte_rendu.etat_general && (<div><span className="font-medium">État général : </span>{current.compte_rendu.etat_general}</div>)}
            {current.compte_rendu.avantages && (<div><span className="font-medium">Avantages : </span>{current.compte_rendu.avantages}</div>)}
            {current.compte_rendu.inconvenients && (<div><span className="font-medium">Inconvénients : </span>{current.compte_rendu.inconvenients}</div>)}
            {current.compte_rendu.type_sol && (<div><span className="font-medium">Sols : </span>{current.compte_rendu.type_sol}</div>)}
            {current.compte_rendu.ascenseur && (<div><span className="font-medium">Ascenseur : </span>{current.compte_rendu.ascenseur}</div>)}
            {current.compte_rendu.autres_infos && (<div><span className="font-medium">Autres : </span>{current.compte_rendu.autres_infos}</div>)}
          </div>
        )}

        {isAchat ? (
          <div className="flex flex-col gap-2">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={!!saving} onClick={achatOffre}>
              {saving === 'oui' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
              {hasCr ? "Je souhaite faire une offre d'achat" : "Oui, et je souhaite faire une offre d'achat"}
            </Button>
            <Button variant="outline" disabled={!!saving} onClick={achatReflechir}>
              {saving === 'reflechir' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
              {hasCr ? 'Il m’intéresse, je réfléchis encore' : 'Oui, je réfléchis encore'}
            </Button>
            <Button variant="outline" className="border-red-500/40 text-red-700 hover:bg-red-500/10" disabled={!!saving} onClick={achatRenoncer}>
              {saving === 'non' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
              {hasCr ? 'Ce bien ne me convient pas' : 'Oui, mais ce bien ne me convient pas'}
            </Button>
            {!hasCr && (
              <button
                type="button"
                disabled={!!saving}
                onClick={achatPasVisite}
                className="py-1.5 text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Non, je n'ai pas pu visiter
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={!!saving} onClick={resolveOui}>
              {saving === 'oui' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {hasCr ? 'Je souhaite déposer ma candidature' : 'Oui, et je souhaite déposer ma candidature'}
            </Button>
            <Button variant="outline" className="border-red-500/40 text-red-700 hover:bg-red-500/10" disabled={!!saving} onClick={resolveNon}>
              {saving === 'non' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
              {hasCr ? `Cette offre ne m'intéresse pas` : `Non, je n'ai pas visité`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
