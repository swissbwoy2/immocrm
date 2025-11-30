import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  FileCheck, User, MapPin, Calendar, Search, Eye, CheckCircle, XCircle, Clock,
  Filter, Building2, FileSignature, CalendarCheck, Key, Send, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const WORKFLOW_STATUTS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'en_attente': { label: 'En attente', color: 'secondary', icon: <Clock className="h-4 w-4" /> },
  'acceptee': { label: '🎉 Acceptée', color: 'default', icon: <CheckCircle className="h-4 w-4" /> },
  'refusee': { label: 'Refusée', color: 'destructive', icon: <XCircle className="h-4 w-4" /> },
  'bail_conclu': { label: 'Client accepte bail', color: 'default', icon: <FileSignature className="h-4 w-4" /> },
  'attente_bail': { label: 'Attente bail régie', color: 'secondary', icon: <Building2 className="h-4 w-4" /> },
  'bail_recu': { label: 'Bail reçu', color: 'default', icon: <FileCheck className="h-4 w-4" /> },
  'signature_planifiee': { label: 'Signature planifiée', color: 'default', icon: <CalendarCheck className="h-4 w-4" /> },
  'signature_effectuee': { label: 'Bail signé', color: 'default', icon: <CheckCircle className="h-4 w-4" /> },
  'etat_lieux_fixe': { label: 'État des lieux fixé', color: 'default', icon: <Calendar className="h-4 w-4" /> },
  'cles_remises': { label: '🔑 Clés remises', color: 'default', icon: <Key className="h-4 w-4" /> },
};

interface Candidature {
  id: string;
  offre_id: string;
  client_id: string;
  statut: string;
  dossier_complet: boolean;
  message_client: string | null;
  date_depot: string;
  created_at: string;
  dates_signature_proposees: any;
  date_signature_choisie: string | null;
  lieu_signature: string | null;
  date_etat_lieux: string | null;
  heure_etat_lieux: string | null;
  offres: {
    adresse: string;
    prix: number;
    pieces: number | null;
    surface: number | null;
  } | null;
  clients: {
    user_id: string;
  } | null;
}

interface Profile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
}

