import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Search, Filter, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { PremiumAssuranceCard } from '@/components/premium/PremiumAssuranceCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';

export default function Assurances() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assurances, setAssurances] = useState<any[]>([]);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [immeubleFilter, setImmeubleFilter] = useState('all');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: proprio } = await supabase.from('proprietaires').select('id').eq('user_id', user.id).single();
      if (!proprio) { setLoading(false); return; }
      const { data: immeublesData } = await supabase.from('immeubles').select('id, nom').eq('proprietaire_id', proprio.id);
      setImmeubles(immeublesData || []);
      const immeubleIds = (immeublesData || []).map(i => i.id);
      if (immeubleIds.length === 0) { setLoading(false); return; }
      const { data: assData } = await supabase.from('assurances_immeuble').select('*, immeuble:immeubles(id, nom)').in('immeuble_id', immeubleIds).order('date_prochaine_echeance');
      setAssurances(assData || []);
    } catch (error) { toast.error('Erreur'); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredAssurances = assurances.filter(a => {
    const matchesSearch = a.assureur.toLowerCase().includes(searchTerm.toLowerCase()) || a.immeuble?.nom?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || a.type_assurance === typeFilter;
    const matchesImmeuble = immeubleFilter === 'all' || a.immeuble?.id === immeubleFilter;
    return matchesSearch && matchesType && matchesImmeuble;
  });

  const totalPrimes = assurances.reduce((acc, a) => acc + (a.prime_annuelle || 0), 0);
  const totalValeur = assurances.reduce((acc, a) => acc + (a.valeur_assuree || 0), 0);
  const aRenouveler = assurances.filter(a => a.date_prochaine_echeance && differenceInDays(new Date(a.date_prochaine_echeance), new Date()) <= 60 && differenceInDays(new Date(a.date_prochaine_echeance), new Date()) > 0).length;
  const types = Array.from(new Set(assurances.map(a => a.type_assurance).filter(Boolean)));

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader title="Assurances" subtitle={`${assurances.length} police(s)`} icon={Shield} action={<Button onClick={() => navigate('/proprietaire/assurances/nouveau')}><Plus className="w-4 h-4 mr-2" />Nouvelle assurance</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Polices actives</p><p className="text-2xl font-bold">{assurances.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Primes annuelles</p><p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(totalPrimes)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Valeur assurée</p><p className="text-2xl font-bold">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(totalValeur)}</p></CardContent></Card>
        <Card className={aRenouveler > 0 ? 'border-amber-300' : ''}><CardContent className="p-4"><div className="flex items-center gap-2">{aRenouveler > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}<p className="text-sm text-muted-foreground">À renouveler (60j)</p></div><p className={`text-2xl font-bold ${aRenouveler > 0 ? 'text-amber-600' : ''}`}>{aRenouveler}</p></CardContent></Card>
      </div>
      <Card className="mb-6"><CardContent className="p-4"><div className="flex flex-col md:flex-row gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div><Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem>{types.map((t) => <SelectItem key={t} value={t!}>{t}</SelectItem>)}</SelectContent></Select><Select value={immeubleFilter} onValueChange={setImmeubleFilter}><SelectTrigger className="w-full md:w-48"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Immeuble" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem>{immeubles.map((i) => <SelectItem key={i.id} value={i.id}>{i.nom}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
      {filteredAssurances.length === 0 ? <PremiumEmptyState icon={Shield} title="Aucune assurance" description="Aucune police d'assurance." /> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{filteredAssurances.map((a) => <PremiumAssuranceCard key={a.id} assurance={{ id: a.id, typeAssurance: a.type_assurance, assureur: a.assureur, numeroPolice: a.numero_police, primeAnnuelle: a.prime_annuelle, franchise: a.franchise, valeurAssuree: a.valeur_assuree, dateDebut: a.date_debut, dateFin: a.date_fin, dateProchaineEcheance: a.date_prochaine_echeance, risquesCouverts: a.risques_couverts }} immeubleName={a.immeuble?.nom} onClick={() => navigate(`/proprietaire/assurances/${a.id}`)} />)}</div>}
    </div>
  );
}
