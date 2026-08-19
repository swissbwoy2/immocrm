import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '19 août 2026';

export default function ConditionsGenerales() {
  useEffect(() => {
    document.title = 'Conditions Générales d\'Utilisation — Logisorama by Immo-rama.ch';
    const meta = document.querySelector('meta[name="description"]');
    const content =
      "Conditions Générales d'Utilisation de Logisorama.ch, service exploité par Immo-rama.ch — entreprise individuelle Christ Ramazani, IDE CHE-442.303.796.";
    if (meta) meta.setAttribute('content', content);
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = content;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>

        <div className="flex items-start gap-3 mb-6">
          <FileText className="h-8 w-8 text-primary shrink-0 mt-1" />
          <div>
            <h1 className="text-4xl font-bold">Conditions Générales d'Utilisation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Logisorama.ch — Dernière mise à jour : {LAST_UPDATE}
            </p>
          </div>
        </div>

        <section className="space-y-10 text-base leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-3">1. Exploitant</h2>
            <p>
              La plateforme <strong>Logisorama.ch</strong>, ses applications mobiles et les services associés sont exploités par :
            </p>
            <ul className="mt-3 space-y-1">
              <li><strong>Immo-rama.ch — entreprise individuelle Christ Ramazani</strong></li>
              <li>Chemin de l'Esparcette 5, 1023 Crissier (VD), Suisse</li>
              <li>IDE : <strong>CHE-442.303.796</strong></li>
              <li>Email : <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a></li>
              <li>Téléphone : <a href="tel:+41216342839" className="text-primary hover:underline">+41 21 634 28 39</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Champ d'application</h2>
            <p>
              Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation du site Logisorama.ch, de ses applications mobiles, de ses interfaces web et des fonctionnalités associées. Les services contractuels spécifiques, notamment les mandats de recherche immobilière, peuvent faire l'objet de contrats complémentaires. En cas de contradiction, les dispositions spécialement convenues dans le contrat concerné priment pour le service correspondant.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Comptes et rôles</h2>
            <p>
              La plateforme peut proposer différents types de comptes et rôles, notamment client, agent, administrateur, coursier, apporteur, propriétaire, annonceur ou autre intervenant autorisé. Chaque utilisateur est responsable de l'exactitude des informations communiquées et de la confidentialité de ses moyens d'authentification. L'utilisateur ne doit pas permettre à un tiers non autorisé d'utiliser son compte.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Services</h2>
            <p>
              Logisorama.ch peut notamment proposer : recherche immobilière, matching automatisé, gestion d'un dossier, annonces immobilières, messagerie, visites physiques ou à distance, appels audio ou vidéo, live de visite, notifications, dépôt de candidatures, suivi des recherches et prestations administratives.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Informations immobilières</h2>
            <p>
              Les annonces et informations publiées sont fournies à titre informatif. Sauf engagement exprès contraire, Logisorama.ch ne garantit pas que les informations provenant d'un annonceur, d'une régie, d'un propriétaire ou d'une source externe soient exhaustives, immédiatement actualisées ou exemptes d'erreurs. L'utilisateur doit vérifier les éléments déterminants avant toute conclusion de contrat.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Annonces externes</h2>
            <p>
              Logisorama.ch peut référencer des offres provenant de sources immobilières tierces. Lorsqu'une annonce est identifiée comme « ANNONCE EXTERNE », Logisorama.ch agit comme service d'orientation ou d'indexation et peut présenter des informations factuelles permettant d'identifier l'offre ainsi qu'un lien vers la source. Les contenus protégés provenant de tiers, notamment photographies, descriptions originales, plans ou vidéos, ne doivent être reproduits ou réhébergés que lorsque Logisorama.ch dispose des droits ou autorisations nécessaires. Le simple fait qu'une annonce soit visible uniquement par des utilisateurs connectés ne supprime pas automatiquement les droits d'auteur du titulaire.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Dépôt d'annonces</h2>
            <p>
              Tout annonceur garantit : qu'il est autorisé à publier l'annonce ; que les informations communiquées sont sincères ; qu'il dispose des droits nécessaires sur les textes, photographies, vidéos et autres contenus publiés ; que l'annonce ne viole pas les droits de tiers ; qu'elle n'est ni frauduleuse, ni trompeuse, ni discriminatoire ou illicite. L'annonceur accorde à Immo-rama.ch, pour la durée de publication de son annonce, les droits nécessaires à l'hébergement, l'affichage et la diffusion des contenus qu'il fournit dans le cadre des services Logisorama.ch.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Modération</h2>
            <p>
              Immo-rama.ch peut contrôler, corriger la présentation, suspendre ou retirer une annonce lorsqu'elle paraît manifestement erronée, frauduleuse, illicite, expirée ou contraire aux présentes CGU. Cette possibilité ne crée pas une obligation générale de contrôler préalablement chaque information publiée par les utilisateurs.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">9. Messagerie</h2>
            <p>
              La messagerie doit être utilisée dans le cadre des finalités immobilières proposées par la plateforme. Sont notamment interdits le spam, le harcèlement, l'usurpation d'identité, les menaces, la fraude, la diffusion de logiciels malveillants et l'utilisation de la messagerie pour contourner les règles contractuelles ou légales.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">10. Appels audio, vidéo et live de visite</h2>
            <p>
              Logisorama.ch peut permettre des communications audio et vidéo en temps réel ainsi que des visites immobilières diffusées à distance. Les participants doivent respecter la vie privée, le droit à l'image, la confidentialité des lieux visités et les instructions de l'agent ou du propriétaire. Une diffusion en direct n'est pas automatiquement un enregistrement. Lorsqu'une fonctionnalité d'enregistrement est activée, les participants doivent être clairement informés avant le début de l'enregistrement et l'enregistrement ne doit commencer qu'après obtention des consentements nécessaires.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">11. Notifications</h2>
            <p>
              L'utilisateur peut recevoir des notifications dans l'application, par e-mail ou, lorsqu'il les autorise sur son appareil, par notification push. Les notifications non essentielles peuvent être désactivées selon les paramètres disponibles. Les communications marketing sont gérées séparément des notifications strictement nécessaires au service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">12. Intelligence artificielle</h2>
            <p>
              Logisorama.ch peut utiliser des mécanismes automatisés ou assistés par intelligence artificielle pour pré-classer des annonces, effectuer un matching, générer des suggestions ou assister ses collaborateurs. Le pré-tri effectué par ces outils ne remplace pas la décision finale, qui demeure humaine.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">13. Propriété intellectuelle</h2>
            <p>
              La plateforme, sa structure, son interface, ses marques, ses logiciels, ses créations graphiques et ses contenus propres sont protégés conformément au droit applicable. L'utilisateur ne peut pas extraire, copier, reproduire ou exploiter commercialement ces éléments sans autorisation lorsqu'une telle utilisation dépasse les droits que lui confère la loi.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">14. Utilisations interdites</h2>
            <p>
              Sont notamment interdits : la création de faux comptes ; la transmission de faux documents ; l'accès non autorisé aux comptes ou données de tiers ; l'extraction massive automatisée de contenus ; la tentative de contourner les mesures de sécurité ; l'utilisation frauduleuse des documents de candidature ; l'utilisation de la plateforme contrairement au droit applicable.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">15. Services et sites tiers</h2>
            <p>
              La plateforme peut contenir des liens ou intégrations provenant de fournisseurs ou sites tiers. Ces services restent soumis à leurs propres conditions lorsqu'ils sont juridiquement indépendants d'Immo-rama.ch.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">16. Disponibilité</h2>
            <p>
              Immo-rama.ch met en œuvre des moyens raisonnables pour assurer la disponibilité du service mais ne garantit pas une disponibilité permanente ou sans interruption. Des maintenances, incidents techniques ou événements dépendant de fournisseurs tiers peuvent affecter temporairement certaines fonctionnalités.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">17. Responsabilité</h2>
            <p>
              Immo-rama.ch répond conformément au droit suisse des dommages qui lui sont juridiquement imputables. Elle ne garantit pas l'attribution d'un logement, l'exactitude absolue des informations de tiers ou la disponibilité permanente des biens référencés. Les limitations prévues par les présentes CGU ne s'appliquent pas lorsque le droit impératif interdit une limitation de responsabilité.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">18. Suspension et clôture d'un compte</h2>
            <p>
              Un compte peut être suspendu ou clôturé notamment en cas de violation grave ou répétée des présentes CGU, utilisation frauduleuse, atteinte à la sécurité ou obligation légale. La clôture d'un compte n'efface pas automatiquement les données dont la conservation demeure nécessaire pour respecter une obligation légale, gérer une procédure ou établir des droits contractuels.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">19. Modification des CGU</h2>
            <p>
              Les CGU peuvent être adaptées pour tenir compte de changements légaux, techniques ou fonctionnels. Les modifications importantes sont communiquées de manière appropriée avant leur entrée en vigueur lorsqu'elles concernent un contrat en cours.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">20. Droit applicable et for</h2>
            <p>
              Le droit suisse est applicable. Les tribunaux compétents sont déterminés conformément au droit suisse, les fors impératifs ou protecteurs applicables aux consommateurs demeurant réservés.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
