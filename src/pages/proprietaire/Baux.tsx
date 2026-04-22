import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Filter, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { PremiumBailCard } from '@/components/premium/PremiumBailCard';
import { AddBailDialog } from '@/components/proprietaire/AddBailDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';

export default function Baux() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [baux, setBaux] = useState<any[]>([]);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('all');
  const [immeubleFilter, setImmeubleFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: proprio } = await supabase.from('proprietaires').select('id').eq('user_id', user.id).single();
      if (!proprio) { setLoading(false); return; }
      const { data: immeublesData } = await supabase.from('immeubles').select('id, nom').eq('proprietaire_id', proprio.id);
      setImmeubles(immeublesData || []);
      const immeubleIds = (immeublesData || []).map(i => i.id);
      if (immeubleIds.length === 0) { setLoading(false); return; }
      const { data: lotsData } = await supabase.from('lots').select('id').in('immeuble_id', immeubleIds);
      const lotIds = (lotsData || []).map(l => l.id);
      if (lotIds.length === 0) { setLoading(false); return; }
      const { data: bauxData } = await supabase.from('baux').select('*, lot:lots(id, reference, designation, immeuble:immeubles(id, nom)), locataire:locataires_immeuble(id, nom, prenom)').in('lot_id', lotIds).order('date_debut', { ascending: false });
      setBaux(bauxData || []);
    } catch (error) { toast.error('Erreur'); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredBaux = baux.filter(b => {
    const name = b.locataire ? `${b.locataire.prenom || ''} ${b.locataire.nom}`.toLowerCase() : '';
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || b.lot?.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatut = statutFilter === 'all' || b.statut === statutFilter;
    const matchesImmeuble = immeubleFilter === 'all' || b.lot?.immeuble?.id === immeubleFilter;
    return matchesSearch && matchesStatut && matchesImmeuble;
  });

  const activeBaux = baux.filter(b => b.statut === 'actif').length;
  const totalLoyer = baux.filter(b => b.statut === 'actif').reduce((acc, b) => acc + (b.total_mensuel || 0), 0);
  const bauxExpirant = baux.filter(b => b.date_fin && b.statut === 'actif' && differenceInDays(new Date(b.date_fin), new Date()) <= 90 && differenceInDays(new Date(b.date_fin), new Date()) > 0).length;

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-4 md:p-8 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      <PremiumPageHeader title="Baux" subtitle={`${baux.length} contrat(s)`} icon={FileText} action={<Button onClick={() => setShowAddDialog(true)}><Plus className="w-4 h-4 mr-2" />Nouveau bail</Button>} />
      <AddBailDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onSuccess={loadData} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Baux actifs</p><p className="text-2xl font-bold">{activeBaux}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Loyers mensuels</p><p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(totalLoyer)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Loyers annuels</p><p className="text-2xl font-bold">{new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(totalLoyer * 12)}</p></CardContent></Card>
        <Card className={bauxExpirant > 0 ? 'border-amber-300' : ''}><CardContent className="p-4"><div className="flex items-center gap-2">{bauxExpirant > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}<p className="text-sm text-muted-foreground">Expirent sous 90j</p></div><p className={`text-2xl font-bold ${bauxExpirant > 0 ? 'text-amber-600' : ''}`}>{bauxExpirant}</p></CardContent></Card>
      </div>
      <Card className="mb-6"><CardContent className="p-4"><div className="flex flex-col md:flex-row gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div><Select value={statutFilter} onValueChange={setStatutFilter}><SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="actif">Actif</SelectItem><SelectItem value="resilie">Résilié</SelectItem></SelectContent></Select><Select value={immeubleFilter} onValueChange={setImmeubleFilter}><SelectTrigger className="w-full md:w-48"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Immeuble" /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem>{immeubles.map((i) => <SelectItem key={i.id} value={i.id}>{i.nom}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>
      {filteredBaux.length === 0 ? <PremiumEmptyState icon={FileText} title="Aucun bail" description="Aucun contrat de bail." /> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{filteredBaux.map((b) => <PremiumBailCard key={b.id} bail={{ id: b.id, dateDebut: b.date_debut, dateFin: b.date_fin, loyerActuel: b.loyer_actuel, totalMensuel: b.total_mensuel, statut: b.statut, montantGarantie: b.montant_garantie, typeGarantie: b.type_garantie }} lotReference={b.lot?.reference} immeubleName={b.lot?.immeuble?.nom} locataireName={b.locataire ? `${b.locataire.prenom || ''} ${b.locataire.nom}`.trim() : undefined} onClick={() => navigate(`/proprietaire/baux/${b.id}`)} />)}</div>}
    </div>
  );
}
