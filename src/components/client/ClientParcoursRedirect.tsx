import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClientParcours } from '@/hooks/useClientParcours';
import { remapClientPathForParcours } from '@/lib/notificationLinks';

/**
 * Un acheteur ne doit jamais atterrir sur un écran de location (offres reçues, candidatures,
 * vidéos, visites…) : les e-mails, notifications push et anciens liens pointent parfois vers
 * ces écrans. On le renvoie vers l'équivalent achat en conservant les paramètres
 * (ex. ?offre=<id> ouvre directement la fiche du bien).
 */
export function ClientParcoursRedirect() {
  const { userRole } = useAuth();
  const isClient = userRole === 'client';
  const parcours = useClientParcours(isClient);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isClient || parcours !== 'achat') return;
    // Client qui loue aussi : les écrans location (offres, candidatures, vidéos, visites) restent accessibles
    // quand on y arrive depuis son espace location (paramètre « location=1 »).
    if (new URLSearchParams(location.search).get('location') === '1') return;
    const cible = remapClientPathForParcours(location.pathname, 'achat');
    if (cible !== location.pathname) {
      navigate(`${cible}${location.search}${location.hash}`, { replace: true });
    }
  }, [isClient, parcours, location.pathname, location.search, location.hash, navigate]);

  return null;
}
