import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  FileCheck, User, MapPin, Calendar, Search, Eye, CheckCircle, XCircle, Clock,
  ArrowRight, Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Candidature {
  id: string;
  offre_id: string;
  client_id: string;
  statut: string;
  dossier_complet: boolean;
  message_client: string | null;
  date_depot: string;
  created_at: string;
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
      
      // Get agent data
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!agentData) {
        setLoading(false);
        return;
      }

      // Get clients assigned to this agent
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

      // Get candidatures for these clients
      const { data: candidaturesData, error } = await supabase
        .from('candidatures')
        .select(`
          *,
          offres (
            adresse,
            prix,
            pieces,
            surface
          ),
          clients (
            user_id
          )
        `)
        .in('client_id', clientIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidatures(candidaturesData || []);

      // Get profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, prenom, nom, email')
        .in('id', clientUserIds);

      if (profilesData) {
        const profilesMap = new Map(profilesData.map(p => [p.id, p]));
        setProfiles(profilesMap);
      }
    } catch (error) {
      console.error('Error loading candidatures:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les candidatures',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatutChange = async (candidatureId: string, newStatut: string) => {
    try {
      const { error } = await supabase
        .from('candidatures')
        .update({ statut: newStatut })
        .eq('id', candidatureId);

      if (error) throw error;

      setCandidatures(prev => 
        prev.map(c => c.id === candidatureId ? { ...c, statut: newStatut } : c)
      );

      toast({
        title: 'Statut mis à jour',
        description: `Candidature marquée comme ${getStatutLabel(newStatut).toLowerCase()}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
    }
  };

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      'en_attente': 'En attente',
      'acceptee': 'Acceptée',
      'refusee': 'Refusée',
    };
    return labels[statut] || statut;
  };

  const getStatutBadgeVariant = (statut: string): "default" | "secondary" | "destructive" | "outline" => {
    if (statut === 'acceptee') return 'default';
    if (statut === 'refusee') return 'destructive';
    return 'secondary';
  };

  const getStatutIcon = (statut: string) => {
    if (statut === 'acceptee') return <CheckCircle className="h-4 w-4" />;
    if (statut === 'refusee') return <XCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const filteredCandidatures = candidatures.filter(c => {
    const matchesStatut = filterStatut === 'all' || c.statut === filterStatut;
    const profile = c.clients?.user_id ? profiles.get(c.clients.user_id) : null;
    const clientName = profile ? `${profile.prenom} ${profile.nom}`.toLowerCase() : '';
    const address = c.offres?.adresse?.toLowerCase() || '';
    const matchesSearch = searchTerm === '' || 
      clientName.includes(searchTerm.toLowerCase()) ||
      address.includes(searchTerm.toLowerCase());
    return matchesStatut && matchesSearch;
  });

  const stats = {
    total: candidatures.length,
    en_attente: candidatures.filter(c => c.statut === 'en_attente').length,
    acceptee: candidatures.filter(c => c.statut === 'acceptee').length,
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
          <p className="text-muted-foreground mt-1">
            Suivez les candidatures de vos clients
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.en_attente}</div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.acceptee}</div>
              <div className="text-sm text-muted-foreground">Acceptées</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.refusee}</div>
              <div className="text-sm text-muted-foreground">Refusées</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par client ou adresse..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={filterStatut} onValueChange={setFilterStatut}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="acceptee">Acceptée</SelectItem>
                    <SelectItem value="refusee">Refusée</SelectItem>
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
              const profile = candidature.clients?.user_id 
                ? profiles.get(candidature.clients.user_id) 
                : null;
              const clientName = profile 
                ? `${profile.prenom} ${profile.nom}` 
                : 'Client inconnu';

              return (
                <Card key={candidature.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Client & Offre info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-semibold truncate">{clientName}</span>
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
                              <p>
                                {candidature.offres.prix?.toLocaleString()} CHF 
                                {candidature.offres.pieces && ` • ${candidature.offres.pieces} pièces`}
                                {candidature.offres.surface && ` • ${candidature.offres.surface} m²`}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Déposée le {new Date(candidature.date_depot || candidature.created_at).toLocaleDateString('fr-CH')}
                          </span>
                          <Badge variant={candidature.dossier_complet ? "outline" : "secondary"} className="text-xs">
                            {candidature.dossier_complet ? "Dossier complet" : "Dossier incomplet"}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                        {candidature.statut === 'en_attente' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleStatutChange(candidature.id, 'acceptee')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accepter
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => handleStatutChange(candidature.id, 'refusee')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Refuser
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/agent/clients/${candidature.client_id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir client
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
                {searchTerm || filterStatut !== 'all' 
                  ? "Aucune candidature ne correspond à vos critères de recherche"
                  : "Les candidatures de vos clients apparaîtront ici"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
