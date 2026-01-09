import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, MapPin, Building2, Home, ArrowRight, 
  Star, Shield, Clock, Users, Plus, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';
import { PublicAnnonceCard } from '@/components/public/PublicAnnonceCard';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export default function PublicAnnonces() {
  const navigate = useNavigate();
  const [transactionType, setTransactionType] = useState<'location' | 'vente'>('location');
  const [searchLocation, setSearchLocation] = useState('');

  // Fetch featured listings
  const { data: featuredAnnonces = [] } = useQuery({
    queryKey: ['featured-annonces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select(`
          *,
          annonceurs(nom, nom_entreprise, type_annonceur, logo_url, note_moyenne),
          categories_annonces(nom, slug, icone),
          photos_annonces_publiques(url, est_principale)
        `)
        .eq('statut', 'publie')
        .eq('est_mise_en_avant', true)
        .order('date_publication', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch latest listings
  const { data: latestAnnonces = [] } = useQuery({
    queryKey: ['latest-annonces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select(`
          *,
          annonceurs(nom, nom_entreprise, type_annonceur, logo_url, note_moyenne),
          categories_annonces(nom, slug, icone),
          photos_annonces_publiques(url, est_principale)
        `)
        .eq('statut', 'publie')
        .order('date_publication', { ascending: false })
        .limit(9);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-annonces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories_annonces')
        .select('*')
        .eq('est_active', true)
        .order('ordre');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['portal-stats'],
    queryFn: async () => {
      const [annoncesResult, annonceursResult] = await Promise.all([
        supabase.from('annonces_publiques').select('id', { count: 'exact' }).eq('statut', 'publie'),
        supabase.from('annonceurs').select('id', { count: 'exact' }).eq('statut', 'actif')
      ]);
      
      return {
        annonces: annoncesResult.count || 0,
        annonceurs: annonceursResult.count || 0
      };
    }
  });

  const handleSearch = () => {
    navigate(`/annonces/recherche?type=${transactionType}&lieu=${encodeURIComponent(searchLocation)}`);
  };

  const iconMap: Record<string, any> = {
    Building2: Building2,
    Home: Home,
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/5 pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Trouvez le bien <span className="text-primary">de vos rêves</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10">
              Des milliers d'annonces immobilières en Suisse romande. Particuliers et professionnels, 
              publiez gratuitement vos biens.
            </p>

            {/* Search Box */}
            <div className="bg-card rounded-2xl shadow-xl p-4 md:p-6 max-w-3xl mx-auto border border-border/50">
              <Tabs 
                value={transactionType} 
                onValueChange={(v) => setTransactionType(v as 'location' | 'vente')}
                className="mb-4"
              >
                <TabsList className="grid w-full grid-cols-2 max-w-xs mx-auto">
                  <TabsTrigger value="location" className="font-semibold">
                    Louer
                  </TabsTrigger>
                  <TabsTrigger value="vente" className="font-semibold">
                    Acheter
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Ville, région ou code postal..."
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="pl-10 h-12 text-base"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  size="lg" 
                  className="h-12 px-8 font-semibold"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Rechercher
                </Button>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap justify-center gap-8 mt-10 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">{stats?.annonces || 0}</span>
                <span>annonces actives</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">{stats?.annonceurs || 0}</span>
                <span>annonceurs</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>Annonces vérifiées</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">
            Rechercher par type de bien
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((category) => {
              const IconComponent = iconMap[category.icone] || Building2;
              return (
                <Link
                  key={category.id}
                  to={`/annonces/recherche?categorie=${category.slug}`}
                  className="bg-card hover:bg-accent/5 border border-border rounded-xl p-4 text-center transition-all hover:shadow-md hover:-translate-y-1 group"
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">{category.nom}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {featuredAnnonces.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <Badge variant="secondary" className="mb-2">
                  <Star className="h-3 w-3 mr-1" />
                  En vedette
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold">Biens mis en avant</h2>
              </div>
              <Link to="/annonces/recherche?featured=true">
                <Button variant="outline" className="hidden sm:flex">
                  Voir tout
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredAnnonces.map((annonce) => (
                <PublicAnnonceCard key={annonce.id} annonce={annonce} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Listings */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Badge variant="secondary" className="mb-2">
                <Clock className="h-3 w-3 mr-1" />
                Nouveau
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold">Dernières annonces</h2>
            </div>
            <Link to="/annonces/recherche">
              <Button variant="outline" className="hidden sm:flex">
                Voir tout
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestAnnonces.map((annonce) => (
              <PublicAnnonceCard key={annonce.id} annonce={annonce} />
            ))}
          </div>

          {latestAnnonces.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune annonce disponible pour le moment</p>
            </div>
          )}

          <div className="text-center mt-10">
            <Link to="/annonces/recherche">
              <Button size="lg" variant="outline">
                Voir toutes les annonces
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section - Déposer une annonce */}
      <section className="py-20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Vous avez un bien à vendre ou à louer ?
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Publiez votre annonce gratuitement et touchez des milliers d'acheteurs et locataires potentiels.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/inscription-annonceur">
                <Button size="lg" variant="secondary" className="font-semibold">
                  <Plus className="h-5 w-5 mr-2" />
                  Déposer une annonce
                </Button>
              </Link>
              <Link to="/connexion-annonceur">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  J'ai déjà un compte
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Pourquoi utiliser notre plateforme ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Annonces vérifiées</h3>
              <p className="text-muted-foreground">
                Chaque annonce est modérée par notre équipe pour garantir sa qualité et son authenticité.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-success/10 flex items-center justify-center">
                <Star className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Publication gratuite</h3>
              <p className="text-muted-foreground">
                Déposez vos annonces gratuitement. Pas de frais cachés, pas d'abonnement obligatoire.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warning/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-warning" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Réponse rapide</h3>
              <p className="text-muted-foreground">
                Messagerie intégrée pour contacter les annonceurs et obtenir des réponses rapidement.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}