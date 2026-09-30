import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const RETENU_BAILLEUR = 'retenu_bailleur';

export interface UnifiedCandidature {
  id: string;
  source: 'candidature' | 'location';
  adresse: string;
  statut: string;
  date: string;
  dossier: string;
  lien_annonce?: string | null;
  prix?: number | null;
  pieces?: number | null;
  surface?: number | null;
  medias_galerie?: unknown;
  date_visite?: string | null;
}

const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  en_analyse: 'En analyse',
  documents_demandes: 'Documents demandés',
  visite_planifiee: 'Visite planifiée',
  visite_effectuee: 'Visite effectuée',
  accepte: 'Acceptée',
  acceptee: 'Acceptée',
  refuse: 'Refusée',
  refusee: 'Refusée',
  desiste: 'Désistée',
  attente_bail: 'Bail en préparation',
  bail_recu: 'Bail reçu',
  signature_planifiee: 'Signature planifiée',
  signature_effectuee: 'Signature effectuée',
  bail_conclu: 'Bail conclu',
  etat_lieux_fixe: 'État des lieux fixé',
  cles_remises: 'Clés remises',
  retenu_bailleur: 'Retenu — à présenter au bailleur',
};

export const statutLabel = (s: string) => STATUT_LABELS[s] ?? s;

export function useCandidatCandidatures() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['candidat-candidatures', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UnifiedCandidature[]> => {
      const [{ data: c }, { data: l }] = await Promise.all([
        supabase
          .from('candidatures')
           .select('id, statut, date_depot, created_at, dossier_complet, offres(adresse, titre, lien_annonce, prix, pieces, surface, medias_galerie)')
          .order('created_at', { ascending: false }),
        supabase
          .from('candidatures_location')
          .select('id, statut, created_at, documents, date_visite, creneau_id, annonce_creneaux(date_heure), annonces_publiques(titre, adresse, ville)')
          .order('created_at', { ascending: false }),
      ]);
      const a: UnifiedCandidature[] = (c ?? []).map((r: any) => ({
        id: r.id,
        source: 'candidature',
        adresse: r.offres?.adresse || r.offres?.titre || 'Bien proposé',
        statut: r.statut || 'en_attente',
        date: r.date_depot || r.created_at,
        dossier: r.statut === RETENU_BAILLEUR ? 'Pièces à fournir' : r.dossier_complet ? 'Dossier complet' : 'Demande envoyée',
        lien_annonce: r.offres?.lien_annonce,
        prix: r.offres?.prix,
        pieces: r.offres?.pieces,
        surface: r.offres?.surface,
        medias_galerie: r.offres?.medias_galerie,
      }));
      const b: UnifiedCandidature[] = (l ?? []).map((r: any) => ({
        id: r.id,
        source: 'location',
        adresse: r.annonces_publiques
          ? [r.annonces_publiques.adresse, r.annonces_publiques.ville].filter(Boolean).join(', ') || r.annonces_publiques.titre
          : 'Demande de location',
        date_visite: r.annonce_creneaux?.date_heure || r.date_visite,
        statut: r.statut || 'en_attente',
        date: r.created_at,
        dossier: r.statut === RETENU_BAILLEUR ? 'Pièces à fournir' : 'Demande envoyée',
      }));
      return [...a, ...b].sort((x, y) => (y.date || '').localeCompare(x.date || ''));
    },
  });
}
