import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, Home, Info, StickyNote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { loadClientParcours } from '@/hooks/useClientParcours';
import { noteSuiviClient } from '@/lib/offreNote';
import {
  ACHAT_A_REPONDRE, ACHAT_EN_COURS, ACHAT_STATUT_COURT, creneauxProposes, formatPrixAchat,
  confirmerVisiteFaiteAchat, deleguerVisiteAchat, demanderVisiteAchat, marquerInteretAchat,
  refuserBienAchat, renoncerApresVisiteAchat, souhaiteFaireOffreAchat,
} from '@/lib/achatOffreActions';
import { ACHAT_CARD, AchatOffrePhoto, AchatProchaineEtape, type AchatActionsHandlers } from '@/components/achat/offres/AchatOffreParts';
import { AchatDelegationDialog, AchatOffreAchatDialog, AchatVisiteDialog } from '@/components/achat/offres/AchatOffreDialogs';
import { AchatOffreDetailsDialog } from '@/components/achat/offres/AchatOffreDetailsDialog';

type Filtre = 'tous' | 'a_repondre' | 'en_cours' | 'ecartes';
const FILTRES_VALIDES: Filtre[] = ['tous', 'a_repondre', 'en_cours', 'ecartes'];

/**
 * Biens proposés — parcours ACHAT.
 * Même expérience que « Offres reçues » (location) : filtres, cartes photo, une prochaine
 * étape claire par bien, fiche détaillée. Chaque action notifie le conseiller et l'admin.
 * Remplace aussi l'ancienne page « Biens sélectionnés » (filtre « En cours »).
 */
