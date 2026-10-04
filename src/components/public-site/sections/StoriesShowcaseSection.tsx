import { useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BedDouble, ChevronLeft, ChevronRight, Home, MapPin, Maximize2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function StoriesShowcaseSection() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { data: annonces = [] } = useQuery({
    queryKey: ["landing-biens-exception"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annonces_publiques")
        .select(
          "id, slug, titre, adresse, ville, prix, nombre_pieces, surface_habitable, type_transaction, photos_annonces_publiques(url, est_principale)",
        )
        .eq("statut", "publie")
        .eq("est_mise_en_avant", true)
        .eq("source", "immo-rama.ch")
        .or(`date_expiration.is.null,date_expiration.gt.${new Date().toISOString()}`)
        .order("mise_en_avant_rang", { ascending: true, nullsFirst: false })
        .order("date_publication", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (annonces.length === 0) return null;

  return (
    <section aria-label="Notre sélection !" className="min-w-0 py-5 md:py-8">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Notre sélection !</h2>
          <p className="mt-2 text-sm text-muted-foreground">Les meilleures offres Immo-Rama, avant tout le monde</p>
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Annonce précédente"
            title="Annonce précédente"
            onClick={() => scrollerRef.current?.scrollBy({ left: -340, behavior: "smooth" })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Annonce suivante"
            title="Annonce suivante"
            onClick={() => scrollerRef.current?.scrollBy({ left: 340, behavior: "smooth" })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={scrollerRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
        {annonces.map((annonce) => {
          const photo =
            annonce.photos_annonces_publiques?.find((p) => p.est_principale)?.url ??
            annonce.photos_annonces_publiques?.[0]?.url;
          const href = `/annonces/${annonce.slug || annonce.id}`;
          return (
            <article
              key={annonce.id}
              className="flex w-[min(82vw,320px)] shrink-0 snap-start flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <Link
                to={href}
                aria-label={`Voir l'annonce : ${annonce.titre}`}
                className="block aspect-[4/3] overflow-hidden bg-muted"
              >
                {photo ? (
                  <img
                    src={photo}
                    alt={annonce.titre || "Bien immobilier"}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 motion-safe:hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center">
                    <Home className="h-12 w-12 text-muted-foreground" />
                  </span>
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Excellente offre
                  </Badge>
                  <Badge variant="secondary">{annonce.type_transaction === "vente" ? "À vendre" : "À louer"}</Badge>
                </div>
                <div>
                  <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-foreground">
                    {annonce.titre}
                  </h3>
                  <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="line-clamp-1">{annonce.adresse || annonce.ville}</span>
                  </p>
                </div>
                <p className="text-xl font-bold text-primary">
                  {annonce.prix != null
                    ? `${new Intl.NumberFormat("fr-CH").format(annonce.prix)} CHF${annonce.type_transaction === "vente" ? "" : "/mois"}`
                    : "Prix sur demande"}
                </p>
                <div className="flex min-h-5 flex-wrap gap-4 text-sm text-muted-foreground">
                  {annonce.nombre_pieces != null && (
                    <span className="flex items-center gap-1">
                      <BedDouble className="h-4 w-4" />
                      {annonce.nombre_pieces} pièces
                    </span>
                  )}
                  {annonce.surface_habitable != null && (
                    <span className="flex items-center gap-1">
                      <Maximize2 className="h-4 w-4" />
                      {annonce.surface_habitable} m²
                    </span>
                  )}
                </div>
                <Button asChild className="mt-auto w-full">
                  <Link to={href}>
                    Voir l'annonce <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
