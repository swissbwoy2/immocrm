import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const InscriptionValidee = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  // Meta Pixel tracking — fires once per session
  useEffect(() => {
    if (window.fbq && !sessionStorage.getItem('meta_track_lead_inscription_validee')) {
      window.fbq('track', 'Lead');
      sessionStorage.setItem('meta_track_lead_inscription_validee', '1');
    }
  }, []);

  // Countdown + auto-redirect
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Merci ! Votre demande a bien été enregistrée
        </h1>
        <p className="text-muted-foreground">
          Votre agent Logisorama va analyser votre recherche et vous contacter.
        </p>
        <Button onClick={() => navigate('/login')} className="w-full">
          Accéder à mon espace
        </Button>
        <p className="text-sm text-muted-foreground">
          Redirection automatique dans {countdown} seconde{countdown > 1 ? 's' : ''}…
        </p>
      </div>
    </div>
  );
};

export default InscriptionValidee;
