import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bike, Users, CheckCircle, Clock, Wallet, UserPlus, Loader2, MapPin, DollarSign, Send, Calendar, Search, TrendingUp, Eye, Phone, Mail, AlertTriangle, ArrowUpDown, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminCoursiers() {
  const [coursiers, setCoursiers] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [eligibleVisites, setEligibleVisites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [delegating, setDelegating] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCoursier, setNewCoursier] = useState({ email: '', prenom: '', nom: '', telephone: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoursier, setSelectedCoursier] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [{ data: coursiersData }, { data: missionsData }, { data: eligibleData }] = await Promise.all([
        supabase.from('coursiers').select('*, profiles:user_id(prenom, nom, email, telephone)').order('created_at', { ascending: false }),
        supabase.from('visites').select('*, offres(adresse), agents:agent_id(id, user_id, profiles:user_id(prenom, nom)), coursiers:coursier_id(prenom, nom, profiles:user_id(prenom, nom))').not('statut_coursier', 'is', null).order('updated_at', { ascending: false }).limit(100),
        supabase.from('visites').select('*, offres(adresse), clients!client_id(user_id, profiles:user_id(prenom, nom))').is('statut_coursier', null).in('statut', ['planifiee', 'confirmee', 'proposee']).gte('date_visite', new Date().toISOString()).order('date_visite', { ascending: true }).limit(50),
      ]);
      setCoursiers(coursiersData || []);
      setMissions(missionsData || []);
      setEligibleVisites(eligibleData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelegateVisite = async (visiteId: string) => {
    setDelegating(visiteId);
    try {
      const { error } = await supabase
        .from('visites')
        .update({ statut_coursier: 'en_attente', remuneration_coursier: 5 })
        .eq('id', visiteId);
      if (error) throw error;
      toast.success('Visite envoyée dans le pool coursier');
      loadData();
    } catch (error) {
      console.error('Error delegating:', error);
      toast.error('Erreur lors de la délégation');
    } finally {
      setDelegating(null);
    }
  };

  const handleCreateCoursier = async () => {
    if (!newCoursier.email || !newCoursier.prenom) {
      toast.error('Email et prénom requis');
      return;
    }
    setCreating(true);
    try {
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('create-coursier', {
        body: {
          email: newCoursier.email,
          prenom: newCoursier.prenom,
          nom: newCoursier.nom,
          telephone: newCoursier.telephone,
        },
      });

      if (inviteError) throw inviteError;
      if (inviteData?.error) throw new Error(inviteData.error);
      
      toast.success(`Coursier ${newCoursier.prenom} invité avec succès`);
      setCreateOpen(false);
      setNewCoursier({ email: '', prenom: '', nom: '', telephone: '' });
      loadData();
    } catch (error: any) {
      console.error('Error creating coursier:', error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleMarkPaid = async (visiteId: string) => {
    try {
      const { error } = await supabase
        .from('visites')
        .update({ paye_coursier: true })
        .eq('id', visiteId);
      if (error) throw error;
      toast.success('Visite marquée comme payée');
      loadData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleMarkAllPaidForAgent = async (agentId: string) => {
    const agentUnpaid = unpaidMissions.filter(m => (m.agent_id || 'unknown') === agentId);
    try {
      for (const m of agentUnpaid) {
        await supabase.from('visites').update({ paye_coursier: true }).eq('id', m.id);
      }
      toast.success(`${agentUnpaid.length} visite(s) marquée(s) comme payée(s)`);
      loadData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const unpaidMissions = missions.filter(m => m.statut_coursier === 'termine' && !m.paye_coursier);
  const totalUnpaid = unpaidMissions.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0);
  const pendingMissions = missions.filter(m => m.statut_coursier === 'en_attente');
  const activeMissions = missions.filter(m => m.statut_coursier === 'accepte');
  const completedMissions = missions.filter(m => m.statut_coursier === 'termine');

  // Group unpaid missions by agent
  const unpaidByAgent = useMemo(() => {
    return unpaidMissions.reduce((acc: Record<string, { name: string; count: number; total: number; missions: any[] }>, m) => {
      const agentId = m.agent_id || 'unknown';
      const agentName = m.agents?.profiles?.prenom 
        ? `${m.agents.profiles.prenom} ${m.agents.profiles.nom || ''}`.trim()
        : 'Agent inconnu';
      if (!acc[agentId]) acc[agentId] = { name: agentName, count: 0, total: 0, missions: [] };
      acc[agentId].count += 1;
      acc[agentId].total += (m.remuneration_coursier || 5);
      acc[agentId].missions.push(m);
      return acc;
    }, {});
  }, [unpaidMissions]);
  const agentBalances = Object.entries(unpaidByAgent);

  // Coursier stats
  const coursierStats = useMemo(() => {
    return coursiers.map(c => {
      const coursierMissions = missions.filter(m => m.coursier_id === c.id);
      const completed = coursierMissions.filter(m => m.statut_coursier === 'termine');
      const active = coursierMissions.filter(m => m.statut_coursier === 'accepte');
      const earnings = completed.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0);
      const unpaid = completed.filter(m => !m.paye_coursier).reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0);
      return { ...c, completedCount: completed.length, activeCount: active.length, earnings, unpaid };
    });
  }, [coursiers, missions]);

  const filteredEligible = eligibleVisites.filter(v => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (v.adresse || '').toLowerCase().includes(q) || 
           (v.offres?.adresse || '').toLowerCase().includes(q) ||
           (v.clients?.profiles?.prenom || '').toLowerCase().includes(q) ||
           (v.clients?.profiles?.nom || '').toLowerCase().includes(q);
  });

  const getCoursierName = (c: any) => {
    return `${c.profiles?.prenom || c.prenom || ''} ${c.profiles?.nom || c.nom || ''}`.trim() || 'Coursier';
  };

  const getCoursierInitials = (c: any) => {
    const prenom = c.profiles?.prenom || c.prenom || '';
    const nom = c.profiles?.nom || c.nom || '';
    return `${prenom[0] || ''}${nom[0] || ''}`.toUpperCase();
  };

  const getMissionCoursierName = (m: any) => {
    if (m.coursiers?.profiles?.prenom) return `${m.coursiers.profiles.prenom} ${m.coursiers.profiles.nom || ''}`.trim();
    if (m.coursiers?.prenom) return `${m.coursiers.prenom} ${m.coursiers.nom || ''}`.trim();
    const c = coursiers.find(c => c.id === m.coursier_id);
    return c ? getCoursierName(c) : 'Coursier';
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="relative animate-pulse space-y-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <PremiumPageHeader
            icon={Bike}
            title="Gestion des Coursiers"
            subtitle="Gérez les coursiers, déléguez des visites et suivez les paiements"
          />
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <UserPlus className="mr-2 h-4 w-4" />
            Ajouter un coursier
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: Users, label: 'Coursiers', value: coursiers.length, color: 'text-primary', bg: 'bg-primary/10' },
            { icon: Clock, label: 'En attente', value: pendingMissions.length, color: 'text-amber-600', bg: 'bg-amber-500/10' },
            { icon: Bike, label: 'En cours', value: activeMissions.length, color: 'text-blue-600', bg: 'bg-blue-500/10' },
            { icon: CheckCircle, label: 'Terminées', value: completedMissions.length, color: 'text-green-600', bg: 'bg-green-500/10' },
            { icon: Send, label: 'À déléguer', value: eligibleVisites.length, color: 'text-purple-600', bg: 'bg-purple-500/10' },
            { icon: AlertTriangle, label: 'À payer', value: `${totalUnpaid.toFixed(0)} CHF`, color: 'text-red-600', bg: 'bg-red-500/10' },
          ].map((kpi, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{kpi.value}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{kpi.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="deleguer" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="deleguer">
              Déléguer {eligibleVisites.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px]">{eligibleVisites.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="coursiers">Coursiers</TabsTrigger>
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="paiements">
              Paiements {unpaidMissions.length > 0 && <Badge variant="destructive" className="ml-1.5 text-[10px]">{unpaidMissions.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Déléguer */}
          <TabsContent value="deleguer" className="space-y-4">
            {eligibleVisites.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une visite à déléguer..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
            {filteredEligible.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Send className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Aucune visite trouvée' : 'Aucune visite éligible à la délégation'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredEligible.map((v) => (
                  <Card key={v.id} className="border-border/50 hover:border-primary/20 transition-all">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{v.adresse || v.offres?.adresse || 'Adresse non renseignée'}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 shrink-0" />
                              {format(new Date(v.date_visite), "EEE dd MMM 'à' HH:mm", { locale: fr })}
                              {v.clients?.profiles?.prenom && (
                                <span className="truncate">• {v.clients.profiles.prenom} {v.clients.profiles.nom || ''}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleDelegateVisite(v.id)}
                          disabled={delegating === v.id}
                          className="shrink-0"
                        >
                          {delegating === v.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Bike className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Déléguer (5.-)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Coursiers */}
          <TabsContent value="coursiers" className="space-y-4">
            {coursierStats.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun coursier enregistré</p>
                  <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Ajouter un coursier
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {coursierStats.map((c) => (
                  <Card 
                    key={c.id} 
                    className="border-border/50 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => { setSelectedCoursier(c); setDetailOpen(true); }}
                  >
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                            {getCoursierInitials(c)}
                          </div>
                          <div>
                            <p className="font-semibold group-hover:text-primary transition-colors">{getCoursierName(c)}</p>
                            <p className="text-xs text-muted-foreground">{c.profiles?.email || c.email}</p>
                          </div>
                        </div>
                        <Badge className={c.statut === 'actif' 
                          ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                          : 'bg-muted text-muted-foreground'
                        }>
                          {c.statut === 'actif' ? 'Actif' : c.statut}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <p className="text-lg font-bold">{c.completedCount}</p>
                          <p className="text-[10px] text-muted-foreground">Missions</p>
                        </div>
                        <div className="text-center p-2 bg-green-500/5 rounded-lg">
                          <p className="text-lg font-bold text-green-600">{c.earnings.toFixed(0)}</p>
                          <p className="text-[10px] text-muted-foreground">CHF gagnés</p>
                        </div>
                        <div className="text-center p-2 bg-amber-500/5 rounded-lg">
                          <p className="text-lg font-bold text-amber-600">{c.activeCount}</p>
                          <p className="text-[10px] text-muted-foreground">En cours</p>
                        </div>
                      </div>

                      {c.unpaid > 0 && (
                        <div className="mt-3 flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="text-xs text-amber-700 font-medium">{c.unpaid.toFixed(0)} CHF à payer</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Missions */}
          <TabsContent value="missions" className="space-y-4">
            {missions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Bike className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune mission déléguée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {missions.slice(0, 30).map((m) => {
                  const statusConfig: Record<string, { label: string; class: string }> = {
                    en_attente: { label: 'En attente', class: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
                    accepte: { label: 'Acceptée', class: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
                    termine: { label: 'Terminée', class: 'bg-green-500/10 text-green-600 border-green-500/30' },
                  };
                  const status = statusConfig[m.statut_coursier] || { label: m.statut_coursier, class: 'bg-muted text-muted-foreground' };
                  
                  return (
                    <Card key={m.id} className="border-border/50">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${
                              m.statut_coursier === 'termine' ? 'bg-green-500/10' :
                              m.statut_coursier === 'accepte' ? 'bg-blue-500/10' : 'bg-amber-500/10'
                            }`}>
                              {m.statut_coursier === 'termine' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                               m.statut_coursier === 'accepte' ? <Bike className="h-4 w-4 text-blue-600" /> :
                               <Clock className="h-4 w-4 text-amber-600" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{m.adresse || m.offres?.adresse || '-'}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <span>{format(new Date(m.date_visite), "dd MMM yyyy HH:mm", { locale: fr })}</span>
                                {m.agents?.profiles?.prenom && (
                                  <span>• Agent: {m.agents.profiles.prenom}</span>
                                )}
                                {m.coursier_id && (
                                  <span>• Coursier: {getMissionCoursierName(m)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {m.statut_coursier === 'termine' && !m.paye_coursier && (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/30 text-[10px]">Impayé</Badge>
                            )}
                            {m.statut_coursier === 'termine' && m.paye_coursier && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]">Payé</Badge>
                            )}
                            <Badge className={status.class}>{status.label}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab: Paiements */}
          <TabsContent value="paiements" className="space-y-6">
            {/* Solde par agent */}
            {agentBalances.length > 0 && (
              <Card className="border-amber-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                    Solde par agent
                    <Badge variant="outline" className="ml-auto text-amber-600 border-amber-500/30">
                      Total: {totalUnpaid.toFixed(0)} CHF
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {agentBalances.map(([agentId, data]: [string, { name: string; count: number; total: number; missions: any[] }]) => (
                      <div key={agentId} className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-700 font-bold text-xs">
                            {data.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{data.name}</p>
                            <p className="text-xs text-muted-foreground">{data.count} visite{data.count > 1 ? 's' : ''} impayée{data.count > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-600 text-lg">{data.total.toFixed(0)} CHF</span>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleMarkAllPaidForAgent(agentId)}
                            className="border-green-500/30 text-green-600 hover:bg-green-500/10"
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            Tout payer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Missions impayées */}
            {unpaidMissions.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-amber-600" />
                    Détail des missions impayées ({unpaidMissions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {unpaidMissions.map((m) => {
                      return (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{m.adresse}</p>
                              <p className="text-xs text-muted-foreground">
                                {getMissionCoursierName(m)} • {format(new Date(m.date_visite), "dd MMM yyyy", { locale: fr })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-medium text-amber-600">{(m.remuneration_coursier || 5).toFixed(0)} CHF</span>
                            <Button size="sm" variant="outline" onClick={() => handleMarkPaid(m.id)} className="border-green-500/30 text-green-600 hover:bg-green-500/10">
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              Payé
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Tous les paiements sont à jour ✨</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Coursier Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Ajouter un coursier
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input
                  value={newCoursier.prenom}
                  onChange={(e) => setNewCoursier(prev => ({ ...prev, prenom: e.target.value }))}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={newCoursier.nom}
                  onChange={(e) => setNewCoursier(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Nom"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newCoursier.email}
                onChange={(e) => setNewCoursier(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.ch"
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={newCoursier.telephone}
                onChange={(e) => setNewCoursier(prev => ({ ...prev, telephone: e.target.value }))}
                placeholder="+41 XX XXX XX XX"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateCoursier} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Inviter le coursier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coursier Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          {selectedCoursier && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                    {getCoursierInitials(selectedCoursier)}
                  </div>
                  <div>
                    <span>{getCoursierName(selectedCoursier)}</span>
                    <Badge className={`ml-2 ${selectedCoursier.statut === 'actif' 
                      ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                      : 'bg-muted text-muted-foreground'}`}>
                      {selectedCoursier.statut}
                    </Badge>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Contact */}
                <div className="space-y-2">
                  {(selectedCoursier.profiles?.email || selectedCoursier.email) && (
                    <a href={`mailto:${selectedCoursier.profiles?.email || selectedCoursier.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Mail className="h-4 w-4" />
                      {selectedCoursier.profiles?.email || selectedCoursier.email}
                    </a>
                  )}
                  {(selectedCoursier.profiles?.telephone || selectedCoursier.telephone) && (
                    <a href={`tel:${selectedCoursier.profiles?.telephone || selectedCoursier.telephone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Phone className="h-4 w-4" />
                      {selectedCoursier.profiles?.telephone || selectedCoursier.telephone}
                    </a>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <p className="text-2xl font-bold">{selectedCoursier.completedCount}</p>
                    <p className="text-xs text-muted-foreground">Missions</p>
                  </div>
                  <div className="text-center p-3 bg-green-500/5 rounded-xl">
                    <p className="text-2xl font-bold text-green-600">{selectedCoursier.earnings.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">CHF gagnés</p>
                  </div>
                  <div className="text-center p-3 bg-amber-500/5 rounded-xl">
                    <p className="text-2xl font-bold text-amber-600">{selectedCoursier.unpaid.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">CHF dûs</p>
                  </div>
                </div>

                {/* Inscription */}
                <div className="text-xs text-muted-foreground">
                  Inscrit le {format(new Date(selectedCoursier.created_at), "dd MMMM yyyy", { locale: fr })}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
