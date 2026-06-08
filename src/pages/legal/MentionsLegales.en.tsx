import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = 'June 8, 2026';

export default function MentionsLegalesEN() {
  useEffect(() => {
    document.title = 'Legal notice — Logisorama by Immo-rama.ch';
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="text-xs text-muted-foreground mb-6 flex gap-3">
          <Link to="/mentions-legales" className="hover:text-primary">FR</Link>
          <span className="text-primary font-semibold">EN</span>
          <Link to="/de/impressum" className="hover:text-primary">DE</Link>
        </div>

        <h1 className="text-4xl font-bold mb-2">Legal notice</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATE}</p>

        <section className="space-y-8 text-base leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-3">1. Publisher</h2>
            <p>The website <strong>logisorama.ch</strong> (brand “Logisorama”) is published by:</p>
            <ul className="mt-3 space-y-1">
              <li><strong>Immo-rama.ch</strong> — sole proprietorship</li>
              <li>Owner: <strong>Christ Ramazani</strong></li>
              <li>Registered office: Chemin de l'Esparcette 5, 1023 Crissier, Switzerland</li>
              <li>UID: <strong>CHE-442.303.796</strong></li>
              <li>Email: <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a></li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Publication manager</h2>
            <p>Christ Ramazani, owner of the sole proprietorship Immo-rama.ch.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Hosting</h2>
            <p>The site is hosted on <strong>Lovable Cloud</strong> (Supabase) infrastructure, with servers in the European Union.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Intellectual property</h2>
            <p>All elements on this site (texts, images, logos, the “Logisorama” and “Immo-rama.ch” trademarks, databases, source code) are protected by Swiss intellectual property law and belong to Immo-rama.ch or its partners. Any reproduction, representation, adaptation or use, in whole or in part, without prior written consent is prohibited.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Personal data</h2>
            <p>The processing of personal data is described in our <Link to="/en/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>, aligned with the revised Swiss Federal Act on Data Protection (FADP, in force since 1 September 2023).</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Cookies</h2>
            <p>The site uses analytics and advertising cookies (Google Ads, Meta Pixel, TikTok Pixel) operating under Consent Mode v2 with default refusal. You can adjust your preferences at any time via the consent banner.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Liability disclaimer</h2>
            <p>Immo-rama.ch strives to ensure the accuracy of published information but cannot guarantee completeness or absence of errors. Use of the site is at the user's sole responsibility.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Governing law and jurisdiction</h2>
            <p>This legal notice is governed by Swiss law. The exclusive jurisdiction is the owner's registered office in Crissier (Vaud, Switzerland), subject to mandatory venue rules.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
