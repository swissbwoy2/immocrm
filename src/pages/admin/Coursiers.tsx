import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bike, Users, CheckCircle, Clock, Wallet, UserPlus, Loader2, MapPin, DollarSign, Send, Calendar } from 'lucide-react';
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [{ data: coursiersData }, { data: missionsData }, { data: eligibleData }] = await Promise.all([
        supabase.from('coursiers').select('*').order('created_at', { ascending: false }),
        supabase.from('visites').select('*, offres(adresse)').not('statut_coursier', 'is', null).order('updated_at', { ascending: false }).limit(50),
        supabase.from('visites').select('*, offres(adresse), clients!client_id(user_id, profiles:user_id(prenom, nom))').is('statut_coursier', null).eq('statut', 'planifiee').order('date_visite', { ascending: true }).limit(50),
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
      // Invite user via edge function or create directly
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('create-coursier', {
        body: {
          email: newCoursier.email,
          prenom: newCoursier.prenom,
          nom: newCoursier.nom,
          telephone: newCoursier.telephone,
        },
      });

      if (inviteError) throw inviteError;
      
      // Check for error in response body
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

  const unpaidMissions = missions.filter(m => m.statut_coursier === 'termine' && !m.paye_coursier);
  const totalUnpaid = unpaidMissions.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0);

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          icon={Bike}
          title="Gestion des Coursiers"
          subtitle="Gérez les coursiers et leurs missions de visite"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{coursiers.length}</p>
                  <p className="text-xs text-muted-foreground">Coursiers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10"><Clock className="h-5 w-5 text-amber-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{missions.filter(m => m.statut_coursier === 'en_attente').length}</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{missions.filter(m => m.statut_coursier === 'termine').length}</p>
                  <p className="text-xs text-muted-foreground">Terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-red-500/10"><Wallet className="h-5 w-5 text-red-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{totalUnpaid.toFixed(0)} CHF</p>
                  <p className="text-xs text-muted-foreground">À payer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Eligible visits to delegate */}
        {eligibleVisites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Visites à déléguer ({eligibleVisites.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eligibleVisites.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{v.adresse || v.offres?.adresse || 'Adresse non renseignée'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(v.date_visite), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                          {v.clients?.profiles?.prenom && ` • ${v.clients.profiles.prenom} ${v.clients.profiles.nom || ''}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleDelegateVisite(v.id)}
                      disabled={delegating === v.id}
                    >
                      {delegating === v.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Bike className="mr-1 h-3.5 w-3.5" />
                      )}
                      Déléguer (5.-)
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Ajouter un coursier
          </Button>
        </div>

        {/* Coursiers list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Coursiers ({coursiers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coursiers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Aucun coursier enregistré</p>
            ) : (
              <div className="space-y-3">
                {coursiers.map((c) => {
                  const coursierMissions = missions.filter(m => m.coursier_id === c.id);
                  const completed = coursierMissions.filter(m => m.statut_coursier === 'termine');
                  const earnings = completed.reduce((sum, m) => sum + (m.remuneration_coursier || 5), 0);
                  
                  return (
                    <div key={c.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {c.prenom?.[0]}{c.nom?.[0]}
                        </div>
                        <div>
                          <p className="font-medium">{c.prenom} {c.nom}</p>
                          <p className="text-xs text-muted-foreground">{c.email} • {c.telephone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{completed.length} missions</p>
                          <p className="text-xs text-green-600">{earnings.toFixed(0)} CHF gagnés</p>
                        </div>
                        <Badge className={c.statut === 'actif' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}>
                          {c.statut}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unpaid missions */}
        {unpaidMissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-600" />
                Paiements en attente ({unpaidMissions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {unpaidMissions.map((m) => {
                  const coursier = coursiers.find(c => c.id === m.coursier_id);
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{m.adresse}</p>
                          <p className="text-xs text-muted-foreground">
                            {coursier ? `${coursier.prenom} ${coursier.nom}` : 'Coursier'} • {format(new Date(m.date_visite), "dd MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-amber-600">{(m.remuneration_coursier || 5).toFixed(2)} CHF</span>
                        <Button size="sm" variant="outline" onClick={() => handleMarkPaid(m.id)} className="border-green-500/30 text-green-600 hover:bg-green-500/10">
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          Marquer payé
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un coursier</DialogTitle>
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
    </main>
  );
}
