import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Bot, CheckCircle2, ChevronDown, ChevronUp, Loader2, OctagonX, Pause, Play, PlayCircle, ShieldCheck, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DASH_CARD, DashBadge, DashFilterPills } from '@/components/client/dashboard/DashPrimitives';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Mode = 'off' | 'a_blanc' | 'autonome';
type Action = {
  id: string; created_at: string; kind: string; source: string; statut: string; mailbox: string | null; destinataire: string | null;
  objet: string | null; corps: string | null; pieces: { nom: string; taille: number }[] | null; motif: string | null; preuve: string | null;
  note: string | null; client_nom: string | null; bien: string | null;
  canal?: string | null; responsable?: string | null; etape?: string | null; tentatives?: number | null;
  verrou_par?: string | null; verrou_jusqu?: string | null; etapes?: { le: string; evt?: string; etape?: string; par?: string; motif?: string; note?: string; canal?: string; vers?: string }[] | null;
};
type Overview = {
  mode: Mode; depuis: string | null; autonome_le: string | null;
  boites: { adresse: string; branchee: boolean; lecture_active: boolean }[];
  aujourdhui: Record<string, number>;
  ouvertes?: Record<string, number>;
  actions: Action[];
};

const KIND: Record<string, string> = {
  demande_qr: 'Demande du formulaire (QR / lien)', relance_annonceur: 'Relance d’annonceur', envoi_dossier: 'Envoi du dossier',
  triage_postulations: 'File des postulations', demande_postulation: 'Postulation demandée', lecon: 'Réglage',
  lecture_mail: 'Réponse lue (régie / annonceur)', demande_visite: 'Demande de visite', reponse_offre: 'Réponse à une offre',
  changement_criteres: 'Critères modifiés', demande_piece: 'Pièces demandées au client', reprise_dossier: 'Avancement d’une routine',
};
const CANAL: Record<string, string> = { email: 'e-mail', flatfox: 'chat Flatfox', app: 'application', interne: 'interne' };
const RESPONSABLE: Record<string, string> = {
  steeve: 'Steeve', 'routine-chrome': 'routine Chrome', 'routine-chatgpt': 'routine ChatGPT', 'routine-surveillance': 'routine Surveillance', humain: 'équipe',
};
type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';
const STATUT: Record<string, { label: string; tone: BadgeTone }> = {
  a_faire: { label: 'À faire', tone: 'neutral' },
  a_blanc: { label: 'À blanc (non envoyé)', tone: 'warning' },
  fait: { label: 'Fait', tone: 'success' },
  bloque: { label: 'Bloqué', tone: 'danger' },
  a_valider: { label: 'À valider', tone: 'primary' },
  annule: { label: 'Annulé', tone: 'muted' },
  echec: { label: 'Échec', tone: 'danger' },
  en_cours: { label: 'En cours', tone: 'primary' },
  en_attente_formulaire: { label: 'Formulaire attendu', tone: 'neutral' },
  en_attente_regie: { label: 'Réponse de la régie attendue', tone: 'neutral' },
  en_attente_client: { label: 'Pièces du client attendues', tone: 'neutral' },
  bloque_acces: { label: 'Accès bloqué', tone: 'danger' },
  resultat_inconnu: { label: 'Envoi à vérifier', tone: 'danger' },
  suspendu: { label: 'Suspendue', tone: 'warning' },
};
const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tout' }, { value: 'resultat_inconnu', label: 'À vérifier' }, { value: 'a_faire', label: 'À faire' },
  { value: 'en_attente_formulaire', label: 'Formulaire attendu' }, { value: 'en_attente_regie', label: 'Régie attendue' },
  { value: 'bloque', label: 'Bloqués' }, { value: 'suspendu', label: 'Suspendues' }, { value: 'fait', label: 'Faits' },
  { value: 'a_blanc', label: 'À blanc' }, { value: 'echec', label: 'Échecs' },
];
const SUSPENDABLE = ['a_faire', 'en_cours', 'en_attente_formulaire', 'en_attente_regie', 'en_attente_client', 'bloque', 'bloque_acces'];
const CANCELLABLE = ['a_faire', 'a_valider', 'bloque', 'bloque_acces', 'a_blanc', 'suspendu', 'en_attente_client', 'en_attente_formulaire', 'en_attente_regie'];
const EVT: Record<string, string> = {
  creee: 'créée', reservee: 'prise en charge', relancee: 'relancée', suspendre: 'suspendue', reprendre: 'reprise', reattribuer: 'réattribuée',
  annuler: 'annulée', annule: 'annulée', confirmer_envoye: 'envoi confirmé', confirmer_non_envoye: 'pas partie', formulaire_recu: 'formulaire reçu',
  resultat_inconnu: 'résultat inconnu', brouillon_pret: 'brouillon prêt',
};
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', dateStyle: 'short', timeStyle: 'short' }) : '');

