import { useState, useEffect } from 'react';
import { usePublicFavoris } from '@/hooks/usePublicFavoris';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, Heart, Share2, Flag, MapPin, Bed, Bath, Maximize, 
  Calendar, Building2, Check, Phone, Mail, MessageCircle, 
  Star, ChevronLeft, ChevronRight, X, User, Shield, Clock,
  Home, Car, Thermometer, Wifi, Trees, Waves, Sparkles,
  CalendarCheck, Grid3X3,
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
import { ExternalListingPlaceholder } from '@/components/public/ExternalListingPlaceholder';
import { useAuth } from '@/contexts/AuthContext';
import { ContactAnnonceDialog } from '@/components/public/ContactAnnonceDialog';
import { ReserverVisiteDialog, useAnnonceCreneaux } from '@/components/public/ReserverVisiteDialog';
import { AnnonceLocationMap } from '@/components/public/AnnonceLocationMap';
import { PortailBannieres } from '@/components/public/PortailBannieres';
import { BudgetCalcSection } from '@/components/public-site/sections/BudgetCalcSection';
import { SearchTypeProvider } from '@/contexts/SearchTypeContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
  let tag = document.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

export default function AnnonceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isFavorite: isFav, toggleFavorite } = usePublicFavoris();
  const { userRoles } = useAuth();
  const hideExternalPhotos = !userRoles.some((role) => role === 'admin' || role === 'agent');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showReserverDialog, setShowReserverDialog] = useState(false);

  // Fetch annonce details (slug, fallback sur l'id)
  const { data: annonce, isLoading, error } = useQuery({
    queryKey: ['annonce-detail', slug],
    queryFn: async () => {
      const select = `
          *,
          annonceurs(id, nom, nom_entreprise, type_annonceur, logo_url, note_moyenne),
          categories_annonces(nom, slug, icone),
          photos_annonces_publiques(id, url, est_principale, ordre)
        `;
      const nowIso = new Date().toISOString();

      let { data, error } = await supabase
        .from('annonces_publiques')
        .select(select)
        .eq('slug', slug)
        .eq('statut', 'publie')
        .or(`date_expiration.is.null,date_expiration.gt.${nowIso}`)
        .maybeSingle();

      if (!data && slug && UUID_RE.test(slug)) {
        const fallback = await supabase
          .from('annonces_publiques')
          .select(select)
          .eq('id', slug)
          .eq('statut', 'publie')
          .or(`date_expiration.is.null,date_expiration.gt.${nowIso}`)
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      if (!data) throw new Error('not-found');
      return data as any;
    },
    enabled: !!slug
  });

  const isFavorite = annonce ? isFav(annonce.id) : false;

  // Fetch similar listings
  const { data: creneauxDispo = [] } = useAnnonceCreneaux(annonce?.id);

  const { data: similarAnnonces = [] } = useQuery({
    queryKey: ['similar-annonces', annonce?.id, annonce?.type_transaction, annonce?.canton],
    queryFn: async () => {
      if (!annonce) return [];
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('annonces_publiques')
        .select(`
          *,
          annonceurs(nom, nom_entreprise, type_annonceur, logo_url, note_moyenne),
          photos_annonces_publiques(url, est_principale)
        `)
        .eq('statut', 'publie')
        .or(`date_expiration.is.null,date_expiration.gt.${nowIso}`)
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
  useEffect(() => {
    if (!annonce?.id) return;
    supabase.from('vues_annonces').insert({ annonce_id: annonce.id }).then(() => {});
    supabase.rpc('increment_annonce_vue', { _annonce_id: annonce.id }).then(() => {});
  }, [annonce?.id]);

  // SEO
  useEffect(() => {
    if (!annonce) return;
    const title = (annonce.meta_title || `${annonce.titre} — ${annonce.ville}`).slice(0, 65);
    const description = (
      annonce.meta_description ||
      annonce.description_courte ||
      `${annonce.titre} à ${annonce.ville}. Découvrez cette annonce sur le portail Logisorama.`
    ).slice(0, 158);

    document.title = `${title} | Logisorama`;
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', 'article');
    setMetaTag('name', 'twitter:card', 'summary_large_image');

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/annonces/${annonce.slug || annonce.id}`;

    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: annonce.titre,
      description,
      url: canonical.href,
      datePosted: annonce.date_publication,
      image: annonce.lien_annonce && hideExternalPhotos ? [] : annonce.photos_annonces_publiques?.map((p: any) => p.url).slice(0, 5),
      address: {
        '@type': 'PostalAddress',
        addressLocality: annonce.ville,
        postalCode: annonce.code_postal,
        addressRegion: annonce.canton,
        addressCountry: 'CH',
      },
      offers: {
        '@type': 'Offer',
        price: annonce.prix,
        priceCurrency: 'CHF',
        availability: 'https://schema.org/InStock',
      },
    });
    document.head.appendChild(ld);
    return () => { ld.remove(); };
  }, [annonce, hideExternalPhotos]);

  const handleShare = async () => {
    const ogBase = import.meta.env.VITE_SUPABASE_URL;
    const slugOrId = annonce?.slug || annonce?.id;
    const url = ogBase && slugOrId
      ? `${ogBase}/functions/v1/annonce-og?slug=${encodeURIComponent(slugOrId)}`
      : window.location.href;
    const title = annonce?.titre ?? 'Annonce';
    const text = annonce?.description_courte ?? '';
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title, text, url, dialogTitle: 'Partager l\'annonce' });
        return;
      }
    } catch (e) {}
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (e) {}
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié dans le presse-papier');
    } catch {
      toast.error('Impossible de partager le lien');
    }
  };

  const handleFavorite = async () => {
    if (!annonce) return;
    await toggleFavorite(annonce.id);
    queryClient.invalidateQueries({ queryKey: ['annonce-detail', slug] });
  };


  const handleReport = () => {
    toast.info('Signalement envoyé. Merci de votre vigilance.');
  };

  const photos = annonce?.lien_annonce && hideExternalPhotos ? [] : annonce?.photos_annonces_publiques?.sort((a: any, b: any) => {
    if (a.est_principale) return -1;
    if (b.est_principale) return 1;
    return (a.ordre || 0) - (b.ordre || 0);
  }) || [];

  const showExternalPlaceholder = !!annonce?.lien_annonce && hideExternalPhotos;
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
      <div className="theme-luxury min-h-screen bg-background">
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
      <div className="theme-luxury min-h-screen bg-background">
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

  // Style « Airbnb » : une seule ombre, filets fins, coins arrondis 14px — couleurs de la charte Logisorama conservées.
  const SHADOW = 'shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.1)]';
  const SECTION = 'py-8 border-b border-border';
  const H2 = 'text-[22px] leading-tight font-semibold tracking-[-0.01em] text-foreground mb-6';
  const ROW = 'flex items-start gap-4 py-3';
  const ROW_ICON = 'h-6 w-6 text-foreground shrink-0 mt-0.5';
  const useMosaic = !showExternalPlaceholder && photos.length >= 5;
  const openGalleryAt = (index: number) => { setCurrentPhotoIndex(index); setShowGallery(true); };
  const advertiserName = annonce.annonceurs?.nom_entreprise || `${annonce.annonceurs?.prenom || ''} ${annonce.annonceurs?.nom || ''}`;
  const advertiserType = annonce.annonceurs?.type_annonceur === 'particulier' ? 'Particulier' :
    annonce.annonceurs?.type_annonceur === 'agence' ? 'Agence immobilière' :
    annonce.annonceurs?.type_annonceur === 'promoteur' ? 'Promoteur' : 'Annonceur';
  const overview = [
    annonce.nombre_pieces ? `${annonce.nombre_pieces} pièces` : null,
    annonce.surface_habitable ? `${annonce.surface_habitable} m²` : null,
    annonce.nb_chambres ? `${annonce.nb_chambres} chambre${annonce.nb_chambres > 1 ? 's' : ''}` : null,
    annonce.nb_salles_bain ? `${annonce.nb_salles_bain} salle${annonce.nb_salles_bain > 1 ? 's' : ''} de bain` : null,
  ].filter(Boolean) as string[];
  const handleContact = async () => {
    if (userRoles.includes('candidat' as any)) {
      const { ouvrirConversationAnnonce } = await import('@/components/messaging/ConversationsAnnoncePanel');
      const id = await ouvrirConversationAnnonce(annonce.id);
      if (id) navigate(`/candidat/messages?conversation=${id}`);
      return;
    }
    setShowContactDialog(true);
  };
  const Feature = ({ icon: Icon, label, value, valueClass = '' }: { icon: any; label: string; value: React.ReactNode; valueClass?: string }) => (
    <div className={ROW}>
      <Icon className={ROW_ICON} strokeWidth={1.5} />
      <div className="min-w-0">
        <p className={`text-base text-foreground ${valueClass}`}>{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="theme-luxury min-h-screen bg-background">
      <PublicHeader />

      <div className="mx-auto max-w-[1120px] px-4 md:px-6 pt-20">
        {/* Fil d'Ariane */}
        <nav className="flex items-center gap-1.5 py-3 text-sm text-muted-foreground overflow-hidden" aria-label="Fil d'Ariane">
          <Link to="/annonces" className="hover:text-foreground hover:underline shrink-0">Annonces</Link>
          <span aria-hidden>›</span>
          <Link to={`/annonces/recherche?type=${annonce.type_transaction}`} className="hover:text-foreground hover:underline shrink-0">
            {annonce.type_transaction === 'location' ? 'Location' : 'Vente'}
          </Link>
          <span aria-hidden>›</span>
          {annonce.canton && (
            <>
              <Link to={`/annonces/recherche?canton=${annonce.canton}`} className="hover:text-foreground hover:underline shrink-0">
                {annonce.canton}
              </Link>
              <span aria-hidden>›</span>
            </>
          )}
          <span className="text-foreground truncate">{annonce.titre}</span>
        </nav>

        <PortailBannieres className="mb-4" />

        {/* Titre + actions (au-dessus des photos) */}
        <header className="pb-5">
          <h1 className="text-[22px] md:text-[26px] leading-tight font-semibold tracking-[-0.02em] text-foreground">
            {annonce.titre}
          </h1>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground">
              <span className="inline-flex items-center gap-1 font-medium underline-offset-2">
                <MapPin className="h-4 w-4" />
                {annonce.adresse}, {annonce.code_postal} {annonce.ville}{annonce.canton ? ` (${annonce.canton})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground underline-offset-2 hover:bg-muted hover:underline"
              >
                <Share2 className="h-4 w-4" /> Partager
              </button>
              <button
                type="button"
                onClick={handleFavorite}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground underline-offset-2 hover:bg-muted hover:underline"
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
                {isFavorite ? 'Favori' : 'Enregistrer'}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {annonce.est_mise_en_avant && (
              <Badge className="rounded-full border-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 mr-1 fill-current" />
                Excellente offre
              </Badge>
            )}
            <Badge variant="outline" className="rounded-full border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
              {annonce.type_transaction === 'location' ? 'À louer' : 'À vendre'}
            </Badge>
            {annonce.disponible_immediatement && (
              <Badge variant="outline" className="rounded-full border-border bg-background px-3 py-1 text-xs font-semibold text-success">
                <Check className="h-3 w-3 mr-1" />
                Disponible immédiatement
              </Badge>
            )}
            {annonce.categories_annonces?.nom && (
              <Badge variant="outline" className="rounded-full border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                {annonce.categories_annonces.nom}
              </Badge>
            )}
          </div>
        </header>

        {/* Photos + calculateur (desktop : calculateur à droite des photos) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="relative lg:col-span-2">
            {useMosaic ? (
              <>
                {/* Mosaïque (tablette / desktop) */}
                <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[420px] rounded-[14px] overflow-hidden">
                  {photos.slice(0, 5).map((photo: any, index: number) => (
                    <button
                      key={photo.id || index}
                      type="button"
                      onClick={() => openGalleryAt(index)}
                      className={`relative overflow-hidden ${index === 0 ? 'col-span-2 row-span-2' : ''}`}
                      aria-label={`Voir la photo ${index + 1}`}
                    >
                      <img src={photo.url} alt={index === 0 ? annonce.titre : ''} className="h-full w-full object-cover transition-[filter] duration-200 hover:brightness-90" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => openGalleryAt(0)}
                  className="hidden md:inline-flex absolute bottom-4 right-4 items-center gap-2 rounded-lg border border-foreground bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Grid3X3 className="h-4 w-4" />
                  Afficher toutes les photos
                </button>
              </>
            ) : null}

            {/* Photo principale (mobile, ou moins de 5 photos) */}
            <div className={useMosaic ? 'md:hidden' : ''}>
              <div
                className="relative aspect-[4/3] md:aspect-[16/9] max-h-[500px] rounded-[14px] overflow-hidden cursor-pointer group"
                onClick={() => !showExternalPlaceholder && setShowGallery(true)}
              >
                {showExternalPlaceholder ? (
                  <ExternalListingPlaceholder />
                ) : (
                  <img
                    src={mainPhoto}
                    alt={annonce.titre}
                    className="w-full h-full object-cover"
                  />
                )}

                {photos.length > 1 && (
                  <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                )}

                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    type="button"
                    aria-label={isFavorite ? 'Retirer des favoris' : 'Enregistrer'}
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-background/95 text-foreground ${SHADOW}`}
                    onClick={(e) => { e.stopPropagation(); handleFavorite(); }}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
                  </button>
                  <button
                    type="button"
                    aria-label="Partager"
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-background/95 text-foreground ${SHADOW}`}
                    onClick={(e) => { e.stopPropagation(); handleShare(); }}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Photo précédente"
                      className={`absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/95 text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${SHADOW}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex(prev => prev === 0 ? photos.length - 1 : prev - 1);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Photo suivante"
                      className={`absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/95 text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${SHADOW}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex(prev => prev === photos.length - 1 ? 0 : prev + 1);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              {photos.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {photos.slice(0, 6).map((photo: any, index: number) => (
                    <button
                      key={photo.id || index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`relative shrink-0 w-20 h-14 rounded-lg overflow-hidden ring-2 transition-all ${
                        index === currentPhotoIndex ? 'ring-foreground' : 'ring-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={photo.url} alt="" className="w-full h-full object-cover" />
                      {index === 5 && photos.length > 6 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-medium">
                          +{photos.length - 6}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Calculateur de budget (desktop) — colonne de droite, à côté des photos */}
          <div className="hidden lg:block lg:col-span-1">
            <div>
              <SearchTypeProvider>
                <BudgetCalcSection
                  compact
                  forceType={annonce.type_transaction === 'location' ? 'location' : 'achat'}
                  ctaHref="/nouveau-mandat"
                  ctaLabel="Faites-vous accompagner dans votre recherche"
                />
              </SearchTypeProvider>
            </div>
          </div>
        </section>

        {/* Contenu + carte de réservation */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16 pb-16">
          <div className="lg:col-span-2">
            {/* Aperçu */}
            <div className={SECTION}>
              <h2 className="text-[20px] leading-tight font-semibold text-foreground">
                {annonce.categories_annonces?.nom || (annonce.sous_type ? annonce.sous_type.replace(/_/g, ' ') : 'Logement')} · {annonce.ville}
              </h2>
              {overview.length > 0 && (
                <p className="mt-1 text-base text-foreground">{overview.join(' · ')}</p>
              )}
              <div className="mt-4 text-[22px] font-semibold text-foreground lg:hidden">
                {formatPrice(annonce.prix, annonce.type_transaction)}
                {annonce.charges_mensuelles && annonce.type_transaction === 'location' && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    + {annonce.charges_mensuelles} CHF charges
                  </span>
                )}
              </div>
            </div>

            {/* Chiffres clés */}
            {(annonce.surface_habitable || annonce.nombre_pieces || annonce.nb_chambres || annonce.nb_salles_bain) && (
              <div className={SECTION}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {annonce.surface_habitable && (
                    <div className="rounded-[14px] border border-border p-4">
                      <Maximize className="h-6 w-6 text-foreground mb-3" strokeWidth={1.5} />
                      <p className="text-base font-semibold text-foreground">{annonce.surface_habitable} m²</p>
                      <p className="text-sm text-muted-foreground">Surface</p>
                    </div>
                  )}
                  {annonce.nombre_pieces && (
                    <div className="rounded-[14px] border border-border p-4">
                      <Home className="h-6 w-6 text-foreground mb-3" strokeWidth={1.5} />
                      <p className="text-base font-semibold text-foreground">{annonce.nombre_pieces}</p>
                      <p className="text-sm text-muted-foreground">Pièces</p>
                    </div>
                  )}
                  {annonce.nb_chambres && (
                    <div className="rounded-[14px] border border-border p-4">
                      <Bed className="h-6 w-6 text-foreground mb-3" strokeWidth={1.5} />
                      <p className="text-base font-semibold text-foreground">{annonce.nb_chambres}</p>
                      <p className="text-sm text-muted-foreground">Chambres</p>
                    </div>
                  )}
                  {annonce.nb_salles_bain && (
                    <div className="rounded-[14px] border border-border p-4">
                      <Bath className="h-6 w-6 text-foreground mb-3" strokeWidth={1.5} />
                      <p className="text-base font-semibold text-foreground">{annonce.nb_salles_bain}</p>
                      <p className="text-sm text-muted-foreground">Salles de bain</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Annonceur (version compacte, style « hôte ») */}
            <div className={`${SECTION} flex items-center gap-4`}>
              {annonce.annonceurs?.logo_url && annonce.annonceurs?.id ? (
                <Link to={`/annonceur/${annonce.annonceurs.id}`} aria-label="Voir toutes les annonces de cet annonceur" className="shrink-0">
                  <img
                    src={annonce.annonceurs.logo_url}
                    alt={advertiserName}
                    className="w-12 h-12 rounded-full object-cover border border-border"
                  />
                </Link>
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground truncate">
                  Proposé par{' '}
                  {annonce.annonceurs?.id ? (
                    <Link to={`/annonceur/${annonce.annonceurs.id}`} className="underline-offset-2 hover:underline">{advertiserName}</Link>
                  ) : advertiserName}
                </p>
                <p className="text-sm text-muted-foreground">{advertiserType}</p>
              </div>
            </div>

            {/* Description */}
            <div className={SECTION}>
              <h2 className={H2}>Description</h2>
              <div className="max-w-none text-base leading-relaxed text-foreground/85">
                {annonce.description?.split('\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-3">{paragraph}</p>
                )) || <p>Aucune description disponible.</p>}
              </div>
            </div>

            {/* Emplacement */}
            <div className={SECTION}>
              <h2 className={H2}>Emplacement</h2>
              <div className="rounded-[14px] overflow-hidden">
                <AnnonceLocationMap
                  latitude={annonce.latitude}
                  longitude={annonce.longitude}
                  address={annonce.adresse}
                  ville={annonce.ville}
                  code_postal={annonce.code_postal}
                  afficher_adresse_exacte={annonce.afficher_adresse_exacte ?? true}
                  prix={annonce.prix}
                  type_transaction={annonce.type_transaction}
                />
              </div>
            </div>

            {/* Caractéristiques */}
            <div className={SECTION}>
              <h2 className={H2}>Caractéristiques</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                {annonce.sous_type && (
                  <Feature icon={Building2} label="Type de bien" value={annonce.sous_type.replace(/_/g, ' ')} valueClass="capitalize" />
                )}
                {annonce.etat_bien && (
                  <Feature icon={Home} label="État du bien" value={annonce.etat_bien.replace(/_/g, ' ')} valueClass="capitalize" />
                )}
                {annonce.etage !== null && annonce.etage !== undefined && (
                  <Feature icon={Building2} label="Étage" value={annonce.etage === 0 ? 'Rez-de-chaussée' : `${annonce.etage}e étage`} />
                )}
                {annonce.nb_etages_immeuble && (
                  <Feature icon={Building2} label="Étages dans l'immeuble" value={`${annonce.nb_etages_immeuble} étages`} />
                )}
                {annonce.annee_construction && (
                  <Feature icon={Calendar} label="Année de construction" value={annonce.annee_construction} />
                )}
                {annonce.annee_renovation && (
                  <Feature icon={Calendar} label="Dernière rénovation" value={annonce.annee_renovation} />
                )}
                {annonce.nb_wc && annonce.nb_wc > 0 && (
                  <Feature icon={Bath} label="WC séparés" value={annonce.nb_wc} />
                )}
                {annonce.classe_energetique && (
                  <Feature icon={Thermometer} label="Classe énergétique" value={annonce.classe_energetique} />
                )}
                {annonce.type_chauffage && (
                  <Feature icon={Thermometer} label="Type de chauffage" value={annonce.type_chauffage.replace(/_/g, ' ')} valueClass="capitalize" />
                )}
                {annonce.source_energie && (
                  <Feature icon={Thermometer} label="Source d'énergie" value={annonce.source_energie.replace(/_/g, ' ')} valueClass="capitalize" />
                )}
                {annonce.parking_inclus && (
                  <Feature
                    icon={Car}
                    label="Parking"
                    value={`${annonce.nb_places_parking || 1} place${(annonce.nb_places_parking || 1) > 1 ? 's' : ''}${annonce.type_parking ? ` (${annonce.type_parking.replace(/_/g, ' ')})` : ''}`}
                  />
                )}
                {annonce.acces_pmr && (
                  <Feature icon={Check} label="Accessibilité" value="Accès PMR" />
                )}
              </div>
            </div>

            {/* Espaces extérieurs */}
            {(annonce.balcon || annonce.terrasse || annonce.jardin || annonce.piscine) && (
              <div className={SECTION}>
                <h2 className={H2}>Espaces extérieurs</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  {annonce.balcon && (
                    <div className={ROW}><Home className={ROW_ICON} strokeWidth={1.5} /><span className="text-base text-foreground">Balcon{annonce.surface_balcon ? ` (${annonce.surface_balcon} m²)` : ''}</span></div>
                  )}
                  {annonce.terrasse && (
                    <div className={ROW}><Trees className={ROW_ICON} strokeWidth={1.5} /><span className="text-base text-foreground">Terrasse{annonce.surface_terrasse ? ` (${annonce.surface_terrasse} m²)` : ''}</span></div>
                  )}
                  {annonce.jardin && (
                    <div className={ROW}><Trees className={ROW_ICON} strokeWidth={1.5} /><span className="text-base text-foreground">Jardin{annonce.surface_jardin ? ` (${annonce.surface_jardin} m²)` : ''}</span></div>
                  )}
                  {annonce.piscine && (
                    <div className={ROW}><Waves className={ROW_ICON} strokeWidth={1.5} /><span className="text-base text-foreground">Piscine</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Équipements */}
            {annonce.equipements && Object.keys(annonce.equipements as Record<string, boolean>).length > 0 && (
              <div className={SECTION}>
                <h2 className={H2}>Équipements</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  {Object.entries(annonce.equipements as Record<string, boolean>).filter(([_, v]) => v).map(([key]) => {
                    const IconComponent = equipementIcons[key] || Check;
                    return (
                      <div key={key} className={ROW}>
                        <IconComponent className={ROW_ICON} strokeWidth={1.5} />
                        <span className="text-base text-foreground">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Points forts */}
            {annonce.points_forts && annonce.points_forts.length > 0 && (
              <div className={SECTION}>
                <h2 className={H2}>Points forts</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  {annonce.points_forts.map((point: string, index: number) => (
                    <li key={index} className={ROW}>
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-base text-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conditions de location */}
            {annonce.type_transaction === 'location' && (
              <div className={SECTION}>
                <h2 className={H2}>Conditions de location</h2>
                <dl className="divide-y divide-border">
                  {annonce.nb_mois_garantie && (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-base text-muted-foreground">Dépôt de garantie</dt>
                      <dd className="text-base font-medium text-foreground text-right">{annonce.nb_mois_garantie} mois de loyer</dd>
                    </div>
                  )}
                  {annonce.charges_mensuelles && (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-base text-muted-foreground">Charges mensuelles</dt>
                      <dd className="text-base font-medium text-foreground text-right">{annonce.charges_mensuelles} CHF{annonce.charges_comprises ? ' (incluses)' : ''}</dd>
                    </div>
                  )}
                  {annonce.disponible_immediatement && !annonce.disponible_des && (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-base text-muted-foreground">Disponibilité</dt>
                      <dd className="text-base font-medium text-success text-right">Immédiate</dd>
                    </div>
                  )}
                  {annonce.disponible_des && (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-base text-muted-foreground">Disponible dès</dt>
                      <dd className="text-base font-medium text-foreground text-right">
                        {format(new Date(annonce.disponible_des), 'dd MMMM yyyy', { locale: fr })}
                      </dd>
                    </div>
                  )}
                  {annonce.duree_bail_min && (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-base text-muted-foreground">Durée minimale du bail</dt>
                      <dd className="text-base font-medium text-foreground text-right">{annonce.duree_bail_min} mois</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-base text-muted-foreground">Animaux</dt>
                    <dd className="text-base font-medium text-foreground text-right">{annonce.animaux_autorises ? '✓ Autorisés' : '✗ Non autorisés'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-base text-muted-foreground">Fumeurs</dt>
                    <dd className="text-base font-medium text-foreground text-right">{annonce.fumeurs_acceptes ? '✓ Acceptés' : '✗ Non acceptés'}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Calculateur de budget (mobile) — juste après les conditions de location */}
            <div className="lg:hidden py-8 border-b border-border">
              <div>
                <SearchTypeProvider>
                  <BudgetCalcSection
                    compact
                    forceType={annonce.type_transaction === 'location' ? 'location' : 'achat'}
                    ctaHref="/nouveau-mandat"
                    ctaLabel="Faites-vous accompagner dans votre recherche"
                  />
                </SearchTypeProvider>
              </div>
            </div>

            {/* Signalement */}
            <div className="flex flex-wrap items-center gap-2 pt-6">
              <button type="button" onClick={handleReport} className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2 hover:text-muted-foreground">
                <Flag className="h-4 w-4" />
                Signaler cette annonce
              </button>
              <span className="text-xs text-muted-foreground">
                · Référence : {annonce.reference || annonce.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Carte de réservation (collante) */}
          <aside className="lg:col-span-1 pt-8">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className={`rounded-[14px] border border-border bg-background p-6 ${SHADOW}`}>
                <div className="flex items-baseline flex-wrap gap-x-2">
                  <span className="text-[22px] font-semibold text-foreground">{formatPrice(annonce.prix, annonce.type_transaction)}</span>
                  {annonce.charges_mensuelles && annonce.type_transaction === 'location' && (
                    <span className="text-sm text-muted-foreground">+ {annonce.charges_mensuelles} CHF charges</span>
                  )}
                </div>

                {(annonce.disponible_des || annonce.disponible_immediatement || annonce.nombre_pieces || annonce.surface_habitable) && (
                  <div className="mt-4 grid grid-cols-2 rounded-lg border border-foreground/30 text-left">
                    <div className="border-r border-foreground/30 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-foreground">Disponible</p>
                      <p className="text-sm text-foreground truncate">
                        {annonce.disponible_des
                          ? format(new Date(annonce.disponible_des), 'dd.MM.yyyy', { locale: fr })
                          : annonce.disponible_immediatement ? 'Immédiatement' : 'À convenir'}
                      </p>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-foreground">Logement</p>
                      <p className="text-sm text-foreground truncate">
                        {[annonce.nombre_pieces ? `${annonce.nombre_pieces} pcs` : null, annonce.surface_habitable ? `${annonce.surface_habitable} m²` : null].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <Button className="w-full h-12 text-base font-medium" onClick={() => setShowReserverDialog(true)}>
                    <CalendarCheck className="h-4 w-4 mr-2" />
                    Réserver une visite / Postuler
                  </Button>
                  <Button className="w-full h-12 text-base font-medium" variant="outline" onClick={handleContact}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contacter
                  </Button>
                  {annonce.annonceurs?.telephone && (
                    <Button variant="outline" className="w-full h-12 text-base font-medium" asChild>
                      <a href={`tel:${annonce.annonceurs.telephone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        {annonce.annonceurs.telephone}
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Annonceur */}
              <div className="rounded-[14px] border border-border bg-background p-6">
                <div className="flex items-start gap-4">
                  {annonce.annonceurs?.logo_url && annonce.annonceurs?.id ? (
                    <Link to={`/annonceur/${annonce.annonceurs.id}`} aria-label="Voir toutes les annonces de cet annonceur" className="shrink-0">
                      <img
                        src={annonce.annonceurs.logo_url}
                        alt={advertiserName}
                        className="w-16 h-16 rounded-full object-cover border border-border hover:opacity-90 transition-opacity"
                      />
                    </Link>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {annonce.annonceurs?.id ? (
                          <Link to={`/annonceur/${annonce.annonceurs.id}`} className="underline-offset-2 hover:underline">{advertiserName}</Link>
                        ) : advertiserName}
                      </h3>
                      {annonce.annonceurs?.est_verifie && <Shield className="h-4 w-4 text-success shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{advertiserType}</p>
                    {annonce.annonceurs?.note_moyenne && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-foreground">
                        <Star className="h-4 w-4 fill-foreground text-foreground" />
                        <span className="font-medium">{annonce.annonceurs.note_moyenne.toFixed(1)}</span>
                        <span className="text-muted-foreground">({annonce.annonceurs.nb_avis || 0} avis)</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="flex-1 h-11" onClick={handleFavorite}>
                    <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
                    {isFavorite ? 'Favori' : 'Sauvegarder'}
                  </Button>
                  <Button variant="outline" className="flex-1 h-11" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </Button>
                </div>
              </div>

              {/* Statistiques */}
              <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
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
          </aside>
        </section>
      </div>

      {/* Annonces similaires */}
      {similarAnnonces.length > 0 && (
        <section className="py-12 border-t border-border">
          <div className="mx-auto max-w-[1120px] px-4 md:px-6">
            <h2 className={H2}>Annonces similaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarAnnonces.map((similar) => (
                <PublicAnnonceCard key={similar.id} annonce={similar} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Galerie plein écran */}
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
              className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full"
              onClick={() => setShowGallery(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full"
              onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            <img
              src={photos[currentPhotoIndex]?.url}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-[14px]"
            />

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full"
              onClick={() => setCurrentPhotoIndex(prev => prev === photos.length - 1 ? 0 : prev + 1)}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {currentPhotoIndex + 1} / {photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {annonce && (
        <ReserverVisiteDialog open={showReserverDialog} onOpenChange={setShowReserverDialog} annonce={annonce} />
      )}

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