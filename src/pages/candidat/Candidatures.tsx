import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RelocationTimeline } from '@/components/candidature/RelocationTimeline';
import { Home } from 'lucide-react';
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
  const now = Date.now();
  const eligibles = data.filter((c) => c.source === 'location' && !c.annulee && (c.statut === 'en_attente') && c.date_visite && new Date(c.date_visite).getTime() < now);

  const deposer = async () => {
    if (!selected || busy) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('candidat_deposer_candidature', { _id: selected });
    if (error) { setBusy(false); toast.error(error.message); return; }
    supabase.functions.invoke('candidature-relocation-notify', { body: { candidature_id: selected, etape: 'candidature_deposee' } }).catch(() => {});
    toast.success('Candidature envoyée');
    setSelected(''); setBusy(false);
    qc.invalidateQueries({ queryKey: ['candidat-candidatures'] });
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
                    <Badge variant={c.statut === RETENU_BAILLEUR ? 'default' : CLOSED.includes(c.statut) ? 'destructive' : 'secondary'}>
                      {statutLabel(c.statut)}
                    </Badge>
                    <Badge variant="outline">{c.dossier}</Badge>
                  </div>
                  {c.source === 'location' && c.raw?.date_depot && <RelocationTimeline r={c.raw} />}
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