/**
 * Steeve opérateur : mode (arrêt, à blanc, autonome), boîtes d'envoi et journal de chaque action.
 * Le bouton Arrêter coupe tout immédiatement ; le mode à blanc contrôle et journalise sans rien envoyer.
 */
export function SteeveOperatorCard() {
  const [data, setData] = useState<Overview | null>(null);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fonction ajoutée par la migration 20261026000000
    const { data: d, error } = await (supabase.rpc as any)('admin_steeve_operateur', { p_limit: 40, p_statut: filter || null });
    if (!error) setData(d as Overview);
  }, [filter]);
  useEffect(() => { void load(); }, [load]);

  const setMode = async (mode: Mode) => {
    if (mode === 'autonome' && !window.confirm('Steeve enverra lui-même les demandes, relances et dossiers qui passent tous les contrôles. Continuer ?')) return;
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fonction ajoutée par la migration 20261026000000
    const { data: d, error } = await (supabase.rpc as any)('admin_set_steeve_autonomie', { p_mode: mode });
    setBusy(false);
    if (error) { toast.error('Le mode n’a pas pu être changé'); return; }
    setData(d as Overview);
    toast.success(mode === 'off' ? 'Steeve opérateur arrêté' : mode === 'a_blanc' ? 'Mode à blanc : rien ne sera envoyé' : 'Steeve envoie lui-même');
    if (filter) void load();
  };

  const cancel = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fonction ajoutée par la migration 20261026000000
    const { error } = await (supabase.rpc as any)('staff_cancel_steeve_action', { p_id: id });
    if (error) { toast.error("L'action n'a pas pu être annulée"); return; }
    toast.success('Action annulée');
    void load();
  };

  /** Contrôle de l'administrateur sur une tâche (journalisé, pris en compte par Steeve et les routines). */
  const control = async (id: string, action: string, responsable?: string) => {
    const ask: Record<string, string> = {
      confirmer_envoye: 'Confirmer que cet envoi est bien parti (vu dans les Envoyés ou accusé de la régie) ?',
      confirmer_non_envoye: 'Confirmer que cet envoi n’est PAS parti ? Steeve pourra le refaire au prochain passage.',
    };
    if (ask[action] && !window.confirm(ask[action])) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fonction ajoutée par la migration 20261026030000
    const { error } = await (supabase.rpc as any)('admin_steeve_tache_controle', { p_id: id, p_action: action, p_responsable: responsable ?? null, p_note: null });
    if (error) { toast.error('Action impossible sur cette tâche'); return; }
    toast.success('Tâche mise à jour');
    setReassign(null);
    void load();
  };
  const [reassign, setReassign] = useState<string | null>(null);

  const MODE_LABEL = data ? (data.mode === 'off' ? 'Arrêté' : data.mode === 'a_blanc' ? 'À blanc' : 'Autonome') : '';

  if (!data) {
    return (
      <section aria-labelledby="steeve-operateur-title" className={cn(DASH_CARD, 'p-4 md:p-6')}>
        <h2 id="steeve-operateur-title" className="text-base font-semibold text-foreground md:text-[17px]">Steeve opérateur</h2>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</p>
      </section>
    );
  }

  const anyBox = data.boites.some((b) => b.branchee);
  const today = data.aujourdhui ?? {};

  return (
    <>
      <section aria-labelledby="steeve-operateur-title" className={cn(DASH_CARD, 'min-w-0 p-4 md:p-6')}>
        <header className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="steeve-operateur-title" className="flex flex-wrap items-center gap-2 text-base font-semibold leading-snug text-foreground md:text-[17px]">
              Steeve opérateur
              <DashBadge tone={data.mode === 'autonome' ? 'success' : data.mode === 'a_blanc' ? 'warning' : 'muted'}>{MODE_LABEL}</DashBadge>
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Steeve suit et soutient les routines : lecture des réponses des régies (visites@, relocation@), demande du formulaire de location (chat Flatfox et e-mail),
              demandes de visite, relances oubliées, pièces manquantes, contrôle puis envoi des dossiers préparés dans relocation@. Toutes les tâches (Steeve, routines,
              équipe) passent par un registre commun : une seule exécution à la fois, jamais de renvoi d'un envoi incertain. Signature, bail et paiement restent à l'équipe.
            </p>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Mode de Steeve opérateur">
          <Button variant={data.mode === 'off' ? 'destructive' : 'outline'} disabled={busy} onClick={() => void setMode('off')} className="min-h-[44px]">
            <OctagonX className="mr-2 h-4 w-4" /> Arrêter
          </Button>
          <Button variant={data.mode === 'a_blanc' ? 'default' : 'outline'} disabled={busy} onClick={() => void setMode('a_blanc')} className="min-h-[44px]">
            <ShieldCheck className="mr-2 h-4 w-4" /> À blanc
          </Button>
          <Button variant={data.mode === 'autonome' ? 'default' : 'outline'} disabled={busy} onClick={() => void setMode('autonome')} className="min-h-[44px]">
            <PlayCircle className="mr-2 h-4 w-4" /> Autonome
          </Button>
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
          {busy && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-label="Enregistrement" />}
          <span>
            {data.mode === 'off' && 'Arrêté : Steeve ne fait plus rien (seul le chat reste actif).'}
            {data.mode === 'a_blanc' && "À blanc : il contrôle et note ce qu'il aurait envoyé, rien ne part. Le passage en autonome se fait seulement quand tu le choisis."}
            {data.mode === 'autonome' && 'Autonome : il envoie entre 7 h et 20 h ce qui passe tous les contrôles, au plus 15 dossiers et 20 relances par jour.'}
          </span>
        </p>

        <h3 className="mb-2 mt-6 text-sm font-semibold text-foreground">Boîtes d'envoi</h3>
        <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/50 dark:bg-white/[0.03]">
          {data.boites.map((b) => (
            <li key={b.adresse} className="flex items-start gap-3 p-3">
              {b.branchee ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" /> : <Ban className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-all font-medium text-foreground">{b.adresse}</p>
                  <DashBadge tone={b.branchee ? 'success' : 'muted'}>{b.branchee ? 'Branchée' : 'Non branchée'}</DashBadge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {b.branchee ? (b.adresse.startsWith('relocation') ? 'Envoi des dossiers' : 'Envoi des demandes de QR et des relances') : 'Mot de passe à enregistrer dans « Boîtes e-mail partagées »'}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {!anyBox && <p className="mt-2 text-sm text-muted-foreground">Sans boîte branchée, Steeve ne peut rien envoyer ; il remet seulement la file des postulations en route.</p>}

        {data.ouvertes && Object.keys(data.ouvertes).length > 0 && (
          <>
            <h3 className="mb-2 mt-6 text-sm font-semibold text-foreground">Tâches ouvertes</h3>
            <div className="flex flex-wrap gap-2" aria-label="Tâches ouvertes">
              {Object.entries(data.ouvertes).map(([k, n]) => {
                const v = STATUT[k] ?? { label: k, tone: 'muted' as BadgeTone };
                return <DashBadge key={k} tone={v.tone}>{v.label} : {n}</DashBadge>;
              })}
            </div>
          </>
        )}

        <h3 className="mb-2 mt-6 text-sm font-semibold text-foreground">Dernières 24 heures</h3>
        <div className="flex flex-wrap gap-2" aria-label="Dernières 24 heures">
          {Object.entries(STATUT).filter(([k]) => today[k]).map(([k, v]) => (
            <DashBadge key={k} tone={v.tone}>{v.label} : {today[k]}</DashBadge>
          ))}
          {Object.keys(today).length === 0 && <span className="text-sm text-muted-foreground">Rien aujourd'hui.</span>}
        </div>
      </section>

      <section aria-labelledby="steeve-operateur-journal" className={cn(DASH_CARD, 'min-w-0 p-4 md:p-6')}>
        <h2 id="steeve-operateur-journal" className="text-base font-semibold text-foreground md:text-[17px]">Journal des actions</h2>
        <p className="mt-1 text-sm text-muted-foreground">Chaque tâche, avec son responsable, son étape et sa preuve. Tu peux la suspendre, la reprendre, la confier à quelqu'un d'autre ou l'annuler.</p>
        <div className="mt-4">
          <DashFilterPills
            options={FILTERS.map((f) => ({ key: f.value, label: f.label }))}
            value={filter}
            onChange={setFilter}
            label="Filtrer le journal"
          />
          {data.actions.length === 0 ? (
            <p className="rounded-2xl border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground dark:bg-white/[0.03]">Aucune action dans le journal.</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/50 dark:bg-white/[0.03]">
              {data.actions.map((a) => {
                const s = STATUT[a.statut] ?? { label: a.statut, tone: 'muted' as BadgeTone };
                const expanded = open === a.id;
                return (
                  <li key={a.id} className="space-y-1.5 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <DashBadge tone={s.tone}>{s.label}</DashBadge>
                      <span className="font-medium text-foreground">{KIND[a.kind] ?? a.kind}</span>
                    </div>
                    <p className="text-muted-foreground">
                      {fmt(a.created_at)}{a.source !== 'auto' ? ` · demandé (${a.source})` : ''}
                      {a.canal ? ` · ${CANAL[a.canal] ?? a.canal}` : ''}{a.responsable && a.responsable !== 'steeve' ? ` · ${RESPONSABLE[a.responsable] ?? a.responsable}` : ''}
                      {(a.tentatives ?? 0) > 1 ? ` · ${a.tentatives} tentatives` : ''}
                    </p>
                    {a.verrou_par && a.verrou_jusqu && new Date(a.verrou_jusqu) > new Date() && (
                      <p className="text-primary">En cours ({RESPONSABLE[a.verrou_par] ?? a.verrou_par}{a.etape ? `, étape ${a.etape}` : ''}) jusqu'à {fmt(a.verrou_jusqu)}</p>
                    )}
                    {(a.client_nom || a.bien) && <p className="text-muted-foreground">{[a.client_nom, a.bien].filter(Boolean).join(' — ')}</p>}
                    {a.destinataire && <p className="break-words text-foreground">De {a.mailbox ?? '—'} à {a.destinataire}{a.objet ? ` · « ${a.objet} »` : ''}</p>}
                    {a.motif && <p className="text-orange-800 dark:text-orange-200">{a.motif}</p>}
                    {a.note && <p className="text-muted-foreground">{a.note}</p>}
                    {a.preuve && <p className="break-all text-[13px] text-muted-foreground">Preuve : {a.preuve}</p>}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {(a.corps || (a.pieces?.length ?? 0) > 0) && (
                        <Button variant="ghost" className="min-h-11" onClick={() => setOpen(expanded ? null : a.id)} aria-expanded={expanded}>
                          {expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />} Détail
                        </Button>
                      )}
                      {(a.corps === null && (a.pieces?.length ?? 0) === 0 && (a.etapes?.length ?? 0) > 0) && (
                        <Button variant="ghost" className="min-h-11" onClick={() => setOpen(expanded ? null : a.id)} aria-expanded={expanded}>
                          {expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />} Historique
                        </Button>
                      )}
                      {a.statut === 'resultat_inconnu' && (
                        <>
                          <Button variant="ghost" className="min-h-11" onClick={() => void control(a.id, 'confirmer_envoye')}>Envoi confirmé</Button>
                          <Button variant="ghost" className="min-h-11" onClick={() => void control(a.id, 'confirmer_non_envoye')}>Pas parti</Button>
                        </>
                      )}
                      {SUSPENDABLE.includes(a.statut) && (
                        <Button variant="ghost" className="min-h-11" onClick={() => void control(a.id, 'suspendre')}><Pause className="mr-1 h-4 w-4" /> Suspendre</Button>
                      )}
                      {a.statut === 'suspendu' && (
                        <Button variant="ghost" className="min-h-11" onClick={() => void control(a.id, 'reprendre')}><Play className="mr-1 h-4 w-4" /> Reprendre</Button>
                      )}
                      {!['fait', 'annule', 'a_blanc'].includes(a.statut) && a.kind !== 'lecture_mail' && (
                        <Button variant="ghost" className="min-h-11" onClick={() => setReassign(reassign === a.id ? null : a.id)} aria-expanded={reassign === a.id}>
                          <UserCog className="mr-1 h-4 w-4" /> Confier à…
                        </Button>
                      )}
                      {CANCELLABLE.includes(a.statut) && (
                        <Button variant="ghost" className="min-h-11" onClick={() => void cancel(a.id)}>Annuler</Button>
                      )}
                      {a.kind === 'envoi_dossier' && a.statut === 'bloque' && (
                        <Button variant="ghost" className="min-h-11" asChild><Link to="/admin/postulations">Postulations</Link></Button>
                      )}
                    </div>
                    {reassign === a.id && (
                      <div className="flex flex-wrap gap-1 rounded-xl bg-muted/40 p-2" role="group" aria-label="Confier la tâche">
                        {Object.entries(RESPONSABLE).filter(([k]) => k !== a.responsable).map(([k, label]) => (
                          <Button key={k} variant="outline" className="min-h-11" onClick={() => void control(a.id, 'reattribuer', k)}>{label}</Button>
                        ))}
                      </div>
                    )}
                    {expanded && (
                      <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-sm">
                        {a.corps && <p className="whitespace-pre-wrap break-words">{a.corps}</p>}
                        {(a.pieces?.length ?? 0) > 0 && (
                          <ul className="list-disc pl-4">{a.pieces!.map((p) => <li key={p.nom}>{p.nom} ({Math.round(p.taille / 1024)} Ko)</li>)}</ul>
                        )}
                        {(a.etapes?.length ?? 0) > 0 && (
                          <ol className="space-y-0.5 text-[13px] text-muted-foreground">
                            {a.etapes!.slice(-12).map((e, i) => (
                              <li key={i}>
                                {fmt(e.le)} · {e.evt ? (EVT[e.evt] ?? STATUT[e.evt]?.label ?? e.evt) : `étape ${e.etape}`}
                                {e.par ? ` (${RESPONSABLE[e.par] ?? e.par})` : ''}{e.vers ? ` → ${RESPONSABLE[e.vers] ?? e.vers}` : ''}{e.motif ? ` — ${e.motif}` : ''}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
