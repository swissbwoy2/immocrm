import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, Eye, Heart, MessageCircle, Building2, 
  TrendingUp, Clock, CheckCircle, AlertCircle, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnnonceurLayout } from '@/components/annonceur/AnnonceurLayout';
import { PremiumKPICard } from '@/components/premium/PremiumKPICard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AnnonceurDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch annonceur profile
  const { data: annonceur, isLoading: loadingAnnonceur } = useQuery({
    queryKey: ['annonceur-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('annonceurs')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch annonces stats
  const { data: annonces = [] } = useQuery({
    queryKey: ['annonceur-annonces', annonceur?.id],
    queryFn: async () => {
      if (!annonceur) return [];
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select(`
          *,
          photos_annonces_publiques(url, est_principale)
        `)
        .eq('annonceur_id', annonceur.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!annonceur
  });

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['annonceur-conversations', annonceur?.id],
    queryFn: async () => {
      if (!annonceur) return [];
      const { data, error } = await supabase
        .from('conversations_annonces')
        .select(`
          *,
          annonces_publiques(titre),
          messages_annonces(id, lu, created_at)
        `)
        .eq('annonceur_id', annonceur.id)
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!annonceur
  });

  const stats = {
    total: annonces.length,
    publiees: annonces.filter(a => a.statut === 'publie').length,
    enAttente: annonces.filter(a => a.statut === 'en_attente').length,
    brouillons: annonces.filter(a => a.statut === 'brouillon').length,
    totalVues: annonces.reduce((sum, a) => sum + (a.nb_vues || 0), 0),
    totalFavoris: annonces.reduce((sum, a) => sum + (a.nb_favoris || 0), 0),
    totalContacts: annonces.reduce((sum, a) => sum + (a.nb_contacts || 0), 0),
    messagesNonLus: conversations.reduce((sum, c) => 
      sum + (c.messages_annonces?.filter((m: any) => !m.lu).length || 0), 0
    ),
  };

  const recentAnnonces = annonces.slice(0, 4);

  if (loadingAnnonceur) {
    return (
      <AnnonceurLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
          </div>
        </div>
      </AnnonceurLayout>
    );
  }

  return (
    <AnnonceurLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Bienvenue, {annonceur?.prenom || annonceur?.nom || 'Annonceur'}
            </h1>
            <p className="text-muted-foreground">
              Gérez vos annonces et suivez vos performances
            </p>
          </div>
          <Link to="/espace-annonceur/nouvelle-annonce">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle annonce
            </Button>
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <PremiumKPICard
            title="Annonces publiées"
            value={stats.publiees}
            icon={Building2}
            trend={{ value: stats.enAttente, label: 'en attente' }}
          />
          <PremiumKPICard
            title="Vues totales"
            value={stats.totalVues}
            icon={Eye}
          />
          <PremiumKPICard
            title="Favoris"
            value={stats.totalFavoris}
            icon={Heart}
          />
          <PremiumKPICard
            title="Messages"
            value={stats.totalContacts}
            icon={MessageCircle}
            trend={stats.messagesNonLus > 0 ? { value: stats.messagesNonLus, label: 'non lus' } : undefined}
          />
        </div>

        {/* Quick Actions */}
        {stats.enAttente > 0 && (
          <Card className="p-4 border-warning/50 bg-warning/5">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <div className="flex-1">
                <p className="font-medium">
                  {stats.enAttente} annonce{stats.enAttente > 1 ? 's' : ''} en attente de modération
                </p>
                <p className="text-sm text-muted-foreground">
                  Vos annonces seront publiées après validation par notre équipe
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Annonces */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Mes annonces récentes</h2>
                <Link to="/espace-annonceur/mes-annonces">
                  <Button variant="ghost" size="sm">Voir tout</Button>
                </Link>
              </div>

              {recentAnnonces.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">Aucune annonce pour le moment</p>
                  <Link to="/espace-annonceur/nouvelle-annonce">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer ma première annonce
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAnnonces.map((annonce) => {
                    const mainPhoto = annonce.photos_annonces_publiques?.find((p: any) => p.est_principale)?.url 
                      || annonce.photos_annonces_publiques?.[0]?.url 
                      || '/placeholder.svg';
                    
                    return (
                      <Link
                        key={annonce.id}
                        to={`/espace-annonceur/mes-annonces/${annonce.id}`}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <img 
                          src={mainPhoto} 
                          alt={annonce.titre}
                          className="w-16 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{annonce.titre}</p>
                          <p className="text-sm text-muted-foreground">
                            {annonce.ville} • {annonce.prix?.toLocaleString('fr-CH')} CHF
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            annonce.statut === 'publie' ? 'default' :
                            annonce.statut === 'en_attente' ? 'secondary' :
                            'outline'
                          }>
                            {annonce.statut === 'publie' ? 'Publiée' :
                             annonce.statut === 'en_attente' ? 'En attente' :
                             annonce.statut === 'brouillon' ? 'Brouillon' :
                             annonce.statut}
                          </Badge>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />{annonce.nb_vues || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />{annonce.nb_favoris || 0}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Messages */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Messages récents</h2>
              <Link to="/espace-annonceur/messages">
                <Button variant="ghost" size="sm">Voir tout</Button>
              </Link>
            </div>

            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Aucun message</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conv) => {
                  const unread = conv.messages_annonces?.filter((m: any) => !m.lu).length || 0;
                  return (
                    <Link
                      key={conv.id}
                      to={`/espace-annonceur/messages/${conv.id}`}
                      className="block p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium truncate">{conv.nom_acheteur}</p>
                        {unread > 0 && (
                          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                            {unread}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.annonces_publiques?.titre}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Tips */}
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Conseils pour optimiser vos annonces</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Ajoutez des photos de qualité (minimum 5 photos)</li>
                <li>• Rédigez une description détaillée et attrayante</li>
                <li>• Répondez rapidement aux messages des intéressés</li>
                <li>• Mettez à jour régulièrement le statut de disponibilité</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </AnnonceurLayout>
  );
}