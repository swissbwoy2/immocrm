import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Mail, Phone, MapPin, Wallet, Home, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Prospects = comptes « candidat » (inscrits via le portail ou Google) qui n'ont pas
 * encore de dossier client. LECTURE SEULE : rien n'est créé ni modifié ici.
 */
export interface CandidatProspect {
  user_id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  created_at: string | null;
  last_seen_at: string | null;
  region_recherche: string | null;
  budget_max: number | null;
  pieces_recherche: string | number | null;
  revenus_mensuels: number | null;
  garant_solvable: boolean | null;
  mandat_statut: string | null;
  nb_candidatures: number;
}

const chunk = <T,>(arr: T[], size = 100): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

async function selectIn(table: string, columns: string, key: string, ids: string[]): Promise<any[]> {
  const rows: any[] = [];
  for (const part of chunk(ids)) {
    const { data, error } = await (supabase.from as any)(table).select(columns).in(key, part).limit(5000);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

export async function fetchCandidatProspects(): Promise<CandidatProspect[]> {
  const { data: roleRows, error: roleErr } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'candidat' as any)
    .limit(10000);
  if (roleErr) throw roleErr;
  const candidatIds = Array.from(new Set((roleRows || []).map((r: any) => r.user_id as string)));
  if (candidatIds.length === 0) return [];

  // Exclut ceux qui ont déjà un dossier client (non anonymisé) : ils sont dans les autres onglets.
  const clientRows = await selectIn('clients', 'user_id, anonymise_at', 'user_id', candidatIds);
  const withClient = new Set(clientRows.filter((c) => !c.anonymise_at).map((c) => c.user_id));
  const ids = candidatIds.filter((id) => !withClient.has(id));
  if (ids.length === 0) return [];

  const [profiles, criteres, credits, cands] = await Promise.all([
    selectIn('profiles', 'id, prenom, nom, email, telephone, created_at, last_seen_at', 'id', ids),
    selectIn('candidat_criteres', 'user_id, region_recherche, budget_max, pieces_recherche, revenus_mensuels, garant_solvable', 'user_id', ids),
    selectIn('user_credits', 'user_id, mandat_statut', 'user_id', ids),
    selectIn('candidatures_location', 'user_id', 'user_id', ids),
  ]);
  const pMap = new Map(profiles.map((p) => [p.id, p]));
  const cMap = new Map(criteres.map((c) => [c.user_id, c]));
  const crMap = new Map(credits.map((c) => [c.user_id, c]));
  const nbMap = new Map<string, number>();
  cands.forEach((c) => nbMap.set(c.user_id, (nbMap.get(c.user_id) || 0) + 1));

  return ids
    .map((id) => {
      const p = pMap.get(id) || {};
      const c = cMap.get(id) || {};
      return {
        user_id: id,
        prenom: p.prenom ?? null,
        nom: p.nom ?? null,
        email: p.email ?? null,
        telephone: p.telephone ?? null,
        created_at: p.created_at ?? null,
        last_seen_at: p.last_seen_at ?? null,
        region_recherche: c.region_recherche ?? null,
        budget_max: c.budget_max ?? null,
        pieces_recherche: c.pieces_recherche ?? null,
        revenus_mensuels: c.revenus_mensuels ?? null,
        garant_solvable: c.garant_solvable ?? null,
        mandat_statut: crMap.get(id)?.mandat_statut ?? null,
        nb_candidatures: nbMap.get(id) || 0,
      } as CandidatProspect;
    })
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

const COMPTEUR_LABEL: Record<string, string> = {
  aucun: 'Essai non démarré',
  essai: 'Essai en cours',
  expire: 'Essai terminé',
  actif: 'Mandat actif',
  suspendu: 'Suspendu',
};

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return '—'; }
};

export function CandidatProspectsList({ rows, loading, error }: { rows: CandidatProspect[]; loading: boolean; error?: string | null }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [onlyCriteres, setOnlyCriteres] = useState(false);
  const [display, setDisplay] = useState(50);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyCriteres && !(r.region_recherche && r.budget_max)) return false;
      if (!term) return true;
      return [r.prenom, r.nom, r.email, r.telephone, r.region_recherche]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [rows, q, onlyCriteres]);

  if (loading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (error) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Impossible de charger les prospects : {error}</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            Comptes inscrits comme candidats (portail d'annonces ou Google) qui n'ont pas encore de dossier client.
            Ils apparaîtront dans les autres onglets dès qu'ils démarrent leur essai ou signent un mandat. Lecture seule.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un prospect…" className="pl-10" />
            </div>
            <Button variant={onlyCriteres ? 'default' : 'outline'} size="sm" onClick={() => setOnlyCriteres((v) => !v)}>
              Critères complets uniquement
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/candidatures-relocation')}>
              <FileText className="mr-1 h-4 w-4" /> Candidats location
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} prospect{filtered.length > 1 ? 's' : ''}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.slice(0, display).map((r) => {
          const name = `${r.prenom || ''} ${r.nom || ''}`.trim() || 'Sans nom';
          return (
            <Card key={r.user_id} className="bg-card/80 backdrop-blur-xl border-border/50">
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground truncate">{name}</p>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {r.mandat_statut ? (COMPTEUR_LABEL[r.mandat_statut] || r.mandat_statut) : 'Sans compteur'}
                  </Badge>
                </div>
                {r.email && <p className="flex items-center gap-1.5 text-muted-foreground truncate"><Mail className="h-3.5 w-3.5 shrink-0" /> <a className="truncate hover:underline" href={`mailto:${r.email}`}>{r.email}</a></p>}
                {r.telephone && <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0" /> <a className="hover:underline" href={`tel:${r.telephone}`}>{r.telephone}</a></p>}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.region_recherche || 'Zone non renseignée'}</span>
                  <span className="flex items-center gap-1"><Home className="h-3 w-3" /> {r.pieces_recherche ?? '—'} pièces</span>
                  <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> {r.budget_max ? `${r.budget_max} CHF` : 'Budget —'}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Inscrit le {fmtDate(r.created_at)}</span>
                  <span>Vu le {fmtDate(r.last_seen_at)}</span>
                  <span>{r.nb_candidatures} candidature{r.nb_candidatures > 1 ? 's' : ''}</span>
                  {r.revenus_mensuels ? <span>Revenus {r.revenus_mensuels} CHF</span> : null}
                  {r.garant_solvable ? <span>Garant solvable</span> : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {filtered.length > display && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setDisplay((d) => d + 50)}>Afficher plus</Button>
        </div>
      )}
    </div>
  );
}
