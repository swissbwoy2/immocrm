import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '19 août 2026';

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
            <h2 className="text-2xl font-semibold mb-3">1. Éditeur</h2>
            <p>
              <strong>Logisorama.ch</strong> et l'application <strong>Logisorama</strong> sont
              édités par <strong>Immo-rama.ch</strong>, entreprise individuelle :
            </p>
            <ul className="mt-3 space-y-1">
              <li>Titulaire : <strong>Christ Ramazani</strong></li>
              <li>Chemin de l'Esparcette 5, 1023 Crissier (VD), Suisse</li>
              <li>IDE : <strong>CHE-442.303.796</strong></li>
              <li>
                E-mail :{' '}
                <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a>
              </li>
              <li>
                Téléphone :{' '}
                <a href="tel:+41216342839" className="text-primary hover:underline">+41 21 634 28 39</a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Responsable de la publication</h2>
            <p><strong>Christ Ramazani</strong>.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Nature du service</h2>
            <p>
              Logisorama est une plateforme immobilière comprenant des outils de recherche, de
              suivi, de communication, de dépôt d'annonces, de matching et, dans certains cas, des
              prestations de mandat ou de courtage fournies par Immo-rama.ch. Les conditions
              particulières applicables aux prestations payantes sont présentées avant leur
              conclusion.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Hébergement et prestataires</h2>
            <p>
              La plateforme utilise différents services d'infrastructure et prestataires techniques
              décrits dans la{' '}
              <Link to="/politique-confidentialite" className="text-primary hover:underline">
                Politique de confidentialité
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Annonces</h2>
            <p>
              Certaines annonces sont publiées directement par des utilisateurs, propriétaires,
              agences ou promoteurs ; d'autres offres peuvent être référencées comme
              « annonces externes » et renvoyer vers leur source originale. Logisorama.ch ne
              garantit pas la disponibilité permanente d'un bien ni l'absence d'erreurs dans les
              informations fournies par des tiers.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Propriété intellectuelle</h2>
            <p>
              Les contenus propres, éléments graphiques, logiciels, marques et créations de
              Logisorama.ch ou d'Immo-rama.ch sont protégés. Les contenus provenant de tiers
              demeurent la propriété de leurs titulaires respectifs.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Protection des données</h2>
            <p>
              Les traitements de données personnelles sont décrits dans la{' '}
              <Link to="/politique-confidentialite" className="text-primary hover:underline">
                Politique de confidentialité
              </Link>
              . Contact :{' '}
              <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline font-semibold">
                info@immo-rama.ch
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Cookies</h2>
            <p>
              Les informations relatives aux cookies figurent dans la Politique de confidentialité
              et dans les paramètres de confidentialité de la plateforme.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">9. Responsabilité</h2>
            <p>
              Immo-rama.ch répond conformément au droit suisse. Les informations immobilières
              provenant de tiers doivent être vérifiées avant toute décision contractuelle.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">10. Droit applicable</h2>
            <p>
              Le droit suisse est applicable, les fors impératifs ou protecteurs demeurant
              réservés. Voir également nos{' '}
              <Link to="/conditions-generales" className="text-primary hover:underline">
                Conditions Générales d'Utilisation
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
