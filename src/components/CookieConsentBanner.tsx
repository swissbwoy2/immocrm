import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';
import { grantTikTokConsent } from '@/lib/tiktok-pixel';
import { grantGoogleAdsConsent } from '@/lib/google-ads';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import {
  CookieCategories,
  POLICY_VERSION,
  getOrCreateAnonId,
  loadStoredConsent,
  saveStoredConsent,
} from '@/lib/legal-version';
import { supabase } from '@/integrations/supabase/client';

const OPEN_PREFS_EVENT = 'lovable:open-cookie-preferences';

/** Permet à n'importe quel "Gérer mes cookies" du footer de rouvrir la modal. */
export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_PREFS_EVENT));
}

async function logConsent(categories: CookieCategories) {
  try {
    await supabase.functions.invoke('log-cookie-consent', {
      body: {
        anonymous_id: getOrCreateAnonId(),
        categories,
        policy_version: POLICY_VERSION,
        source: 'banner',
      },
    });
  } catch (e) {
    // best-effort logging — never block UX
    console.warn('cookie consent log failed', e);
  }
}

function applyConsent(categories: CookieCategories) {
  if (categories.marketing) {
    grantTikTokConsent();
    grantGoogleAdsConsent();
  }
  // Analytics-only granting kept implicit (Consent Mode v2 default = denied).
  // Future: dispatch fine-grained analytics_storage update if a dedicated analytics provider is added.
}

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  useEffect(() => {
    const stored = loadStoredConsent();
    if (!stored) {
      const t = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(t);
    } else {
      // Re-apply previously saved consent on page load
      applyConsent(stored.categories);
    }
  }, []);

  useEffect(() => {
    const handler = () => setShowPrefs(true);
    window.addEventListener(OPEN_PREFS_EVENT, handler);
    return () => window.removeEventListener(OPEN_PREFS_EVENT, handler);
  }, []);

  const persistAndClose = (categories: CookieCategories) => {
    saveStoredConsent(categories);
    applyConsent(categories);
    void logConsent(categories);
    setShowBanner(false);
    setShowPrefs(false);
  };

  return (
    <>
      <CookiePreferencesModal
        open={showPrefs}
        onOpenChange={setShowPrefs}
        onSave={persistAndClose}
      />

      {showBanner && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[60] p-4 animate-in slide-in-from-bottom-5 fade-in duration-500"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          <div className="max-w-4xl mx-auto">
            <div className="glass-morphism bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl shadow-primary/5 p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Cookie className="w-6 h-6 text-primary" />
                </div>

                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-foreground">Vos préférences cookies 🍪</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nous utilisons des cookies nécessaires au fonctionnement du site et,
                    sous réserve de votre accord, des cookies analytiques, marketing et de
                    personnalisation. Refus par défaut. Détails dans la{' '}
                    <Link to="/politique-confidentialite" className="text-primary hover:underline">
                      politique de confidentialité
                    </Link>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
                  <Button
                    variant="outline"
                    onClick={() =>
                      persistAndClose({
                        necessary: true,
                        analytics: false,
                        marketing: false,
                        personalization: false,
                      })
                    }
                    className="flex-1 md:flex-none"
                  >
                    Tout refuser
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBanner(false);
                      setShowPrefs(true);
                    }}
                    className="flex-1 md:flex-none"
                  >
                    Personnaliser
                  </Button>
                  <Button
                    onClick={() =>
                      persistAndClose({
                        necessary: true,
                        analytics: true,
                        marketing: true,
                        personalization: true,
                      })
                    }
                    className="flex-1 md:flex-none"
                  >
                    Tout accepter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
