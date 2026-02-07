import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { initMetaPixel, trackMetaEventWithRetry } from '@/lib/meta-pixel';

const COOKIE_CONSENT_KEY = 'cookie-consent';

const Test24hActive = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(3);

  const redirectPath = user ? '/client' : '/login';

  // Meta Pixel tracking — CompleteRegistration uniquement, with GDPR consent
  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'accepted' && !sessionStorage.getItem('meta_track_completeRegistration_test24h')) {
      initMetaPixel(true);
      trackMetaEventWithRetry('CompleteRegistration');
      sessionStorage.setItem('meta_track_completeRegistration_test24h', '1');
      console.log('[Test24hActive] Meta Pixel CompleteRegistration event queued');
    }
  }, []);

  // Countdown + auto-redirect
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(redirectPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate, redirectPath]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <Clock className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Votre accès d'essai est activé
        </h1>
        <p className="text-muted-foreground">
          Vous pouvez dès maintenant découvrir Logisorama. Un agent pourra vous accompagner si besoin.
        </p>
        <Button onClick={() => navigate(redirectPath)} className="w-full">
          Accéder à mon espace
        </Button>
        <p className="text-sm text-muted-foreground">
          Redirection automatique dans {countdown} seconde{countdown > 1 ? 's' : ''}…
        </p>
      </div>
    </div>
  );
};

export default Test24hActive;
