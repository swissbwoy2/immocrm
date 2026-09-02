import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '21 août 2026';

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
              Logisorama.ch — Version contractuelle consolidée — Dernière mise à jour : {LAST_UPDATE}
            </p>
          </div>
        </div>

        <section className="space-y-10 text-base leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-3">1. Exploitant et cocontractant</h2>
            <p>
              La plateforme <strong>Logisorama.ch</strong>, ses applications mobiles, interfaces web et services associés sont exploités par :
            </p>
            <ul className="mt-3 space-y-1">
              <li><strong>Immo-rama.ch — entreprise individuelle Christ Ramazani</strong></li>
              <li>Chemin de l'Esparcette 5, 1023 Crissier (VD), Suisse</li>
              <li>IDE : <strong>CHE-442.303.796</strong></li>
              <li>Courriel : <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a></li>
              <li>Téléphone : <a href="tel:+41216343161" className="text-primary hover:underline">+41 21 634 31 61</a></li>
            </ul>
            <p className="mt-3">
              Sauf indication expresse contraire au moment de la commande, Immo-rama.ch est le cocontractant de l'Utilisateur.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Champ d'application, incorporation et hiérarchie</h2>
            <p>
              Les présentes Conditions générales d'utilisation régissent tout accès et toute utilisation de Logisorama. Leur acceptation intervient au moyen d'un mécanisme permettant à l'Utilisateur d'en prendre connaissance, de les conserver et de manifester son accord. Les mandats, offres, tarifs, politiques ou conditions particulières applicables à une prestation déterminée complètent les présentes CGU et priment en cas de contradiction pour cette seule prestation. Le droit impératif demeure réservé.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Capacité, comptes et rôles</h2>
            <p>
              L'Utilisateur déclare disposer de l'exercice des droits civils ou agir avec l'autorisation valable de son représentant légal. Les rôles proposés peuvent notamment comprendre client, agent, administrateur, coursier, apporteur, propriétaire ou annonceur. L'Utilisateur garantit l'exactitude, l'actualité et la licéité des informations fournies, assure la confidentialité de ses identifiants et informe immédiatement Immo-rama.ch de tout accès non autorisé. Les actes accomplis au moyen de son compte lui sont imputables dans les limites du droit applicable.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Description et évolution des services</h2>
            <p>
              Logisorama peut fournir des outils de recherche et de matching, gestion de dossiers, publication ou indexation d'annonces, messagerie, visites physiques ou à distance, appels audio ou vidéo, notifications, dépôt de candidatures, suivi et prestations administratives. La description disponible lors de la commande détermine la prestation due. Les adaptations techniques ne doivent pas supprimer une caractéristique essentielle d'une prestation payante en cours sans base contractuelle ni information appropriée.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Informations immobilières et devoir de vérification</h2>
            <p>
              Les informations relatives aux biens proviennent notamment d'annonceurs, propriétaires, régies, agences ou sources tierces. Sous réserve d'une garantie expressément assumée, Immo-rama.ch ne garantit ni leur exhaustivité ni leur actualité permanente. Elle corrige toutefois dans un délai approprié toute erreur substantielle portée à sa connaissance et vérifiable. L'Utilisateur doit vérifier les éléments déterminants, notamment prix, surfaces, disponibilité, charges, état, droits réels et conditions contractuelles, avant de s'engager.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Annonces externes et droits de tiers</h2>
            <p>
              Une annonce identifiée comme externe constitue un référencement ou un service d'orientation vers la source. Les photographies, plans, descriptions originales, bases de données et autres contenus protégés ne sont reproduits, adaptés ou réhébergés que sur la base d'une licence, d'une autorisation ou d'une exception légale applicable. Le référencement doit permettre d'identifier la source et respecter ses conditions licites. Tout titulaire de droits peut adresser une demande motivée de retrait à info@immo-rama.ch.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Dépôt d'annonces et licence de publication</h2>
            <p>
              L'Annonceur garantit disposer du pouvoir de proposer le bien et de tous les droits nécessaires sur les contenus transmis. Il garantit que l'annonce est exacte, non trompeuse, non discriminatoire et conforme au droit. Il concède à Immo-rama.ch, pour la durée nécessaire à la publication et à la promotion du bien sur les canaux convenus, une licence non exclusive, territoriale dans la mesure du service, permettant d'héberger, reproduire techniquement, redimensionner, afficher et communiquer les contenus. L'Annonceur répond des prétentions de tiers résultant d'une violation qui lui est imputable.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Modération et retrait</h2>
            <p>
              Immo-rama.ch peut refuser, suspendre, corriger la présentation ou retirer tout contenu manifestement erroné, expiré, frauduleux, illicite ou contraire aux présentes CGU. Cette faculté ne crée aucune obligation générale de surveillance préalable. Lorsque les circonstances le permettent, l'Utilisateur est informé du motif et peut fournir des observations ; les mesures urgentes de sécurité, de prévention de fraude ou imposées par une autorité demeurent réservées.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">9. Messagerie et communications</h2>
            <p>
              La messagerie est réservée aux finalités du service. Sont interdits le spam, le harcèlement, les menaces, l'usurpation d'identité, la fraude, les contenus illicites, les logiciels malveillants, la collecte non autorisée de données et le contournement des protections contractuelles ou techniques. Immo-rama.ch peut conserver les éléments nécessaires à la sécurité, au traitement d'un signalement ou à l'établissement de droits, conformément à la politique de confidentialité.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">10. Appels audio, vidéo et visites en direct</h2>
            <p>
              Les participants respectent la confidentialité, le droit à l'image, le domicile et les instructions du propriétaire ou de l'agent. Les communications en direct ne sont pas enregistrées par défaut. Toute activation d'une fonction d'enregistrement doit être précédée d'une information claire sur la finalité, les destinataires et la durée de conservation, ainsi que de l'obtention des consentements requis. Un participant peut refuser l'enregistrement sans perdre l'accès aux fonctions essentielles lorsque l'enregistrement n'est pas indispensable.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">11. Notifications et communications commerciales</h2>
            <p>
              Les notifications strictement nécessaires à la sécurité, à l'exécution d'un contrat ou au suivi d'une demande peuvent être adressées par les canaux fournis. Les notifications facultatives et les communications commerciales peuvent être paramétrées ou désactivées. Tout consentement marketing est distinct, libre et révocable, sans effet rétroactif sur les traitements licites antérieurs.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">12. Systèmes automatisés et intelligence artificielle</h2>
            <p>
              Logisorama peut utiliser des outils automatisés pour classer, rapprocher ou suggérer des annonces et assister ses collaborateurs. Sauf information contraire conforme à l'art. 21 LPD, ces outils n'adoptent pas seuls une décision produisant des effets juridiques ou affectant significativement l'Utilisateur. Les résultats constituent des aides susceptibles d'erreurs et font l'objet d'une appréciation humaine lorsque la décision le requiert.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">13. Propriété intellectuelle</h2>
            <p>
              Sous réserve des droits de tiers, les logiciels, bases de données, interfaces, marques, signes distinctifs, textes et créations propres à Logisorama ou Immo-rama.ch sont protégés. Aucun droit n'est transféré à l'Utilisateur au-delà de la licence personnelle, révocable, non exclusive et non transférable nécessaire à l'utilisation normale du service pendant la relation contractuelle.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">14. Utilisations interdites</h2>
            <p>
              Il est notamment interdit de créer de faux comptes, fournir de faux documents, accéder sans droit à un système ou à des données, contourner une mesure de sécurité, extraire massivement les contenus, automatiser des requêtes non autorisées, porter atteinte aux droits de tiers, détourner un dossier de candidature, tester les vulnérabilités sans autorisation ou utiliser la plateforme à des fins illicites.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">15. Services de tiers</h2>
            <p>
              Les services techniquement ou juridiquement fournis par un tiers peuvent être soumis aux conditions de ce tiers. Immo-rama.ch sélectionne et encadre ses sous-traitants conformément au droit applicable, mais ne devient pas partie à un contrat conclu directement entre l'Utilisateur et un fournisseur indépendant. Les responsabilités impératives et les obligations propres d'Immo-rama.ch demeurent réservées.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">16. Disponibilité, maintenance et sécurité</h2>
            <p>
              Immo-rama.ch met en œuvre les moyens techniques et organisationnels raisonnablement exigibles pour assurer la disponibilité et la sécurité du service, sans garantir une exploitation ininterrompue. Les maintenances, incidents, cyberattaques ou défaillances de tiers peuvent entraîner des interruptions. Les opérations planifiées importantes sont annoncées lorsque cela est raisonnablement possible.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">17. Responsabilité</h2>
            <p>
              Immo-rama.ch répond des dommages directs dont les conditions légales d'imputation sont établies. Elle ne garantit ni l'attribution d'un logement, ni la conclusion d'une acquisition, ni la disponibilité permanente d'un bien. Toute exclusion s'interprète restrictivement et ne s'applique pas au dol ou à la faute grave au sens de l'art. 100 CO, à l'atteinte à la vie ou à l'intégrité corporelle, ni aux responsabilités qui ne peuvent être exclues. La responsabilité pour les auxiliaires demeure régie par le droit applicable.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">18. Suspension et clôture</h2>
            <p>
              Immo-rama.ch peut suspendre ou clôturer un compte pour motif légitime, notamment violation grave ou répétée, fraude, atteinte à la sécurité, risque pour un tiers ou obligation légale. La mesure doit être proportionnée. Sauf urgence ou interdiction légale, l'Utilisateur est informé et peut remédier à la violation. La clôture n'éteint ni les créances acquises ni les obligations de conservation ou de preuve.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">19. Modification des CGU</h2>
            <p>
              Les modifications répondant à une évolution légale, technique ou fonctionnelle sont communiquées de manière appropriée. Une modification substantielle défavorable ne s'applique pas rétroactivement à une prestation déterminée déjà intégralement convenue, sauf nécessité légale ou accord valable. Lorsque la modification affecte durablement un contrat en cours, l'Utilisateur dispose, dans la mesure requise par le droit et la nature du service, d'un droit de résiliation avant son entrée en vigueur.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">20. Droit applicable et for</h2>
            <p>
              Le droit matériel suisse est applicable, à l'exclusion de ses règles de conflit lorsqu'elles conduiraient à un autre droit, sous réserve des normes impératives applicables. Les fors impératifs et protecteurs sont réservés. Lorsque l'Utilisateur agit à des fins privées, l'art. 32 CPC demeure applicable ; aucune clause ne vaut renonciation anticipée à un for protecteur.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
