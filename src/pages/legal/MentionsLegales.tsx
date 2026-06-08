import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '8 juin 2026';

export default function MentionsLegales() {
  useEffect(() => {
    document.title = 'Mentions légales — Logisorama by Immo-rama.ch';
    const meta = document.querySelector('meta[name="description"]');
    const content =
      "Mentions légales de Logisorama by Immo-rama.ch — entreprise individuelle Christ Ramazani, IDE CHE-442.303.796, siège à Crissier.";
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
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>

        <h1 className="text-4xl font-bold mb-2">Mentions légales</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Dernière mise à jour : {LAST_UPDATE}
        </p>

        <section className="space-y-8 text-base leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-3">1. Éditeur du site</h2>
            <p>
              Le site <strong>logisorama.ch</strong> (marque « Logisorama ») est édité par :
            </p>
            <ul className="mt-3 space-y-1">
              <li><strong>Immo-rama.ch</strong> — entreprise individuelle</li>
              <li>Titulaire : <strong>Christ Ramazani</strong></li>
              <li>Siège : Chemin de l'Esparcette 5, 1023 Crissier, Suisse</li>
              <li>IDE : <strong>CHE-442.303.796</strong></li>
              <li>Email : <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a></li>
              <li>Téléphone : <a href="tel:+41216259505" className="text-primary hover:underline">021 625 95 05</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Responsable de la publication</h2>
            <p>Christ Ramazani, titulaire de l'entreprise individuelle Immo-rama.ch.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Hébergement</h2>
            <p>
              Le site est hébergé sur l'infrastructure de <strong>Lovable Cloud</strong> (Supabase),
              avec des serveurs situés dans l'Union européenne.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments présents sur ce site (textes, images, logos, marques
              « Logisorama » et « Immo-rama.ch », bases de données, code source) est protégé
              par le droit suisse de la propriété intellectuelle et appartient à Immo-rama.ch
              ou à ses partenaires. Toute reproduction, représentation, adaptation ou
              exploitation, totale ou partielle, sans autorisation écrite préalable est
              interdite.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Données personnelles</h2>
            <p>
              Le traitement des données personnelles est décrit dans notre{' '}
              <Link to="/politique-confidentialite" className="text-primary hover:underline">
                Politique de confidentialité
              </Link>
              , conforme à la nouvelle Loi fédérale sur la protection des données (nLPD,
              en vigueur depuis le 1<sup>er</sup> septembre 2023).
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Cookies et traceurs</h2>
            <p>
              Le site utilise des cookies de mesure d'audience et publicitaires (Google
              Ads, Meta Pixel, TikTok Pixel) opérant en mode Consent Mode v2 (consentement
              par défaut refusé). Vous pouvez ajuster vos préférences à tout moment depuis
              le bandeau de consentement.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Limitation de responsabilité</h2>
            <p>
              Immo-rama.ch met tout en œuvre pour assurer l'exactitude des informations
              publiées, sans toutefois pouvoir en garantir l'exhaustivité ni l'absence
              d'erreurs. L'utilisation du site se fait sous la seule responsabilité de
              l'utilisateur.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Droit applicable et for</h2>
            <p>
              Les présentes mentions légales sont soumises au droit suisse. Le for
              exclusif est fixé au siège du titulaire, à Crissier (Vaud, Suisse), sous
              réserve des fors impératifs prévus par la loi.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
