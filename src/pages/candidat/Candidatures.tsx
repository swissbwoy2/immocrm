import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RelocationTimeline } from '@/components/candidature/RelocationTimeline';
import { Home, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VisiteConfirmGate } from '@/components/candidature/VisiteConfirmGate';
import { CandidatDocumentsSection } from '@/components/candidature/CandidatDocumentsSection';
import { ouvrirConversationAnnonce } from '@/components/messaging/ConversationsAnnoncePanel';
import type { UnifiedCandidature } from '@/hooks/useCandidatCandidatures';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCandidatCandidatures, statutLabel, RETENU_BAILLEUR } from '@/hooks/useCandidatCandidatures';

type Filter = 'toutes' | 'en_cours' | 'retenues' | 'terminees';
const CLOSED = ['refuse', 'refusee', 'desiste'];

export default function CandidatCandidatures() {
  const { data = [], isLoading } = useCandidatCandidatures();
  const [filter, setFilter] = useState<Filter>('toutes');
  const qc = useQueryClient();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [askVisit, setAskVisit] = useState<UnifiedCandidature | null>(null);
  const navigate = useNavigate();
  const now = Date.now();
  const eligibles = data.filter((c) => c.source === 'location' && !c.annulee && ['en_attente', 'visite_effectuee'].includes(c.statut) && c.date_visite && new Date(c.date_visite).getTime() < now);

  const deposer = () => {
    if (!selected) return;
    navigate(`/candidat/demande?candidature=${selected}`);
  };
  const contacter = async (annonceId: string) => {
    const id = await ouvrirConversationAnnonce(annonceId);
    if (id) navigate(`/candidat/messages?conversation=${id}`);
  };

  const confirmer = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('candidat_confirmer_attribution', { _id: id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Confirmation enregistrée');
    qc.invalidateQueries({ queryKey: ['candidat-candidatures'] });
  };

  const list = useMemo(() => data.filter((c) => {
    if (filter === 'en_cours') return !CLOSED.includes(c.statut);
    if (filter === 'retenues') return c.statut === RETENU_BAILLEUR;
    if (filter === 'terminees') return CLOSED.includes(c.statut);
    return true;
  }), [data, filter]);

  return (
    <div className="flex-1 overflow-y-auto">
      <VisiteConfirmGate list={data} force={askVisit} onClose={() => setAskVisit(null)} />
      <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
        <h1 className="text-2xl font-bold text-foreground">Mes candidatures</h1>
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="font-semibold text-foreground">Déposer une candidature</p>
            {eligibles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Vous pourrez déposer votre candidature une fois la visite d'un logement effectuée.</p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger className="sm:flex-1"><SelectValue placeholder="Choisir le logement visité" /></SelectTrigger>
                  <SelectContent>
                    {eligibles.map((c) => <SelectItem key={c.id} value={c.id}>{c.adresse}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button disabled={!selected || busy} onClick={deposer} className="min-h-[44px]">Envoyer ma candidature</Button>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-2">
          {([['toutes', 'Toutes'], ['en_cours', 'En cours'], ['retenues', 'Retenues'], ['terminees', 'Terminées']] as [Filter, string][]).map(([k, l]) => (
            <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} className="min-h-[36px]" onClick={() => setFilter(k)}>{l}</Button>
          ))}
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : list.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Aucune candidature pour le moment.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((c) => (
              <Card key={`${c.source}-${c.id}`}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start gap-3">
                    <Home className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{c.adresse}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.date ? new Date(c.date).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' }) : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.annulee ? (
                      <Badge variant="destructive">Annulé — nouvelle date à venir</Badge>
                    ) : (
                      <Badge variant={c.statut === RETENU_BAILLEUR ? 'default' : CLOSED.includes(c.statut) ? 'destructive' : 'secondary'}>
                        {statutLabel(c.statut)}
                      </Badge>
                    )}
                    <Badge variant="outline">{c.dossier}</Badge>
                  </div>
                  {c.annulee && c.annulation_message && (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{c.annulation_message}</p>
                  )}
                  {c.source === 'location' && (c.raw?.date_depot || ['candidature_deposee', 'documents_demandes', 'retenu_bailleur', 'bail_signe', 'etat_lieux_effectue', 'cles_remises', 'refusee', 'desiste'].includes(c.statut)) && <RelocationTimeline r={{ ...c.raw, statut: c.statut }} />}
                  {c.source === 'location' && <CandidatDocumentsSection candidatureId={c.id} />}
                  {c.source === 'location' && !c.annulee && c.raw?.visite_confirmee !== true && ['en_attente', 'visite_planifiee'].includes(c.statut) && c.date_visite && new Date(c.date_visite).getTime() < now && (
                    <Button size="sm" variant="outline" className="min-h-[44px] w-full" onClick={() => setAskVisit(c)}>Avez-vous visité cet objet ? Répondre</Button>
                  )}
                  {c.source === 'location' && c.raw?.annonce_id && (
                    <Button size="sm" variant="outline" className="min-h-[44px] w-full" onClick={() => contacter(c.raw.annonce_id)}><MessageCircle className="mr-1 h-4 w-4" />Contacter</Button>
                  )}
                  {c.source === 'location' && c.statut === RETENU_BAILLEUR && !c.raw?.candidat_confirme_at && (
                    <Button size="sm" disabled={busy} onClick={() => confirmer(c.id)} className="min-h-[44px] w-full">Je confirme vouloir conclure</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
