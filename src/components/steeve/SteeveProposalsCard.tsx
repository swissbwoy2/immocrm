import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Mail, MessageSquare, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Proposal = {
  id: string;
  kind: 'note_agent' | 'changement_criteres' | 'relance_regie' | 'preuve_paiement';
  status: string;
  title: string;
  body: string;
  created_at: string;
  client_id: string;
  client_nom: string | null;
  conversation_id: string | null;
  bien: string | null;
  contact_regie: string | null;
};

const KIND_LABEL: Record<Proposal['kind'], string> = {
  note_agent: 'Note',
  changement_criteres: 'Critères',
  relance_regie: 'Relance de régie',
  preuve_paiement: 'Preuve de paiement',
};

const EMAIL_RX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

/**
 * Actions préparées par Steeve, à valider par l'équipe. Rien n'est exécuté automatiquement :
 * la personne fait l'action elle-même (e-mail ouvert dans sa messagerie, critères modifiés, compte activé),
 * puis marque la proposition « traitée », ou la rejette.
 */
export function SteeveProposalsCard({ basePath, hideWhenEmpty = false }: { basePath: '/admin' | '/agent'; hideWhenEmpty?: boolean }) {
  const [rows, setRows] = useState<Proposal[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fonction ajoutée par la migration 20261025222000
    const { data, error } = await (supabase.rpc as any)('staff_list_steeve_proposals', { p_status: 'a_valider', p_limit: 50 });
    setRows(error ? [] : ((data ?? []) as Proposal[]));
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (p: Proposal, status: 'traitee' | 'rejetee') => {
    setBusy(p.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fonction ajoutée par la migration 20261025222000
    const { error } = await (supabase.rpc as any)('staff_decide_steeve_proposal', { p_id: p.id, p_status: status, p_note: null });
    setBusy(null);
    if (error) { toast.error("La décision n'a pas pu être enregistrée"); return; }
    toast.success(status === 'traitee' ? 'Marquée comme traitée' : 'Proposition rejetée');
    void load();
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success('Texte copié'); } catch { toast.error('Copie impossible'); }
  };

  if (rows === null || rows.length === 0) {
    if (rows === null || hideWhenEmpty) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Propositions de Steeve</CardTitle>
          <CardDescription>Aucune action en attente de validation.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Propositions de Steeve <Badge className="ml-2">{rows.length}</Badge></CardTitle>
        <CardDescription>
          Steeve prépare, vous validez : rien n'est envoyé ni modifié sans vous. Faites l'action, puis marquez-la traitée.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-md border">
          {rows.map((p) => {
            const email = p.contact_regie?.match(EMAIL_RX)?.[0] ?? null;
            const mailto = p.kind === 'relance_regie' && email
              ? `mailto:${email}?subject=${encodeURIComponent(`Candidature – ${p.bien ?? ''}${p.client_nom ? ` – ${p.client_nom}` : ''}`)}&body=${encodeURIComponent(p.body)}`
              : null;
            return (
              <li key={p.id} className="space-y-2 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{KIND_LABEL[p.kind] ?? p.kind}</Badge>
                  <span className="font-medium">{p.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.client_nom ?? 'Client'} · {new Date(p.created_at).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                {p.bien && <p className="text-xs text-muted-foreground">Bien : {p.bien}{p.contact_regie ? ` · Régie : ${p.contact_regie}` : ''}</p>}
                <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-2">{p.body}</p>
                <div className="flex flex-wrap gap-2">
                  {mailto && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={mailto}><Mail className="mr-1 h-4 w-4" /> Ouvrir l'e-mail</a>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => void copy(p.body)}><Copy className="mr-1 h-4 w-4" /> Copier</Button>
                  {p.conversation_id && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`${basePath}/messagerie?conversationId=${p.conversation_id}`}><MessageSquare className="mr-1 h-4 w-4" /> Conversation</Link>
                    </Button>
                  )}
                  <Button size="sm" disabled={busy === p.id} onClick={() => void decide(p, 'traitee')}><Check className="mr-1 h-4 w-4" /> Traitée</Button>
                  <Button size="sm" variant="ghost" disabled={busy === p.id} onClick={() => void decide(p, 'rejetee')}><X className="mr-1 h-4 w-4" /> Rejeter</Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
