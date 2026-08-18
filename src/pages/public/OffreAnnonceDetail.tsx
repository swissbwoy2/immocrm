import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { AnnonceLocationMap } from '@/components/public/AnnonceLocationMap';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { galerieUrls } from '@/hooks/usePortailOffres';
import { useSourcedListingAccess } from '@/hooks/useSourcedListingAccess';
import {
  ArrowLeft, ExternalLink, MapPin, Ruler, Layers, Home, CalendarDays, Flame,
  Compass, Zap, Building2, Phone, ImageOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OffrePublique {
  id: string;
  titre: string | null;
  type_bien: string | null;
  pieces: number | null;
  surface: number | null;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  prix: number | null;
  etage: string | null;
  lien_annonce: string | null;
  medias_galerie: any;
  date_envoi: string | null;
  description: string | null;
  equipements: string[] | null;
  annee_construction: number | null;
  type_chauffage: string | null;
  orientation: string | null;
  classe_energetique: string | null;
  disponibilite: string | null;
  contact_visite: string | null;
  contact_annonceur: string | null;
  contact_gerance: string | null;
  prochaine_visite: string | null;
}

const formatPrix = (p?: number | null) =>
  p == null ? '—' : new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(p);

export default function OffreAnnonceDetail() {
  const { id = '' } = useParams();
  const [activePhoto, setActivePhoto] = useState(0);
  const [brokenPhotos, setBrokenPhotos] = useState<string[]>([]);
  const { canViewInternalListing, isLoading: accessLoading } = useSourcedListingAccess();

  const { data: offre, isLoading } = useQuery({
    queryKey: ['portail-offre', id],
    enabled: !!id,
    queryFn: async (): Promise<OffrePublique | null> => {
      const { data, error } = await supabase.rpc('get_public_offre' as any, { p_id: id });
      if (error) throw error;
      return ((data as any[]) || [])[0] ?? null;
    },
  });

  const { data: previewImage } = useQuery({
    queryKey: ['portail-offre-preview', offre?.lien_annonce],
    enabled: !!offre?.lien_annonce && galerieUrls(offre?.medias_galerie).length === 0,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.functions.invoke('get-public-showcase-preview', {
        body: { urls: [offre!.lien_annonce] },
      });
      if (error) {
        console.error('[Portail] Aperçu du lien indisponible:', error.message);
        return null;
      }
      return (data as any)?.previews?.[offre!.lien_annonce!]?.image_url ?? null;
    },
  });

  const photos = useMemo(() => {
    const g = galerieUrls(offre?.medias_galerie).filter((u) => !brokenPhotos.includes(u));
    if (g.length) return g;
    return previewImage && !brokenPhotos.includes(previewImage) ? [previewImage] : [];
  }, [offre?.medias_galerie, previewImage, brokenPhotos]);

  // Annonce sourcée : la fiche interne est réservée aux clients connectés.
  // Le visiteur public est renvoyé vers l'annonce d'origine.
  const redirectToSource = !accessLoading && !canViewInternalListing && !!offre?.lien_annonce;
  useEffect(() => {
    if (redirectToSource && offre?.lien_annonce) {
      window.location.replace(offre.lien_annonce);
    }
  }, [redirectToSource, offre?.lien_annonce]);

  useEffect(() => {
    if (!offre) return;
    const t = `${offre.titre || 'Annonce'} — ${offre.ville || ''} | Logisorama`.slice(0, 60);
    document.title = t;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      'content',
      `${offre.type_bien || 'Bien'} ${offre.pieces ? `${offre.pieces} pièces ` : ''}à ${offre.ville || 'Suisse'} — ${formatPrix(offre.prix)}.`.slice(0, 158),
    );
  }, [offre]);

  if (isLoading || accessLoading) {
    return (
      <div className="theme-luxury min-h-screen bg-background">
        <PublicHeader />
        <div className="container mx-auto px-4 pt-24 pb-12 space-y-4">
          <div className="h-72 bg-muted animate-pulse rounded-xl" />
          <div className="h-6 w-1/2 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (offre && !canViewInternalListing) {
    return (
      <div className="theme-luxury min-h-screen bg-background">
        <PublicHeader />
        <div className="container mx-auto px-4 pt-28 pb-16 max-w-xl text-center space-y-4">
          <h1 className="text-2xl font-semibold">Annonce publiée sur un portail partenaire</h1>
          <p className="text-muted-foreground">
            Le détail complet de ce bien est consultable sur l'annonce d'origine, ou dans votre espace
            personnel Logisorama si vous êtes client.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            {offre.lien_annonce && (
              <Button asChild>
                <a href={offre.lien_annonce} target="_blank" rel="noopener noreferrer nofollow">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir l'annonce d'origine
                </a>
              </Button>
            )}
            <Button asChild variant="outline"><Link to="/login">Je suis client — me connecter</Link></Button>
          </div>
          <Button asChild variant="ghost" className="mt-2">
            <Link to="/annonces/recherche"><ArrowLeft className="h-4 w-4 mr-2" />Retour aux annonces</Link>
          </Button>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!offre) {
    return (
      <div className="theme-luxury min-h-screen bg-background">
        <PublicHeader />
        <div className="container mx-auto px-4 pt-28 pb-16 text-center">
          <h1 className="text-2xl font-semibold mb-3">Annonce introuvable</h1>
          <Button asChild variant="outline"><Link to="/annonces/recherche">Retour aux annonces</Link></Button>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const contact = offre.contact_visite || offre.contact_annonceur || offre.contact_gerance;

  const caracs: { icon: any; label: string; value: string }[] = [
    { icon: Home, label: 'Type', value: offre.type_bien || '—' },
    { icon: Layers, label: 'Pièces', value: offre.pieces != null ? `${offre.pieces}` : '—' },
    { icon: Ruler, label: 'Surface', value: offre.surface != null ? `${offre.surface} m²` : '—' },
    { icon: Building2, label: 'Étage', value: offre.etage || '—' },
    { icon: CalendarDays, label: 'Disponibilité', value: offre.disponibilite || '—' },
    { icon: Building2, label: 'Année', value: offre.annee_construction ? `${offre.annee_construction}` : '—' },
    { icon: Flame, label: 'Chauffage', value: offre.type_chauffage || '—' },
    { icon: Compass, label: 'Orientation', value: offre.orientation || '—' },
    { icon: Zap, label: 'Classe énergétique', value: offre.classe_energetique || '—' },
  ];

  return (
    <div className="theme-luxury min-h-screen bg-background">
      <PublicHeader />

      <main className="container mx-auto px-4 pt-20 pb-16">
        <Button asChild variant="ghost" size="sm" className="mb-3 cursor-pointer">
          <Link to="/annonces/recherche"><ArrowLeft className="h-4 w-4 mr-2" />Toutes les annonces</Link>
        </Button>

        {/* Galerie */}
        <section className="mb-6">
          {photos.length > 0 ? (
            <div className="space-y-3">
              <div className="relative w-full mx-auto rounded-xl overflow-hidden bg-muted aspect-[16/10] max-h-[460px]">
                <img
                  src={photos[Math.min(activePhoto, photos.length - 1)]}
                  alt={`${offre.titre || 'Annonce'} — ${offre.ville || ''}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="eager"
                  onError={() => {
                    const url = photos[Math.min(activePhoto, photos.length - 1)];
                    setBrokenPhotos((p) => (p.includes(url) ? p : [...p, url]));
                    setActivePhoto(0);
                  }}
                />
              </div>
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photos.map((p, i) => (
                    <button
                      key={p + i}
                      type="button"
                      onClick={() => setActivePhoto(i)}
                      className={cn(
                        'h-16 w-24 shrink-0 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer',
                        i === activePhoto ? 'border-primary' : 'border-transparent',
                      )}
                    >
                      <img
                        src={p}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={() => setBrokenPhotos((prev) => (prev.includes(p) ? prev : [...prev, p]))}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-muted aspect-[16/7] flex flex-col items-center justify-center text-muted-foreground">
              <ImageOff className="h-10 w-10 mb-2" />
              <p className="text-sm">Photos disponibles sur l'annonce d'origine</p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <header>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge>À louer</Badge>
                {offre.type_bien && <Badge variant="secondary">{offre.type_bien}</Badge>}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">{offre.titre || 'Annonce immobilière'}</h1>
              <p className="flex items-center gap-2 text-muted-foreground mt-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span>{offre.adresse}</span>
              </p>
              <p className="text-2xl font-bold text-primary mt-3">{formatPrix(offre.prix)}<span className="text-sm font-medium text-muted-foreground">/mois</span></p>
            </header>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <h2 className="font-semibold mb-4">Caractéristiques</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {caracs.map((c) => (
                    <div key={c.label} className="flex items-start gap-2 min-w-0">
                      <c.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className="text-sm font-medium truncate">{c.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {offre.equipements?.length ? (
                  <>
                    <Separator className="my-4" />
                    <h3 className="font-semibold mb-2 text-sm">Équipements</h3>
                    <div className="flex flex-wrap gap-2">
                      {offre.equipements.map((e) => (
                        <Badge key={e} variant="outline">{e}</Badge>
                      ))}
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {offre.description && (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h2 className="font-semibold mb-3">Descriptif</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{offre.description}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4 sm:p-6">
                <h2 className="font-semibold mb-3">Localisation</h2>
                <AnnonceLocationMap
                  latitude={null}
                  longitude={null}
                  address={offre.adresse || ''}
                  ville={offre.ville || ''}
                  code_postal={offre.code_postal || ''}
                />
              </CardContent>
            </Card>
          </div>

          {/* Colonne contact */}
          <aside className="lg:sticky lg:top-24 h-fit space-y-4">
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <h2 className="font-semibold">Pour visiter / contact</h2>

                {offre.prochaine_visite && (
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-xs text-muted-foreground">Prochaine visite</p>
                    <p className="text-sm font-semibold">
                      {new Date(offre.prochaine_visite).toLocaleString('fr-CH', {
                        timeZone: 'Europe/Zurich',
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                )}

                {contact ? (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm whitespace-pre-line break-words">{contact}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Les informations de visite sont indiquées sur l'annonce d'origine.
                  </p>
                )}

                {(offre.contact_gerance || offre.contact_annonceur) && contact !== (offre.contact_gerance || offre.contact_annonceur) && (
                  <div className="text-sm text-muted-foreground whitespace-pre-line break-words">
                    {offre.contact_gerance || offre.contact_annonceur}
                  </div>
                )}

                {offre.lien_annonce && (
                  <Button asChild className="w-full cursor-pointer">
                    <a href={offre.lien_annonce} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ouvrir l'annonce
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
