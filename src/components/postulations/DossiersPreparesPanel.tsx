import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronDown, ExternalLink, Loader2, Paperclip, ShieldAlert, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

/**
 * File « Dossiers préparés » : candidatures préparées par une routine (ChatGPT, etc.)
 * et contrôlées par la routine Surveillance. Celles qui ne passent pas les contrôles
 * arrivent ici « À valider » : l'agent valide d'un clic, la Surveillance envoie
 * au passage suivant et enregistre la preuve.
 */
type Dossier = {
  id: string;
  offre_id: string | null;
  client_id: string | null;
  canal: string;
  regie_nom: string | null;
  destinataire_email: string | null;
  objet: string | null;
  adresse_bien: string | null;
  reference_bien: string | null;
  client_nom: string | null;
  brouillon_ref: string | null;
  pieces: unknown;
  formulaire_location_ok: boolean | null;
  rapport: string | null;
  statut: string;
  motif_blocage: string | null;
  valide_le: string | null;
  envoye_le: string | null;
  preuve_envoi: string | null;
  created_at: string;
};

const CANAL: Record<string, string> = {
  email: 'E-mail info@',
  flatfox: 'Flatfox',
  immobilier: 'immobilier.ch',
  naef_ecandidat: 'e-candidat Naef',
  autre: 'Autre',
};

const STATUT: Record<string, { label: string; className: string }> = {
  prepare: { label: 'En contrôle', className: 'bg-muted text-muted-foreground border-border' },
  a_valider: { label: 'À valider', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  valide: { label: 'Validé — envoi au prochain passage', className: 'bg-sky-100 text-sky-800 border-sky-300' },
  envoye: { label: 'Envoyé', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  refuse: { label: 'Refusé', className: 'bg-red-100 text-red-800 border-red-300' },
  erreur: { label: 'Erreur d’envoi', className: 'bg-red-100 text-red-800 border-red-300' },
};

const ORDRE = ['a_valider', 'erreur', 'prepare', 'valide', 'envoye', 'refuse'];

export function DossiersPreparesPanel() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [voirTout, setVoirTout] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const depuis = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await (supabase as any)
      .from('postulations_preparees')
      .select('*')
      .gte('created_at', depuis)
      .order('created_at', { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      // Table absente ou droits insuffisants : on n'affiche simplement rien.
      setRows([]);
      return;
    }
    setRows((data ?? []) as Dossier[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const decider = async (d: Dossier, statut: 'valide' | 'refuse') => {
    setBusy(d.id);
    const patch: Record<string, unknown> = { statut, updated_at: new Date().toISOString() };
    if (statut === 'valide') { patch.valide_par = user?.id ?? null; patch.valide_le = new Date().toISOString(); }
    const { error } = await (supabase as any).from('postulations_preparees').update(patch).eq('id', d.id);
    setBusy(null);
    if (error) { toast.error('Impossible d’enregistrer la décision'); return; }
    toast.success(statut === 'valide' ? 'Validé : la routine l’enverra au prochain passage' : 'Dossier refusé');
    load();
  };

  const tries = [...rows].sort((a, b) => ORDRE.indexOf(a.statut) - ORDRE.indexOf(b.statut));
  const aValider = rows.filter((r) => r.statut === 'a_valider' || r.statut === 'erreur').length;
  const visibles = voirTout ? tries : tries.filter((r) => ['a_valider', 'erreur', 'prepare', 'valide'].includes(r.statut));

  if (!loading && rows.length === 0) return null;

  return (
    <Card>
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              Dossiers préparés
              {aValider > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">{aValider} à valider</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              Préparés par la routine Postulation, contrôlés par la Surveillance. Ce qui passe tous les contrôles part seul ; le reste attend ici.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setVoirTout((v) => !v)}>
            {voirTout ? 'Masquer envoyés / refusés' : 'Voir aussi envoyés / refusés'}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : visibles.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Rien à valider pour le moment.</p>
        ) : (
          <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
            {visibles.map((d) => {
              const s = STATUT[d.statut] ?? STATUT.prepare;
              const pieces = Array.isArray(d.pieces) ? (d.pieces as unknown[]).length : 0;
              const decidable = d.statut === 'a_valider' || d.statut === 'erreur';
              return (
                <li key={d.id} className="space-y-2 p-3 md:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.client_nom || 'Client'} — {d.adresse_bien || d.objet || 'Bien'}</p>
                      <p className="text-xs text-muted-foreground">
                        {CANAL[d.canal] ?? d.canal}
                        {d.regie_nom ? ` · ${d.regie_nom}` : ''}
                        {d.destinataire_email ? ` · ${d.destinataire_email}` : ''}
                        {' · '}préparé le {format(new Date(d.created_at), 'dd.MM.yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <Badge variant="outline" className={s.className}>{s.label}</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> {pieces} pièce{pieces > 1 ? 's' : ''}</span>
                    {d.formulaire_location_ok === false && <span className="text-amber-700">Formulaire de location incomplet</span>}
                    {d.envoye_le && <span>Envoyé le {format(new Date(d.envoye_le), 'dd.MM.yyyy HH:mm', { locale: fr })}</span>}
                    {d.offre_id && (
                      <Link to={`/admin/offres-auto?offre=${d.offre_id}`} className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" /> Offre
                      </Link>
                    )}
                  </div>

                  {d.motif_blocage && (
                    <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {d.motif_blocage}
                    </p>
                  )}

                  {(d.rapport || d.brouillon_ref || d.preuve_envoi) && (
                    <button type="button" className="inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                      onClick={() => setOuvert(ouvert === d.id ? null : d.id)}>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${ouvert === d.id ? 'rotate-180' : ''}`} />
                      Détails
                    </button>
                  )}
                  {ouvert === d.id && (
                    <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-xs">
                      {d.brouillon_ref && <p><span className="font-medium">Brouillon :</span> {d.brouillon_ref}</p>}
                      {d.preuve_envoi && <p><span className="font-medium">Preuve d’envoi :</span> {d.preuve_envoi}</p>}
                      {d.rapport && <p className="whitespace-pre-line">{d.rapport}</p>}
                    </div>
                  )}

                  {decidable && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" className="rounded-full" disabled={busy === d.id} onClick={() => decider(d, 'valide')}>
                        {busy === d.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                        Valider l’envoi
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full" disabled={busy === d.id} onClick={() => decider(d, 'refuse')}>
                        <XCircle className="mr-1.5 h-4 w-4" /> Refuser
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
