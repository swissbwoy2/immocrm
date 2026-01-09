import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, Heart, Share2, Flag, MapPin, Bed, Bath, Maximize, 
  Calendar, Building2, Check, Phone, Mail, MessageCircle, 
  Star, ChevronLeft, ChevronRight, X, User, Shield, Clock,
  Home, Car, Thermometer, Wifi, Trees, Waves
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicAnnonceCard } from '@/components/public/PublicAnnonceCard';
import { ContactAnnonceDialog } from '@/components/public/ContactAnnonceDialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AnnonceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch annonce details
  const { data: annonce, isLoading, error } = useQuery({
    queryKey: ['annonce-detail', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select(`
          *,
          annonceurs(id, nom, prenom, nom_entreprise, type_annonceur, logo_url, note_moyenne, nb_avis, telephone, email, est_verifie),
          categories_annonces(nom, slug, icone),
          photos_annonces_publiques(id, url, est_principale, ordre)
        `)
        .eq('slug', slug)
        .eq('statut', 'publie')
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug
  });

  // Fetch similar listings
  const { data: similarAnnonces = [] } = useQuery({
    queryKey: ['similar-annonces', annonce?.id, annonce?.type_transaction, annonce?.canton],
    queryFn: async () => {
      if (!annonce) return [];
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select(`
          *,
          annonceurs(nom, nom_entreprise, type_annonceur, logo_url, note_moyenne),
          photos_annonces_publiques(url, est_principale)
        `)
        .eq('statut', 'publie')
        .eq('type_transaction', annonce.type_transaction)
        .eq('canton', annonce.canton)
        .neq('id', annonce.id)
        .limit(3);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!annonce
  });

  // Track view
  useQuery({
    queryKey: ['track-view', annonce?.id],
    queryFn: async () => {
      if (!annonce) return null;
      await supabase.from('vues_annonces').insert({
        annonce_id: annonce.id,
        ip_address: 'anonymous'
      });
      return true;
    },
    enabled: !!annonce,
    staleTime: Infinity
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: annonce?.titre,
        text: annonce?.description_courte,
        url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Lien copié dans le presse-papier');
    }
  };

  const handleFavorite = async () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris');
  };

  const handleReport = () => {
    toast.info('Signalement envoyé. Merci de votre vigilance.');
  };

  const photos = annonce?.photos_annonces_publiques?.sort((a: any, b: any) => {
    if (a.est_principale) return -1;
    if (b.est_principale) return 1;
    return (a.ordre || 0) - (b.ordre || 0);
  }) || [];

  const mainPhoto = photos[currentPhotoIndex]?.url || '/placeholder.svg';

  const formatPrice = (price: number, type: string) => {
    const formatted = new Intl.NumberFormat('fr-CH', { 
      style: 'currency', 
      currency: 'CHF',
      maximumFractionDigits: 0 
    }).format(price);
    return type === 'location' ? `${formatted}/mois` : formatted;
  };

  const equipementIcons: Record<string, any> = {
    parking: Car,
    balcon: Home,
    terrasse: Trees,
    jardin: Trees,
    piscine: Waves,
    chauffage: Thermometer,
    wifi: Wifi
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="pt-20 pb-12">
          <div className="container mx-auto px-4">
            <div className="animate-pulse space-y-6">
              <div className="h-[400px] bg-muted rounded-xl" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="h-8 bg-muted rounded w-3/4" />
                  <div className="h-6 bg-muted rounded w-1/2" />
                  <div className="h-32 bg-muted rounded" />
                </div>
                <div className="h-64 bg-muted rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !annonce) {
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <div className="pt-32 pb-12 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Annonce introuvable</h1>
          <p className="text-muted-foreground mb-6">Cette annonce n'existe pas ou a été retirée.</p>
          <Link to="/annonces">
            <Button>Retour aux annonces</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Breadcrumb */}
      <div className="pt-20 bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/annonces" className="hover:text-foreground">Annonces</Link>
            <span>/</span>
            <Link to={`/annonces/recherche?type=${annonce.type_transaction}`} className="hover:text-foreground">
              {annonce.type_transaction === 'location' ? 'Location' : 'Vente'}
            </Link>
            <span>/</span>
            <Link to={`/annonces/recherche?canton=${annonce.canton}`} className="hover:text-foreground">
              {annonce.canton}
            </Link>
            <span>/</span>
            <span className="text-foreground truncate max-w-[200px]">{annonce.titre}</span>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="relative">
            {/* Main Photo */}
            <div 
              className="relative aspect-[16/9] max-h-[500px] rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => setShowGallery(true)}
            >
              <img 
                src={mainPhoto} 
                alt={annonce.titre}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Photo counter */}
              {photos.length > 1 && (
                <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  {currentPhotoIndex + 1} / {photos.length}
                </div>
              )}

              {/* Actions */}
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full"
                  onClick={(e) => { e.stopPropagation(); handleFavorite(); }}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full"
                  onClick={(e) => { e.stopPropagation(); handleShare(); }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Navigation arrows */}
              {photos.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex(prev => prev === 0 ? photos.length - 1 : prev - 1);
                    }}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex(prev => prev === photos.length - 1 ? 0 : prev + 1);
                    }}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {photos.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {photos.slice(0, 6).map((photo: any, index: number) => (
                  <button
                    key={photo.id}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`relative shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentPhotoIndex ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    {index === 5 && photos.length > 6 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-medium">
                        +{photos.length - 6}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant={annonce.type_transaction === 'location' ? 'default' : 'secondary'}>
                    {annonce.type_transaction === 'location' ? 'À louer' : 'À vendre'}
                  </Badge>
                  {annonce.disponible_immediatement && (
                    <Badge variant="outline" className="text-success border-success">
                      <Check className="h-3 w-3 mr-1" />
                      Disponible immédiatement
                    </Badge>
                  )}
                  {annonce.categories_annonces?.nom && (
                    <Badge variant="outline">{annonce.categories_annonces.nom}</Badge>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {annonce.titre}
                </h1>

                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{annonce.adresse}, {annonce.code_postal} {annonce.ville}</span>
                  {annonce.canton && <span className="ml-1">({annonce.canton})</span>}
                </div>

                <div className="text-3xl font-bold text-primary">
                  {formatPrice(annonce.prix, annonce.type_transaction)}
                  {annonce.charges_mensuelles && annonce.type_transaction === 'location' && (
                    <span className="text-base font-normal text-muted-foreground ml-2">
                      + {annonce.charges_mensuelles} CHF charges
                    </span>
                  )}
                </div>
              </div>

              {/* Key Features */}
              <Card className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {annonce.surface_habitable && (
                    <div className="text-center">
                      <Maximize className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="font-semibold">{annonce.surface_habitable} m²</p>
                      <p className="text-sm text-muted-foreground">Surface</p>
                    </div>
                  )}
                  {annonce.nombre_pieces && (
                    <div className="text-center">
                      <Home className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="font-semibold">{annonce.nombre_pieces}</p>
                      <p className="text-sm text-muted-foreground">Pièces</p>
                    </div>
                  )}
                  {annonce.nb_chambres && (
                    <div className="text-center">
                      <Bed className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="font-semibold">{annonce.nb_chambres}</p>
                      <p className="text-sm text-muted-foreground">Chambres</p>
                    </div>
                  )}
                  {annonce.nb_salles_bain && (
                    <div className="text-center">
                      <Bath className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="font-semibold">{annonce.nb_salles_bain}</p>
                      <p className="text-sm text-muted-foreground">Salles de bain</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Description */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Description</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {annonce.description?.split('\n').map((paragraph: string, index: number) => (
                    <p key={index} className="mb-3">{paragraph}</p>
                  )) || <p>Aucune description disponible.</p>}
                </div>
              </div>

              {/* Detailed Features */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Caractéristiques</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {annonce.etage !== null && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Étage</p>
                        <p className="font-medium">{annonce.etage === 0 ? 'Rez-de-chaussée' : `${annonce.etage}e étage`}</p>
                      </div>
                    </div>
                  )}
                  {annonce.annee_construction && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Année de construction</p>
                        <p className="font-medium">{annonce.annee_construction}</p>
                      </div>
                    </div>
                  )}
                  {annonce.classe_energetique && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Thermometer className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Classe énergétique</p>
                        <p className="font-medium">{annonce.classe_energetique}</p>
                      </div>
                    </div>
                  )}
                  {annonce.type_chauffage && (
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Thermometer className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Type de chauffage</p>
                        <p className="font-medium">{annonce.type_chauffage}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Equipments */}
              {annonce.equipements && Object.keys(annonce.equipements as Record<string, boolean>).length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Équipements</h2>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(annonce.equipements as Record<string, boolean>).filter(([_, v]) => v).map(([key]) => {
                      const IconComponent = equipementIcons[key] || Check;
                      return (
                        <Badge key={key} variant="secondary" className="px-3 py-1.5">
                          <IconComponent className="h-3 w-3 mr-1" />
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Points forts */}
              {annonce.points_forts && annonce.points_forts.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Points forts</h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {annonce.points_forts.map((point: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-success shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Location conditions (for rental) */}
              {annonce.type_transaction === 'location' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Conditions de location</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {annonce.depot_garantie && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Dépôt de garantie</p>
                        <p className="font-medium">{annonce.nb_mois_garantie || 3} mois de loyer</p>
                      </div>
                    )}
                    {annonce.disponible_des && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Disponible dès</p>
                        <p className="font-medium">
                          {format(new Date(annonce.disponible_des), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    )}
                    {annonce.animaux_autorises !== null && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Animaux</p>
                        <p className="font-medium">{annonce.animaux_autorises ? 'Autorisés' : 'Non autorisés'}</p>
                      </div>
                    )}
                    {annonce.fumeurs_acceptes !== null && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">Fumeurs</p>
                        <p className="font-medium">{annonce.fumeurs_acceptes ? 'Acceptés' : 'Non acceptés'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Report */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button variant="ghost" size="sm" onClick={handleReport} className="text-muted-foreground">
                  <Flag className="h-4 w-4 mr-1" />
                  Signaler cette annonce
                </Button>
                <span className="text-xs text-muted-foreground">
                  Référence: {annonce.reference || annonce.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Advertiser Card */}
                <Card className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    {annonce.annonceurs?.logo_url ? (
                      <img 
                        src={annonce.annonceurs.logo_url} 
                        alt={annonce.annonceurs.nom_entreprise || annonce.annonceurs.nom}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {annonce.annonceurs?.nom_entreprise || `${annonce.annonceurs?.prenom || ''} ${annonce.annonceurs?.nom || ''}`}
                        </h3>
                        {annonce.annonceurs?.est_verifie && (
                          <Shield className="h-4 w-4 text-success" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {annonce.annonceurs?.type_annonceur === 'particulier' ? 'Particulier' : 
                         annonce.annonceurs?.type_annonceur === 'agence' ? 'Agence immobilière' : 
                         annonce.annonceurs?.type_annonceur === 'promoteur' ? 'Promoteur' : 'Annonceur'}
                      </p>
                      {annonce.annonceurs?.note_moyenne && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{annonce.annonceurs.note_moyenne.toFixed(1)}</span>
                          <span className="text-sm text-muted-foreground">({annonce.annonceurs.nb_avis || 0} avis)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button className="w-full" size="lg" onClick={() => setShowContactDialog(true)}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contacter
                    </Button>

                    {annonce.annonceurs?.telephone && (
                      <Button variant="outline" className="w-full" asChild>
                        <a href={`tel:${annonce.annonceurs.telephone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          {annonce.annonceurs.telephone}
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Quick Actions */}
                <Card className="p-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleFavorite}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                      {isFavorite ? 'Favori' : 'Sauvegarder'}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Partager
                    </Button>
                  </div>
                </Card>

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{annonce.nb_vues || 0}</p>
                    <p>vues</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{annonce.nb_favoris || 0}</p>
                    <p>favoris</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">
                      {annonce.date_publication ? format(new Date(annonce.date_publication), 'dd/MM', { locale: fr }) : '-'}
                    </p>
                    <p>publié</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Similar Listings */}
      {similarAnnonces.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Annonces similaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarAnnonces.map((similar) => (
                <PublicAnnonceCard key={similar.id} annonce={similar} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Fullscreen Gallery */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setShowGallery(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            <img
              src={photos[currentPhotoIndex]?.url}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={() => setCurrentPhotoIndex(prev => prev === photos.length - 1 ? 0 : prev + 1)}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white">
              {currentPhotoIndex + 1} / {photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Dialog */}
      <ContactAnnonceDialog
        open={showContactDialog}
        onOpenChange={setShowContactDialog}
        annonce={annonce}
      />

      <PublicFooter />
    </div>
  );
}