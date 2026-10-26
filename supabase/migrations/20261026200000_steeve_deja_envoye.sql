-- « Déjà envoyé » : une candidature au statut « demande_postulation » n'est pas un dossier envoyé.
-- Sa date_depot est remplie dès la demande du client (= created_at), ce qui faisait classer « déjà envoyé » toutes les
-- demandes de postulation : Steeve refusait alors de reprendre et d'envoyer ces dossiers (constaté le 26.10.2026 :
-- Avenue de la Rochelle 18, Chemin des Bossons 1, Rue des Glaciers 6, aucune trace d'envoi).
-- Restent « déjà envoyé » : candidature déposée (tout autre statut), offre au statut candidature_deposee / acceptee,
-- dossier préparé marqué envoyé, envoi de Steeve réussi. Additive et idempotente.
CREATE OR REPLACE FUNCTION public.steeve_dossier_deja_envoye(p_offre_id uuid, p_client_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.candidatures ca WHERE ca.offre_id = p_offre_id AND ca.client_id = p_client_id
                   AND ca.date_depot IS NOT NULL AND coalesce(ca.statut, '') <> 'demande_postulation')
      OR EXISTS (SELECT 1 FROM public.offres o WHERE o.id = p_offre_id AND o.client_id = p_client_id
                   AND o.statut IN ('candidature_deposee', 'acceptee'))
      OR EXISTS (SELECT 1 FROM public.postulations_preparees pp WHERE pp.offre_id = p_offre_id AND pp.client_id = p_client_id AND pp.statut = 'envoye')
      OR EXISTS (SELECT 1 FROM public.steeve_actions sa WHERE sa.offre_id = p_offre_id AND sa.client_id = p_client_id AND sa.kind = 'envoi_dossier' AND sa.statut = 'fait');
$function$;
