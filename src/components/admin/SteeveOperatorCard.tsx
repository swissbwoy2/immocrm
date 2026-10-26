import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Bot, CheckCircle2, ChevronDown, ChevronUp, Loader2, OctagonX, PlayCircle, ShieldCheck } from 'lucide-react';
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
};
type Overview = {
  mode: Mode; depuis: string | null; autonome_le: string | null;
  boites: { adresse: string; branchee: boolean; lecture_active: boolean }[];
  aujourdhui: Record<string, number>;
  actions: Action[];
};

const KIND: Record<string, string> = {
  demande_qr: 'Demande de QR Flatfox', relance_annonceur: 'Relance d’annonceur', envoi_dossier: 'Envoi du dossier',
  triage_postulations: 'File des postulations', demande_postulation: 'Postulation demandée', lecon: 'Réglage',
  lecture_mail: 'Réponse lue (régie / annonceur)',
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
};
const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tout' }, { value: 'fait', label: 'Faits' }, { value: 'a_blanc', label: 'À blanc' },
  { value: 'bloque', label: 'Bloqués' }, { value: 'a_faire', label: 'À faire' }, { value: 'echec', label: 'Échecs' },
];
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
              Steeve reprend les tâches des routines : lecture des réponses des régies (visites@, relocation@), demande du QR code Flatfox après la visite, relances oubliées, contrôle puis envoi des
              dossiers préparés dans relocation@. Bail, signature, dossier retenu, paiement et questions des régies restent à l'équipe.
              Chaque action est notée ci-dessous.
            </p>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Mode de Steeve opérateur">
          <Button variant={data.mode === 'off' ? 'destructive' : 'outline'} disabled={busy} onClick={() => void setMode('off')} className="min-h-[44px]">
            <OctagonX className="mr-2 h-4 w-4" /> Arrêter
          </Button>
          <Button variant={data.mode === 'a_blanc' ? 'default' : 'outline'} disabled={busy} onClick={() => void setMode('a_blanc')} className="min-h-[44px]">
            <ShieldCheck className="mr-2 h-4 w-4" /> À blanc (48 h)
          </Button>
          <Button variant={data.mode === 'autonome' ? 'default' : 'outline'} disabled={busy} onClick={() => void setMode('autonome')} className="min-h-[44px]">
            <PlayCircle className="mr-2 h-4 w-4" /> Autonome
          </Button>
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
          {busy && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-label="Enregistrement" />}
          <span>
            {data.mode === 'off' && 'Arrêté : Steeve ne fait plus rien (seul le chat reste actif).'}
            {data.mode === 'a_blanc' && (data.autonome_le
              ? `À blanc : il contrôle et note ce qu'il aurait envoyé. Passage en autonome le ${fmt(data.autonome_le)}, sauf arrêt d'ici là.`
              : "À blanc : les 48 h de contrôle commencent dès qu'une boîte d'envoi est branchée (ci-dessous).")}
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
        <p className="mt-1 text-sm text-muted-foreground">Chaque action de l'opérateur, avec sa preuve. Les actions en attente peuvent être annulées.</p>
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
                    <p className="text-muted-foreground">{fmt(a.created_at)}{a.source !== 'auto' ? ` · demandé (${a.source})` : ''}</p>
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
                      {['a_faire', 'a_valider', 'bloque', 'a_blanc'].includes(a.statut) && (
                        <Button variant="ghost" className="min-h-11" onClick={() => void cancel(a.id)}>Annuler</Button>
                      )}
                      {a.kind === 'envoi_dossier' && a.statut === 'bloque' && (
                        <Button variant="ghost" className="min-h-11" asChild><Link to="/admin/postulations">Postulations</Link></Button>
                      )}
                    </div>
                    {expanded && (
                      <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-sm">
                        {a.corps && <p className="whitespace-pre-wrap break-words">{a.corps}</p>}
                        {(a.pieces?.length ?? 0) > 0 && (
                          <ul className="list-disc pl-4">{a.pieces!.map((p) => <li key={p.nom}>{p.nom} ({Math.round(p.taille / 1024)} Ko)</li>)}</ul>
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