export default function Candidatures() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialogs
  const [showDatesDialog, setShowDatesDialog] = useState(false);
  const [showEtatLieuxDialog, setShowEtatLieuxDialog] = useState(false);
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  
  // Form states
  const [proposedDates, setProposedDates] = useState(['', '', '']);
  const [etatLieuxDate, setEtatLieuxDate] = useState('');
  const [etatLieuxHeure, setEtatLieuxHeure] = useState('');

  useEffect(() => {
    if (!user || userRole !== 'agent') {
      navigate('/login');
      return;
    }
    loadCandidatures();
  }, [user, userRole, navigate]);

  const loadCandidatures = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!agentData) {
        setLoading(false);
        return;
      }

      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, user_id')
        .eq('agent_id', agentData.id);
      
      if (!clientsData || clientsData.length === 0) {
        setLoading(false);
        return;
      }

      const clientIds = clientsData.map(c => c.id);
      const clientUserIds = clientsData.map(c => c.user_id);

      const { data: candidaturesData, error } = await supabase
        .from('candidatures')
        .select(`
          *,
          offres (adresse, prix, pieces, surface),
          clients (user_id)
        `)
        .in('client_id', clientIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidatures(candidaturesData || []);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', clientUserIds);

      if (profilesData) {
        setProfiles(new Map(profilesData.map(p => [p.id, p])));
      }
    } catch (error) {
      console.error('Error loading candidatures:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les candidatures', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatutChange = async (candidatureId: string, newStatut: string, additionalData?: any) => {
    try {
      const candidature = candidatures.find(c => c.id === candidatureId);
      
      const updateData: any = { statut: newStatut, ...additionalData };
      
      const { error: candError } = await supabase
        .from('candidatures')
        .update(updateData)
        .eq('id', candidatureId);

      if (candError) throw candError;

      // Sync offres status
      if (candidature?.offre_id) {
        const offreStatut = ['acceptee', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(newStatut) 
          ? 'acceptee' 
          : newStatut === 'refusee' ? 'refusee' : 'candidature_deposee';
        
        await supabase.from('offres').update({ statut: offreStatut }).eq('id', candidature.offre_id);
      }

      // Send notification to client
      if (candidature?.clients?.user_id) {
        const notificationMap: Record<string, { title: string; message: string }> = {
          'acceptee': { title: '🎉 Candidature acceptée !', message: `Votre candidature pour ${candidature.offres?.adresse} a été acceptée !` },
          'refusee': { title: 'Candidature refusée', message: `Votre candidature pour ${candidature.offres?.adresse} n'a pas été retenue.` },
          'attente_bail': { title: 'Validation régie en cours', message: `Votre agent valide votre intérêt auprès de la régie pour ${candidature.offres?.adresse}` },
          'bail_recu': { title: '📄 Bail reçu - Choisissez votre date', message: `Le bail est prêt ! Choisissez une date de signature pour ${candidature.offres?.adresse}` },
          'signature_effectuee': { title: '✅ Bail signé !', message: `Le bail pour ${candidature.offres?.adresse} a été signé. En attente de la date d'état des lieux.` },
          'etat_lieux_fixe': { title: '🔑 État des lieux fixé', message: `La date de l'état des lieux pour ${candidature.offres?.adresse} a été fixée.` },
          'cles_remises': { title: '🏠 Bienvenue chez vous !', message: `Les clés de ${candidature.offres?.adresse} vous ont été remises. Félicitations !` },
        };

        const notification = notificationMap[newStatut];
        if (notification) {
          await supabase.from('notifications').insert({
            user_id: candidature.clients.user_id,
            type: `candidature_${newStatut}`,
            title: notification.title,
            message: notification.message,
            link: '/client/mes-candidatures',
          });
        }
      }

      setCandidatures(prev => prev.map(c => c.id === candidatureId ? { ...c, statut: newStatut, ...additionalData } : c));
      toast({ title: 'Statut mis à jour', description: `Candidature marquée comme ${getStatutLabel(newStatut).toLowerCase()}` });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleProposeDates = async () => {
    if (!selectedCandidature) return;
    
    const validDates = proposedDates.filter(d => d).map(d => ({
      date: d,
      lieu: 'Chemin de l\'Esparcette 5, 1023 Crissier'
    }));

    if (validDates.length === 0) {
      toast({ title: 'Veuillez proposer au moins une date', variant: 'destructive' });
      return;
    }

    await handleStatutChange(selectedCandidature.id, 'bail_recu', {
      bail_recu: true,
      bail_recu_at: new Date().toISOString(),
      dates_signature_proposees: validDates,
    });

    setShowDatesDialog(false);
    setProposedDates(['', '', '']);
    setSelectedCandidature(null);
  };

  const handleSetEtatLieux = async () => {
    if (!selectedCandidature || !etatLieuxDate) return;

    await handleStatutChange(selectedCandidature.id, 'etat_lieux_fixe', {
      date_etat_lieux: etatLieuxDate,
      heure_etat_lieux: etatLieuxHeure,
    });

    setShowEtatLieuxDialog(false);
    setEtatLieuxDate('');
    setEtatLieuxHeure('');
    setSelectedCandidature(null);
  };

  const handleClesRemises = async (candidatureId: string) => {
    await handleStatutChange(candidatureId, 'cles_remises', {
      cles_remises: true,
      cles_remises_at: new Date().toISOString(),
    });
  };

  const getStatutLabel = (statut: string) => WORKFLOW_STATUTS[statut]?.label || statut;
  const getStatutBadgeVariant = (statut: string): "default" | "secondary" | "destructive" | "outline" => {
    const color = WORKFLOW_STATUTS[statut]?.color;
    if (color === 'destructive') return 'destructive';
    if (color === 'secondary') return 'secondary';
    if (color === 'outline') return 'outline';
    return 'default';
  };
  const getStatutIcon = (statut: string) => WORKFLOW_STATUTS[statut]?.icon || <Clock className="h-4 w-4" />;

  const filteredCandidatures = candidatures.filter(c => {
    const matchesStatut = filterStatut === 'all' || c.statut === filterStatut;
    const profile = c.clients?.user_id ? profiles.get(c.clients.user_id) : null;
    const clientName = profile ? `${profile.prenom} ${profile.nom}`.toLowerCase() : '';
    const address = c.offres?.adresse?.toLowerCase() || '';
    const matchesSearch = searchTerm === '' || clientName.includes(searchTerm.toLowerCase()) || address.includes(searchTerm.toLowerCase());
    return matchesStatut && matchesSearch;
  });

  const stats = {
    total: candidatures.length,
    en_attente: candidatures.filter(c => c.statut === 'en_attente').length,
    acceptee: candidatures.filter(c => ['acceptee', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe'].includes(c.statut)).length,
    cles_remises: candidatures.filter(c => c.statut === 'cles_remises').length,
    refusee: candidatures.filter(c => c.statut === 'refusee').length,
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileCheck className="h-8 w-8" />
            Candidatures déposées
          </h1>
          <p className="text-muted-foreground mt-1">Gérez le workflow complet des candidatures</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card><CardContent className="p-4"><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-muted-foreground">Total</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-yellow-600">{stats.en_attente}</div><div className="text-sm text-muted-foreground">En attente</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-600">{stats.acceptee}</div><div className="text-sm text-muted-foreground">En cours</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-purple-600">{stats.cles_remises}</div><div className="text-sm text-muted-foreground">Clés remises</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold text-red-600">{stats.refusee}</div><div className="text-sm text-muted-foreground">Refusées</div></CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="w-full sm:w-56">
                <Select value={filterStatut} onValueChange={setFilterStatut}>
                  <SelectTrigger><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Filtrer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {Object.entries(WORKFLOW_STATUTS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidatures list */}
        {filteredCandidatures.length > 0 ? (
          <div className="space-y-4">
            {filteredCandidatures.map(candidature => {
              const profile = candidature.clients?.user_id ? profiles.get(candidature.clients.user_id) : null;
              const clientName = profile ? `${profile.prenom} ${profile.nom}` : 'Client inconnu';

              return (
                <Card key={candidature.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{clientName}</span>
                          <Badge variant={getStatutBadgeVariant(candidature.statut)} className="flex items-center gap-1">
                            {getStatutIcon(candidature.statut)}
                            {getStatutLabel(candidature.statut)}
                          </Badge>
                        </div>
                        
                        {candidature.offres && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-foreground">{candidature.offres.adresse}</p>
                              <p>{candidature.offres.prix?.toLocaleString()} CHF {candidature.offres.pieces && `• ${candidature.offres.pieces} pièces`}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Déposée le {new Date(candidature.date_depot || candidature.created_at).toLocaleDateString('fr-CH')}
                          </span>
                          {candidature.date_signature_choisie && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <CalendarCheck className="h-3 w-3" />
                              Signature: {format(new Date(candidature.date_signature_choisie), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </span>
                          )}
                          {candidature.date_etat_lieux && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Key className="h-3 w-3" />
                              État des lieux: {format(new Date(candidature.date_etat_lieux), 'dd/MM/yyyy', { locale: fr })} {candidature.heure_etat_lieux}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                        {/* En attente - Accept/Refuse */}
                        {candidature.statut === 'en_attente' && (
                          <>
                            <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleStatutChange(candidature.id, 'acceptee')}>
                              <CheckCircle className="h-4 w-4 mr-1" />Accepter
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleStatutChange(candidature.id, 'refusee')}>
                              <XCircle className="h-4 w-4 mr-1" />Refuser
                            </Button>
                          </>
                        )}

                        {/* Acceptée - En attente action client */}
                        {candidature.statut === 'acceptee' && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-md text-sm border border-amber-200 dark:border-amber-800">
                            <Clock className="h-4 w-4" />
                            <span>Attente client : "Conclure le bail"</span>
                          </div>
                        )}

                        {/* Bail conclu - Valider avec régie */}
                        {candidature.statut === 'bail_conclu' && (
                          <Button size="sm" onClick={() => handleStatutChange(candidature.id, 'attente_bail', { agent_valide_regie: true, agent_valide_regie_at: new Date().toISOString() })}>
                            <Building2 className="h-4 w-4 mr-1" />Valider régie
                          </Button>
                        )}

                        {/* Attente bail - Bail reçu */}
                        {candidature.statut === 'attente_bail' && (
                          <Button size="sm" onClick={() => { setSelectedCandidature(candidature); setShowDatesDialog(true); }}>
                            <FileCheck className="h-4 w-4 mr-1" />Bail reçu
                          </Button>
                        )}

                        {/* Bail reçu - En attente choix client */}
                        {candidature.statut === 'bail_recu' && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md text-sm border border-blue-200 dark:border-blue-800">
                            <Clock className="h-4 w-4" />
                            <span>Attente client : choix date signature</span>
                          </div>
                        )}

                        {/* Signature planifiée - Marquer signé */}
                        {candidature.statut === 'signature_planifiee' && (
                          <Button size="sm" onClick={() => handleStatutChange(candidature.id, 'signature_effectuee', { signature_effectuee: true, signature_effectuee_at: new Date().toISOString() })}>
                            <FileSignature className="h-4 w-4 mr-1" />Signature effectuée
                          </Button>
                        )}

                        {/* Signature effectuée - Fixer état des lieux */}
                        {candidature.statut === 'signature_effectuee' && (
                          <Button size="sm" onClick={() => { setSelectedCandidature(candidature); setShowEtatLieuxDialog(true); }}>
                            <Calendar className="h-4 w-4 mr-1" />Fixer état des lieux
                          </Button>
                        )}

                        {/* État des lieux fixé - Clés remises */}
                        {candidature.statut === 'etat_lieux_fixe' && (
                          <Button size="sm" onClick={() => handleClesRemises(candidature.id)}>
                            <Key className="h-4 w-4 mr-1" />Clés remises
                          </Button>
                        )}

                        {/* Clés remises - Terminé */}
                        {candidature.statut === 'cles_remises' && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-md text-sm border border-green-200 dark:border-green-800">
                            <CheckCircle className="h-4 w-4" />
                            <span>✅ Terminé - Clés remises</span>
                          </div>
                        )}

                        {/* Refusée */}
                        {candidature.statut === 'refusee' && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-md text-sm border border-red-200 dark:border-red-800">
                            <XCircle className="h-4 w-4" />
                            <span>Refusée</span>
                          </div>
                        )}

                        {/* Voir client */}
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/agent/clients/${candidature.client_id}`)}>
                          <Eye className="h-4 w-4 mr-1" />Voir client
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune candidature</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatut !== 'all' ? "Aucune candidature ne correspond à vos critères" : "Les candidatures apparaîtront ici"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog: Proposer dates de signature */}
      <Dialog open={showDatesDialog} onOpenChange={setShowDatesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposer des dates de signature</DialogTitle>
            <DialogDescription>
              Proposez jusqu'à 3 dates pour la signature du bail. Le client choisira celle qui lui convient.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              📍 Lieu: Chemin de l'Esparcette 5, 1023 Crissier
            </p>
            {proposedDates.map((date, idx) => (
              <div key={idx} className="space-y-2">
                <Label>Date {idx + 1} {idx === 0 && '*'}</Label>
                <Input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => {
                    const newDates = [...proposedDates];
                    newDates[idx] = e.target.value;
                    setProposedDates(newDates);
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDatesDialog(false)}>Annuler</Button>
            <Button onClick={handleProposeDates} disabled={!proposedDates[0]}>
              <Send className="h-4 w-4 mr-2" />Envoyer au client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Fixer état des lieux */}
      <Dialog open={showEtatLieuxDialog} onOpenChange={setShowEtatLieuxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fixer la date de l'état des lieux</DialogTitle>
            <DialogDescription>
              Indiquez la date et l'heure de l'état des lieux fixée avec la régie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Le client recevra une alerte importante concernant les documents nécessaires.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Date de l'état des lieux *</Label>
              <Input type="date" value={etatLieuxDate} onChange={(e) => setEtatLieuxDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Heure</Label>
              <Input type="time" value={etatLieuxHeure} onChange={(e) => setEtatLieuxHeure(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEtatLieuxDialog(false)}>Annuler</Button>
            <Button onClick={handleSetEtatLieux} disabled={!etatLieuxDate}>
              <Send className="h-4 w-4 mr-2" />Notifier le client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
