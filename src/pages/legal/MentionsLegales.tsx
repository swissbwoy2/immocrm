import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '21 août 2026';

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
              <strong>Logisorama.ch</strong> et l'application <strong>Logisorama</strong> sont édités par <strong>Immo-rama.ch</strong>, entreprise individuelle :
            </p>
            <ul className="mt-3 space-y-1">
              <li>Titulaire : <strong>Christ Ramazani</strong></li>
              <li>Chemin de l'Esparcette 5, 1023 Crissier (VD), Suisse</li>
              <li>IDE : <strong>CHE-442.303.796</strong></li>
              <li>E-mail : <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a></li>
              <li>Téléphone : <a href="tel:+41216342839" className="text-primary hover:underline">+41 21 634 28 39</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Responsable de la publication</h2>
            <p>
              Le responsable de la publication est Christ Ramazani, titulaire de l'entreprise individuelle.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Nature du service</h2>
            <p>
              Logisorama est une plateforme immobilière proposant des outils de recherche, suivi, communication, publication ou indexation d'annonces, matching et gestion de dossiers. Les prestations de mandat ou de courtage fournies par Immo-rama.ch sont régies par un contrat particulier présenté avant leur conclusion.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Hébergement et prestataires</h2>
            <p>
              Les catégories de prestataires techniques, leurs fonctions et les catégories de données susceptibles d'être traitées sont décrites dans la{' '}
              <Link to="/politique-confidentialite" className="text-primary hover:underline">Politique de confidentialité</Link>. Les informations relatives à l'hébergeur principal, à sa raison sociale et à son pays doivent correspondre à l'architecture effectivement déployée.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Annonces et contenus de tiers</h2>
            <p>
              Certaines annonces sont déposées par des utilisateurs, propriétaires, agences ou promoteurs ; d'autres sont référencées comme annonces externes et renvoient à leur source. Immo-rama.ch ne garantit ni la disponibilité permanente d'un bien ni l'exactitude absolue d'informations fournies par des tiers, sous réserve de ses obligations légales et de la correction des erreurs substantielles qui lui sont signalées.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Propriété intellectuelle</h2>
            <p>
              Les logiciels, interfaces, signes distinctifs, contenus et créations propres à Logisorama ou Immo-rama.ch sont protégés. Les contenus de tiers demeurent soumis aux droits de leurs titulaires. Toute utilisation dépassant l'usage normal du service requiert une autorisation ou une base légale.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Protection des données</h2>
            <p>
              Les traitements de données personnelles sont décrits dans la{' '}
              <Link to="/politique-confidentialite" className="text-primary hover:underline">Politique de confidentialité</Link> accessible depuis la plateforme. Les demandes sont adressées à{' '}
              <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline font-semibold">info@immo-rama.ch</a>.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Cookies</h2>
            <p>
              Les informations relatives aux technologies nécessaires, à la mesure d'audience, à la publicité et aux choix de l'Utilisateur figurent dans la Politique de confidentialité et l'interface de gestion des préférences.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">9. Responsabilité</h2>
            <p>
              Immo-rama.ch répond conformément au droit suisse. Les informations immobilières provenant de tiers doivent être vérifiées avant toute décision. Les exclusions de responsabilité ne s'appliquent pas dans les cas où le droit impératif les interdit, notamment en cas de dol ou de faute grave.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">10. Droit applicable et for</h2>
            <p>
              Le droit suisse est applicable. Les fors impératifs et protecteurs, notamment ceux prévus en faveur des consommateurs, demeurent réservés. Voir également nos{' '}
              <Link to="/conditions-generales" className="text-primary hover:underline">Conditions Générales d'Utilisation</Link>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
