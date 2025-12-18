import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie-consent';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay for smooth appearance
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[60] p-4 animate-in slide-in-from-bottom-5 fade-in duration-500"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Gradient top border */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="max-w-4xl mx-auto">
        <div className="glass-morphism bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl shadow-primary/5 p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Cookie className="w-6 h-6 text-primary" />
            </div>
            
            {/* Content */}
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-foreground">
                Ce site utilise des cookies 🍪
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nous utilisons des cookies pour améliorer votre expérience et analyser notre trafic. 
                En continuant, vous acceptez notre utilisation des cookies.
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <Button 
                variant="outline" 
                onClick={handleDecline}
                className="flex-1 md:flex-none"
              >
                Refuser
              </Button>
              <Button 
                onClick={handleAccept}
                className="flex-1 md:flex-none"
              >
                Accepter
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
