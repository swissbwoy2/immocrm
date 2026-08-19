import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '8 juin 2026';

export default function MentionsLegales() {
  useEffect(() => {
    document.title = 'Mentions légales — Logisorama by Immo-rama.ch';
    const meta = document.querySelector('meta[name="description"]');
    const content =
      "Mentions légales de Logisorama, service exploité par Immo-rama.ch — entreprise individuelle Christ Ramazani, IDE CHE-442.303.796, siège à Crissier.";
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
        <div className="text-xs text-muted-foreground mb-6 flex gap-3">
          <span className="text-primary font-semibold">FR</span>
          <Link to="/en/legal-notice" className="hover:text-primary">EN</Link>
          <Link to="/de/impressum" className="hover:text-primary">DE</Link>
        </div>

        <h1 className="text-4xl font-bold mb-2">Mentions légales</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Dernière mise à jour : {LAST_UPDATE}
        </p>

        <section className="space-y-8 text-base leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-3">1. Éditeur du site</h2>
            <p>
              Le site <strong>logisorama.ch</strong>, exploité sous le nom commercial{' '}
              <strong>Logisorama</strong>, est édité par :
            </p>
            <ul className="mt-3 space-y-1">
              <li><strong>Immo-rama.ch — entreprise individuelle</strong></li>
              <li>Titulaire : <strong>Christ Ramazani</strong></li>
              <li>Siège : <strong>Chemin de l'Esparcette 5, 1023 Crissier, Suisse</strong></li>
              <li>IDE : <strong>CHE-442.303.796</strong></li>
              <li>Email : <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a></li>
              <li>Téléphone : <a href="tel:+41216342839" className="text-primary hover:underline">021 634 28 39</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Responsable de la publication</h2>
            <p>
              Le responsable de la publication est <strong>Christ Ramazani</strong>, titulaire de
              l'entreprise individuelle <strong>Immo-rama.ch</strong>.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Hébergement</h2>
            <p>
              Le site est hébergé via l'infrastructure technique utilisée par{' '}
              <strong>Lovable Cloud</strong> et <strong>Supabase</strong>, selon la configuration
              technique du service.
            </p>
            <p className="mt-3">
              Lorsque cela est techniquement disponible, les données sont hébergées sur des
              serveurs situés dans l'Union européenne. Certains prestataires techniques peuvent
              toutefois traiter des données depuis d'autres pays, conformément aux informations
              détaillées dans la Politique de confidentialité.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Nature du service</h2>
            <p>
              <strong>Logisorama</strong> est un service de relocation et d'accompagnement à la
              recherche de logement exploité par <strong>Immo-rama.ch</strong>.
            </p>
            <p className="mt-3">
              Les informations publiées sur le site ont une finalité informative, commerciale et
              contractuelle. Elles ne constituent pas une garantie d'obtention d'un logement,
              d'acceptation d'un dossier par une régie, ni d'attribution d'un bail.
            </p>
            <p className="mt-3">
              Les conditions applicables au mandat de recherche, aux acomptes, commissions,
              remboursements éventuels et obligations des parties sont précisées dans les documents
              contractuels remis ou acceptés par le client.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments présents sur ce site, notamment les textes, visuels, images,
              logos, noms commerciaux, marques, interfaces, bases de données, éléments graphiques
              et contenus éditoriaux, est protégé par le droit suisse et international de la
              propriété intellectuelle.
            </p>
            <p className="mt-3">
              Ces éléments appartiennent à <strong>Immo-rama.ch</strong> ou à ses partenaires,
              sauf indication contraire.
            </p>
            <p className="mt-3">
              Toute reproduction, représentation, diffusion, adaptation, extraction, réutilisation
              ou exploitation, totale ou partielle, sans autorisation écrite préalable, est
              interdite.
            </p>
            <p className="mt-3">
              Les noms <strong>Logisorama</strong> et <strong>Immo-rama.ch</strong> sont utilisés
              comme signes distinctifs commerciaux de l'activité exploitée par{' '}
              <strong>Immo-rama.ch</strong>.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Données personnelles</h2>
            <p>
              Le traitement des données personnelles est décrit dans notre{' '}
              <Link to="/politique-confidentialite" className="text-primary hover:underline">
                Politique de confidentialité
              </Link>
              .
            </p>
            <p className="mt-3">
              Cette politique explique notamment quelles données sont collectées, pourquoi elles
              sont traitées, combien de temps elles sont conservées, à quels destinataires elles
              peuvent être transmises et quels droits peuvent être exercés par les personnes
              concernées.
            </p>
            <p className="mt-3">
              Elle tient compte de la Loi fédérale sur la protection des données révisée, entrée
              en vigueur le 1<sup>er</sup> septembre 2023, ainsi que du RGPD lorsque celui-ci est
              applicable.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Cookies et traceurs</h2>
            <p>
              Le site peut utiliser des cookies strictement nécessaires à son fonctionnement ainsi
              que, sous réserve de votre consentement, des cookies de mesure d'audience et des
              traceurs publicitaires, notamment <strong>Google Ads</strong>,{' '}
              <strong>Meta Pixel</strong> et <strong>TikTok Pixel</strong>.
            </p>
            <p className="mt-3">
              Les cookies non essentiels fonctionnent avec un consentement par défaut refusé. Vous
              pouvez accepter, refuser ou modifier vos préférences à tout moment depuis le bandeau
              ou le lien de gestion des cookies.
            </p>
            <p className="mt-3">
              Une Politique cookies détaillée pourra être publiée séparément afin de présenter les
              cookies par nom, fournisseur, finalité, durée, catégorie et pays de traitement.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Liens externes</h2>
            <p>
              Le site peut contenir des liens vers des sites internet ou services tiers.
            </p>
            <p className="mt-3">
              <strong>Immo-rama.ch</strong> n'exerce aucun contrôle sur ces sites externes et ne
              peut être tenue responsable de leur contenu, de leur disponibilité, de leur
              sécurité, de leurs pratiques commerciales ou de leur politique de protection des
              données.
            </p>
            <p className="mt-3">
              L'utilisateur est invité à consulter les conditions d'utilisation et politiques de
              confidentialité propres à chaque site tiers.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">9. Limitation de responsabilité</h2>
            <p>
              <strong>Immo-rama.ch</strong> met tout en œuvre pour fournir des informations
              exactes, à jour et accessibles.
            </p>
            <p className="mt-3">
              Toutefois, <strong>Immo-rama.ch</strong> ne peut garantir l'exhaustivité,
              l'exactitude permanente, l'absence d'erreurs, l'absence d'interruptions ou
              l'adéquation des informations publiées à une situation particulière.
            </p>
            <p className="mt-3">
              L'utilisation du site se fait sous la responsabilité de l'utilisateur, dans les
              limites prévues par la loi.
            </p>
            <p className="mt-3">
              <strong>Immo-rama.ch</strong> ne peut être tenue responsable des dommages indirects,
              pertes d'opportunité, pertes de données, interruptions de service ou décisions
              prises sur la base d'informations générales publiées sur le site, sauf disposition
              légale impérative contraire.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">10. Sécurité du site</h2>
            <p>
              <strong>Immo-rama.ch</strong> met en place des mesures raisonnables pour assurer la
              sécurité du site et des données traitées.
            </p>
            <p className="mt-3">
              Aucune transmission de données sur Internet ni aucun système informatique ne peut
              toutefois être garanti comme totalement sécurisé. L'utilisateur est invité à prendre
              ses propres précautions, notamment en évitant de transmettre des documents
              confidentiels par des canaux non sécurisés lorsque cela n'est pas nécessaire.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">11. Droit applicable et for</h2>
            <p>
              Les présentes mentions légales sont soumises au droit suisse.
            </p>
            <p className="mt-3">
              Le for juridique est fixé au siège du titulaire, à{' '}
              <strong>Crissier, canton de Vaud, Suisse</strong>, sous réserve des fors impératifs
              prévus par la loi, notamment en matière de protection des consommateurs ou d'autres
              règles impératives applicables.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">12. Contact</h2>
            <p>
              Pour toute question relative au site, aux présentes mentions légales ou à l'activité
              de <strong>Logisorama / Immo-rama.ch</strong>, vous pouvez nous contacter à
              l'adresse suivante :
            </p>
            <p className="mt-3">
              <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline font-semibold">
                info@immo-rama.ch
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
