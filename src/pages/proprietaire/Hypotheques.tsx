import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, Plus, Search, Filter, TrendingDown, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { PremiumHypothequeCard } from '@/components/premium/PremiumHypothequeCard';
import { AddHypothequeDialog } from '@/components/proprietaire/AddHypothequeDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Hypotheques() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hypotheques, setHypotheques] = useState<any[]>([]);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [immeubleFilter, setImmeubleFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: proprio } = await supabase.from('proprietaires').select('id').eq('user_id', user.id).single();
      if (!proprio) { setLoading(false); return; }
      const { data: immeublesData } = await supabase.from('immeubles').select('id, nom, valeur_estimee').eq('proprietaire_id', proprio.id);
      setImmeubles(immeublesData || []);
      const immeubleIds = (immeublesData || []).map(i => i.id);
      if (immeubleIds.length === 0) { setLoading(false); return; }
      const { data: hypData } = await supabase.from('hypotheques').select('*, immeuble:immeubles(id, nom)').in('immeuble_id', immeubleIds).order('rang');
      setHypotheques(hypData || []);
    } catch (error) { toast.error('Erreur'); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredHypotheques = hypotheques.filter(h => {
    const matchesSearch = h.creancier.toLowerCase().includes(searchTerm.toLowerCase()) || h.immeuble?.nom?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesImmeuble = immeubleFilter === 'all' || h.immeuble?.id === immeubleFilter;
    return matchesSearch && matchesImmeuble;
  });

  const totalDette = hypotheques.reduce((acc, h) => acc + (h.montant_actuel || h.montant_initial), 0);
  const totalValeur = immeubles.reduce((acc, i) => acc + (i.valeur_estimee || 0), 0);
  const tauxEndettement = totalValeur > 0 ? (totalDette / totalValeur) * 100 : 0;
  const tauxMoyen = hypotheques.length > 0 ? hypotheques.reduce((acc, h) => acc + (h.taux_interet || 0), 0) / hypotheques.length : 0;

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader title="Hypothèques" subtitle={`${hypotheques.length} financement(s)`} icon={Landmark} action={<Button onClick={() => setShowAddDialog(true)}><Plus className="w-4 h-4 mr-2" />Nouvelle hypothèque</Button>} />
      <AddHypothequeDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onSuccess={loadData} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Dette totale</p><p className="text-2xl font-bold text-destructive">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(totalDette)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Valeur des biens</p><p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(totalValeur)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><TrendingDown className="w-4 h-4 text-muted-foreground" /><p className="text-sm text-muted-foreground">Taux endettement</p></div><p className={`text-2xl font-bold ${tauxEndettement > 80 ? 'text-destructive' : tauxEndettement > 65 ? 'text-amber-600' : 'text-emerald-600'}`}>{tauxEndettement.toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2"><Percent className="w-4 h-4 text-muted-foreground" /><p className="text-sm text-muted-foreground">Taux moyen</p></div><p className="text-2xl font-bold">{tauxMoyen.toFixed(2)}%</p></CardContent></Card>
      </div>
      <Card className="mb-6"><CardContent className="p-4"><div className="flex flex-col md:flex-row gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div><Select value={immeubleFilter} onValueChange={setImmeubleFilter}><SelectTrigger className="w-full md:w-48"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Immeuble" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem>{immeubles.map((i) => <SelectItem key={i.id} value={i.id}>{i.nom}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
      {filteredHypotheques.length === 0 ? <PremiumEmptyState icon={Landmark} title="Aucune hypothèque" description="Aucun financement hypothécaire." /> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{filteredHypotheques.map((h) => <PremiumHypothequeCard key={h.id} hypotheque={{ id: h.id, numero: h.numero, rang: h.rang, creancier: h.creancier, numeroPret: h.numero_pret, montantInitial: h.montant_initial, montantActuel: h.montant_actuel, tauxInteret: h.taux_interet, typeTaux: h.type_taux, dateDebut: h.date_debut, dateFin: h.date_fin, typeAmortissement: h.type_amortissement, montantAmortissement: h.montant_amortissement }} immeubleName={h.immeuble?.nom} onClick={() => navigate(`/proprietaire/hypotheques/${h.id}`)} />)}</div>}
    </div>
  );
}
