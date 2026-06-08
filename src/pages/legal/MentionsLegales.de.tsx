import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '8. Juni 2026';

export default function MentionsLegalesDE() {
  useEffect(() => {
    document.title = 'Impressum — Logisorama by Immo-rama.ch';
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Zur Startseite
        </Link>
        <div className="text-xs text-muted-foreground mb-6 flex gap-3">
          <Link to="/mentions-legales" className="hover:text-primary">FR</Link>
          <Link to="/en/legal-notice" className="hover:text-primary">EN</Link>
          <span className="text-primary font-semibold">DE</span>
        </div>

        <h1 className="text-4xl font-bold mb-2">Impressum</h1>
        <p className="text-sm text-muted-foreground mb-10">Letzte Aktualisierung: {LAST_UPDATE}</p>

        <section className="space-y-8 text-base leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-3">1. Herausgeber</h2>
            <p>Die Website <strong>logisorama.ch</strong> (Marke „Logisorama") wird herausgegeben von:</p>
            <ul className="mt-3 space-y-1">
              <li><strong>Immo-rama.ch</strong> — Einzelunternehmen</li>
              <li>Inhaber: <strong>Christ Ramazani</strong></li>
              <li>Sitz: Chemin de l'Esparcette 5, 1023 Crissier, Schweiz</li>
              <li>UID: <strong>CHE-442.303.796</strong></li>
              <li>E-Mail: <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a></li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Verantwortlich für die Veröffentlichung</h2>
            <p>Christ Ramazani, Inhaber des Einzelunternehmens Immo-rama.ch.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Hosting</h2>
            <p>Die Website wird auf der Infrastruktur von <strong>Lovable Cloud</strong> (Supabase) gehostet, mit Servern in der Europäischen Union.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Geistiges Eigentum</h2>
            <p>Alle Elemente dieser Website (Texte, Bilder, Logos, die Marken „Logisorama" und „Immo-rama.ch", Datenbanken, Quellcode) sind durch das schweizerische Urheberrecht geschützt und gehören Immo-rama.ch oder seinen Partnern. Jede Vervielfältigung, Darstellung, Anpassung oder Nutzung, ganz oder teilweise, ohne vorherige schriftliche Genehmigung ist untersagt.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Personendaten</h2>
            <p>Die Verarbeitung personenbezogener Daten ist in unserer <Link to="/de/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</Link> beschrieben, ausgerichtet am revidierten Datenschutzgesetz (revDSG, in Kraft seit 1. September 2023).</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Cookies</h2>
            <p>Die Website nutzt Analyse- und Werbe-Cookies (Google Ads, Meta Pixel, TikTok Pixel) im Consent Mode v2 mit standardmässiger Ablehnung. Sie können Ihre Einstellungen jederzeit über das Consent-Banner anpassen.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Haftungsausschluss</h2>
            <p>Immo-rama.ch ist bemüht, die Richtigkeit der veröffentlichten Informationen zu gewährleisten, kann aber keine Vollständigkeit oder Fehlerfreiheit garantieren. Die Nutzung der Website erfolgt auf alleinige Verantwortung des Nutzers.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Anwendbares Recht und Gerichtsstand</h2>
            <p>Dieses Impressum unterliegt schweizerischem Recht. Ausschliesslicher Gerichtsstand ist der Sitz des Inhabers in Crissier (Waadt, Schweiz), vorbehaltlich zwingender gesetzlicher Gerichtsstände.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
