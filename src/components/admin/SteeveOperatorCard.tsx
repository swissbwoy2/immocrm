import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, CheckCircle2, ChevronDown, ChevronUp, Loader2, OctagonX, PlayCircle, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
const STATUT: Record<string, { label: string; tone: string }> = {
  a_faire: { label: 'À faire', tone: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100' },
  a_blanc: { label: 'À blanc (non envoyé)', tone: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100' },
  fait: { label: 'Fait', tone: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100' },
  bloque: { label: 'Bloqué', tone: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100' },
  a_valider: { label: 'À valider', tone: 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100' },
  annule: { label: 'Annulé', tone: 'bg-muted text-muted-foreground' },
  echec: { label: 'Échec', tone: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100' },
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

  if (!data) {
    return <Card><CardHeader><CardTitle>Steeve opérateur</CardTitle><CardDescription>Chargement…</CardDescription></CardHeader></Card>;
  }

  const anyBox = data.boites.some((b) => b.branchee);
  const today = data.aujourdhui ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Steeve opérateur
          <Badge variant={data.mode === 'autonome' ? 'default' : 'secondary'}>
            {data.mode === 'off' ? 'Arrêté' : data.mode === 'a_blanc' ? 'À blanc' : 'Autonome'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Steeve reprend les tâches des routines : lecture des réponses des régies (visites@, relocation@), demande du QR code Flatfox après la visite, relances oubliées, contrôle puis envoi des
          dossiers préparés dans relocation@. Bail, signature, dossier retenu, paiement et questions des régies restent à l'équipe.
          Chaque action est notée ci-dessous.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Mode de Steeve opérateur">
          <Button variant={data.mode === 'off' ? 'destructive' : 'outline'} disabled={busy} onClick={() => void setMode('off')} className="min-h-[44px]">
            <OctagonX className="mr-2 h-4 w-4" /> Arrêter
          </Button>
          <Button variant={data.mode === 'a_blanc' ? 'default' : 'outline'} disabled={busy} onClick={() => void setMode('a_blanc')} className="min-h-[44px]">
            <ShieldCheck className="mr-2 h-4 w-4" /> À blanc (48 h)
          </Button>
          <Button variant={data.mode === 'autonome' ? 'default' : 'outline'} disabled={busy} onClick={() => void setMode('autonome')} className="min-h-[44px]">
            <PlayCircle className="mr-2 h-4 w-4" /> Autonome
          </Button>
          {busy && <Loader2 className="h-4 w-4 animate-spin self-center" aria-label="Enregistrement" />}
        </div>
        <p className="text-sm text-muted-foreground">
          {data.mode === 'off' && 'Arrêté : Steeve ne fait plus rien (seul le chat reste actif).'}
          {data.mode === 'a_blanc' && (data.autonome_le
            ? `À blanc : il contrôle et note ce qu'il aurait envoyé. Passage en autonome le ${fmt(data.autonome_le)}, sauf arrêt d'ici là.`
            : "À blanc : les 48 h de contrôle commencent dès qu'une boîte d'envoi est branchée (ci-dessous).")}
          {data.mode === 'autonome' && 'Autonome : il envoie entre 7 h et 20 h ce qui passe tous les contrôles, au plus 15 dossiers et 20 relances par jour.'}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {data.boites.map((b) => (
            <div key={b.adresse} className="flex items-center gap-2 rounded-md border p-3 text-sm">
              {b.branchee ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Ban className="h-4 w-4 text-muted-foreground" />}
              <div>
                <p className="font-medium">{b.adresse}</p>
                <p className="text-xs text-muted-foreground">
                  {b.branchee ? (b.adresse.startsWith('relocation') ? 'Envoi des dossiers' : 'Envoi des demandes de QR et des relances') : 'Mot de passe à enregistrer dans « Boîtes e-mail partagées »'}
                </p>
              </div>
            </div>
          ))}
          {!anyBox && <p className="text-xs text-muted-foreground sm:col-span-2">Sans boîte branchée, Steeve ne peut rien envoyer ; il remet seulement la file des postulations en route.</p>}
        </div>

        <div className="flex flex-wrap gap-3 text-sm" aria-label="Dernières 24 heures">
          {Object.entries(STATUT).filter(([k]) => today[k]).map(([k, v]) => (
            <span key={k} className={cn('rounded-full px-2.5 py-1 text-xs font-medium', v.tone)}>{v.label} : {today[k]}</span>
          ))}
          {Object.keys(today).length === 0 && <span className="text-muted-foreground">Rien aujourd'hui.</span>}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrer le journal">
            {FILTERS.map((f) => (
              <button key={f.value} type="button" role="tab" aria-selected={filter === f.value} onClick={() => setFilter(f.value)}
                className={cn('min-h-[36px] rounded-full border px-3 text-xs', filter === f.value ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                {f.label}
              </button>
            ))}
          </div>
          {data.actions.length === 0 ? (
            <p className="rounded-md border p-4 text-sm text-muted-foreground">Aucune action dans le journal.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.actions.map((a) => {
                const s = STATUT[a.statut] ?? { label: a.statut, tone: 'bg-muted' };
                const expanded = open === a.id;
                return (
                  <li key={a.id} className="space-y-1.5 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', s.tone)}>{s.label}</span>
                      <span className="font-medium">{KIND[a.kind] ?? a.kind}</span>
                      <span className="text-xs text-muted-foreground">{fmt(a.created_at)}{a.source !== 'auto' ? ` · demandé (${a.source})` : ''}</span>
                    </div>
                    {(a.client_nom || a.bien) && <p className="text-xs text-muted-foreground">{[a.client_nom, a.bien].filter(Boolean).join(' — ')}</p>}
                    {a.destinataire && <p className="text-xs">De {a.mailbox ?? '—'} à {a.destinataire}{a.objet ? ` · « ${a.objet} »` : ''}</p>}
                    {a.motif && <p className="text-xs text-orange-800 dark:text-orange-200">{a.motif}</p>}
                    {a.note && <p className="text-xs text-muted-foreground">{a.note}</p>}
                    {a.preuve && <p className="break-all text-[11px] text-muted-foreground">Preuve : {a.preuve}</p>}
                    <div className="flex flex-wrap gap-2">
                      {(a.corps || (a.pieces?.length ?? 0) > 0) && (
                        <Button size="sm" variant="ghost" onClick={() => setOpen(expanded ? null : a.id)} aria-expanded={expanded}>
                          {expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />} Détail
                        </Button>
                      )}
                      {['a_faire', 'a_valider', 'bloque', 'a_blanc'].includes(a.statut) && (
                        <Button size="sm" variant="ghost" onClick={() => void cancel(a.id)}>Annuler</Button>
                      )}
                      {a.kind === 'envoi_dossier' && a.statut === 'bloque' && (
                        <Button size="sm" variant="ghost" asChild><Link to="/admin/postulations">Postulations</Link></Button>
                      )}
                    </div>
                    {expanded && (
                      <div className="space-y-2 rounded-md bg-muted/40 p-2 text-xs">
                        {a.corps && <p className="whitespace-pre-wrap">{a.corps}</p>}
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
      </CardContent>
    </Card>
  );
}