export default function BiensProposes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { markTypeAsRead } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [offres, setOffres] = useState<any[]>([]);
  const [visites, setVisites] = useState<any[]>([]);
  // Biens pour lesquels une demande de visite a déjà été transmise au conseiller.
  const [demandes, setDemandes] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  // Le filtre suit l'URL (liens du tableau de bord, du menu, ancienne page « Biens sélectionnés »).
  const filtreUrl = searchParams.get('filtre') as Filtre | null;
  const filtre: Filtre = filtreUrl && FILTRES_VALIDES.includes(filtreUrl) ? filtreUrl : 'tous';

  const [detail, setDetail] = useState<any | null>(null);
  const [visiteFor, setVisiteFor] = useState<any | null>(null);
  const [delegFor, setDelegFor] = useState<any | null>(null);
  const [offreFor, setOffreFor] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    // Même règle de parcours que le menu, la barre du bas et la redirection globale (pas de boucle possible).
    const parcours = await loadClientParcours(user.id);
    if (parcours !== 'achat') {
      // Compte location : la page équivalente est « Offres reçues ».
      navigate(`/client/offres-recues${window.location.search}`, { replace: true });
      return;
    }
    markTypeAsRead('new_offer');
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!client?.id) {
      setOffres([]);
      setVisites([]);
      setLoading(false);
      return;
    }

    const [{ data: offresData }, { data: visitesData }] = await Promise.all([
      supabase
        .from('offres')
        .select(`*, agent:agents!offres_agent_id_fkey(id, user_id, profile:profiles!agents_user_id_fkey(prenom, nom))`)
        .eq('client_id', client.id)
        .order('date_envoi', { ascending: false }),
      supabase.from('visites').select('*').eq('client_id', client.id),
    ]);
    setOffres(offresData || []);
    setVisites(visitesData || []);

    const ids = (offresData || []).map((o: any) => o.id);
    if (ids.length > 0) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('offre_id, content')
        .eq('sender_type', 'client')
        .in('offre_id', ids)
        // (pas de parenthèses dans les motifs : elles casseraient le filtre « or » de l'API)
        .or('content.ilike.%Demande de visite%,content.ilike.%Visite déléguée au conseiller%,content.ilike.%Visite non effectuée%');
      setDemandes(new Set((msgs || []).map((m: any) => m.offre_id).filter(Boolean)));
    } else {
      setDemandes(new Set());
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  useEffect(() => {
    document.title = 'Biens proposés | Immo-Rama';
    void load();
  }, [load]);

  // Lien direct ?offre=<id> ou ?offreId=<id> (notifications, tableau de bord) → ouvre la fiche.
  useEffect(() => {
    const id = searchParams.get('offreId') || searchParams.get('offre');
    if (!id || offres.length === 0) return;
    const found = offres.find((o) => o.id === id);
    if (found) setDetail(found);
    const next = new URLSearchParams(searchParams);
    next.delete('offreId');
    next.delete('offre');
    setSearchParams(next, { replace: true });
  }, [searchParams, offres, setSearchParams]);

  // Garder la fiche ouverte à jour après une action.
  useEffect(() => {
    if (detail) {
      const fresh = offres.find((o) => o.id === detail.id);
      if (fresh && fresh !== detail) setDetail(fresh);
    }
  }, [offres, detail]);

  const run = useCallback(async (fn: () => Promise<void>, ok: { title: string; description?: string }) => {
    if (!user || busy) return false;
    setBusy(true);
    try {
      await fn();
      toast(ok);
      await load();
      return true;
    } catch (e: any) {
      console.error('[BiensProposes]', e);
      toast({ title: 'Erreur', description: e?.message || "L'action n'a pas pu être enregistrée.", variant: 'destructive' });
      return false;
    } finally {
      setBusy(false);
    }
  }, [user, busy, toast, load]);

  const handlers: AchatActionsHandlers = useMemo(() => ({
    onVisiter: (o) => setVisiteFor(o),
    onDeleguer: (o) => setDelegFor(o),
    onRefuser: (o) => void run(() => refuserBienAchat(user!.id, o), { title: 'Bien écarté', description: 'Votre conseiller en est informé.' }),
    onInteret: (o) => void run(() => marquerInteretAchat(user!.id, o), { title: 'Intérêt transmis', description: 'Votre conseiller vous propose une visite.' }),
    onVisiteFaite: (o) => void run(() => confirmerVisiteFaiteAchat(user!.id, o, visites), { title: 'Visite enregistrée', description: 'Indiquez maintenant si vous souhaitez faire une offre.' }),
    onFaireOffre: (o) => setOffreFor(o),
    onRenoncer: (o) => void run(() => renoncerApresVisiteAchat(user!.id, o, visites), { title: 'Choix enregistré', description: 'Votre conseiller en est informé.' }),
  }), [run, user, visites]);

  const compte = (liste: string[]) => offres.filter((o) => liste.includes(o.statut)).length;
  const filtres: { key: Filtre; label: string; count: number }[] = [
    { key: 'tous', label: 'Tous', count: offres.length },
    { key: 'a_repondre', label: 'À répondre', count: compte(ACHAT_A_REPONDRE) },
    { key: 'en_cours', label: 'En cours', count: compte(ACHAT_EN_COURS) },
    { key: 'ecartes', label: 'Écartés', count: compte(['refusee']) },
  ];
  const offresFiltrees = offres.filter((o) => {
    if (filtre === 'a_repondre') return ACHAT_A_REPONDRE.includes(o.statut);
    if (filtre === 'en_cours') return ACHAT_EN_COURS.includes(o.statut);
    if (filtre === 'ecartes') return o.statut === 'refusee';
    return true;
  });
  const aRepondre = filtres[1].count;

  const choisirFiltre = (f: Filtre) => {
    const next = new URLSearchParams(searchParams);
    if (f === 'tous') next.delete('filtre'); else next.set('filtre', f);
    setSearchParams(next, { replace: true });
  };

  if (loading) {
    return (
      <div className="relative flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8" role="status" aria-label="Chargement des biens">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-[14px]" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <header className="mb-5">
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground md:text-[28px]">Biens proposés</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {offres.length === 0
              ? 'Les biens à l\'achat sélectionnés par votre conseiller arrivent ici.'
              : aRepondre > 0
                ? `${offres.length} bien${offres.length > 1 ? 's' : ''} · ${aRepondre} en attente de votre réponse`
                : `${offres.length} bien${offres.length > 1 ? 's' : ''} sélectionné${offres.length > 1 ? 's' : ''} pour vous`}
          </p>
        </header>

        {offres.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card px-6 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Home className="h-7 w-7 text-primary" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-foreground">Aucun bien proposé pour le moment</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Votre conseiller recherche, sur le marché et hors marché, les biens qui correspondent à votre projet et à votre capacité d'achat.
              Vous serez notifié dès qu'un bien arrive.
            </p>
          </div>
        ) : (
          <>
            <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Filtrer les biens">
              {filtres.map((f) => {
                const active = filtre === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => choisirFiltre(f.key)}
                    className={cn(
                      'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-150',
                      active ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:border-foreground/60',
                    )}
                  >
                    {f.label}
                    <span className={cn('text-xs', active ? 'text-background/70' : 'text-muted-foreground')}>{f.count}</span>
                  </button>
                );
              })}
            </div>

            {offresFiltrees.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
                Aucun bien dans cette catégorie.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {offresFiltrees.map((offre) => {
                  const visitesDuBien = visites.filter((v) => v.offre_id === offre.id);
                  const prix = formatPrixAchat(offre.prix);
                  const pieces = offre.pieces ?? offre.nombre_pieces;
                  const details = [
                    pieces ? `${pieces} pièces` : null,
                    offre.surface ? `${offre.surface} m²` : null,
                    offre.etage ? `Étage ${offre.etage}` : null,
                  ].filter(Boolean).join(' · ');
                  const lien = offre.lien_annonce
                    ? (/^https?:\/\//i.test(String(offre.lien_annonce).trim()) ? String(offre.lien_annonce).trim() : `https://${String(offre.lien_annonce).trim()}`)
                    : null;

                  return (
                    <article key={offre.id} className={cn(ACHAT_CARD, 'flex flex-col overflow-hidden')}>
                      <button
                        type="button"
                        onClick={() => setDetail(offre)}
                        className="relative block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Voir le détail : ${offre.adresse || 'bien'}`}
                      >
                        <AchatOffrePhoto offre={offre} />
                        <span
                          className={cn(
                            'absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
                            ACHAT_A_REPONDRE.includes(offre.statut) ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground',
                          )}
                        >
                          {ACHAT_STATUT_COURT[offre.statut] ?? 'Bien'}
                        </span>
                      </button>

                      <div className="flex flex-1 flex-col p-4">
                        <button type="button" onClick={() => setDetail(offre)} className="text-left">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                              {offre.adresse || offre.titre || 'Bien proposé'}
                            </h3>
                            {prix && (
                              <p className="shrink-0 text-right text-[15px] text-foreground">
                                <span className="font-semibold">{prix}</span>
                                <span className="block text-xs text-muted-foreground">prix de vente</span>
                              </p>
                            )}
                          </div>
                          {details && <p className="mt-1 text-sm text-muted-foreground">{details}</p>}
                          {noteSuiviClient(offre.commentaires) && (
                            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs leading-snug text-foreground">
                              <StickyNote className="mt-px h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                              <span className="line-clamp-2">{noteSuiviClient(offre.commentaires)}</span>
                            </p>
                          )}
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            Proposé le {offre.date_envoi || offre.created_at ? new Date(offre.date_envoi || offre.created_at).toLocaleDateString('fr-CH') : '—'}
                            {offre.agent?.profile?.prenom ? ` · par ${offre.agent.profile.prenom}` : ''}
                          </p>
                        </button>

                        <div className="mt-4 flex-1 border-t border-border/70 pt-4">
                          <AchatProchaineEtape offre={offre} visitesDuBien={visitesDuBien} handlers={handlers} busy={busy} compact demandeEnvoyee={demandes.has(offre.id)} />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-9 rounded-full px-3" onClick={() => setDetail(offre)}>
                            <Info className="mr-1.5 h-4 w-4" />
                            Détails
                          </Button>
                          {lien && (
                            <a
                              href={lien}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-foreground hover:bg-muted"
                            >
                              <ExternalLink className="mr-1.5 h-4 w-4" />
                              Voir l'annonce
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <AchatOffreDetailsDialog
        open={!!detail}
        onOpenChange={(o) => { if (!o) setDetail(null); }}
        offre={detail}
        visites={visites}
        handlers={handlers}
        busy={busy}
        demandeEnvoyee={!!detail && demandes.has(detail.id)}
      />

      <AchatVisiteDialog
        open={!!visiteFor}
        onOpenChange={(o) => { if (!o) setVisiteFor(null); }}
        offre={visiteFor}
        busy={busy}
        creneaux={visiteFor ? creneauxProposes(visites, visiteFor.id) : []}
        onDeleguer={() => { const o = visiteFor; setVisiteFor(null); setDelegFor(o); }}
        onConfirm={async (opts) => {
          const o = visiteFor;
          const ok = await run(() => demanderVisiteAchat(user!.id, o, opts), opts.creneau
            ? { title: 'Visite confirmée', description: 'Votre conseiller est notifié. La date est dans votre agenda.' }
            : { title: 'Demande de visite envoyée', description: 'Votre conseiller fixe la visite et vous propose un créneau.' });
          if (ok) setVisiteFor(null);
        }}
      />

      <AchatDelegationDialog
        open={!!delegFor}
        onOpenChange={(o) => { if (!o) setDelegFor(null); }}
        offre={delegFor}
        busy={busy}
        creneaux={delegFor ? creneauxProposes(visites, delegFor.id) : []}
        onConfirm={async (opts) => {
          const o = delegFor;
          const ok = await run(() => deleguerVisiteAchat(user!.id, o, opts), {
            title: 'Visite confiée à votre conseiller',
            description: 'Vous recevrez son compte-rendu et la vidéo de la visite.',
          });
          if (ok) setDelegFor(null);
        }}
      />

      <AchatOffreAchatDialog
        open={!!offreFor}
        onOpenChange={(o) => { if (!o) setOffreFor(null); }}
        offre={offreFor}
        busy={busy}
        onConfirm={async (opts) => {
          const o = offreFor;
          const ok = await run(() => souhaiteFaireOffreAchat(user!.id, o, { ...opts, visites }), {
            title: 'Souhait d\'offre transmis',
            description: 'Votre conseiller vous recontacte pour préparer l\'offre d\'achat.',
          });
          if (ok) setOffreFor(null);
        }}
      />
    </div>
  );
}
