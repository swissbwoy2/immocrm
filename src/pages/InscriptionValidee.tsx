import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo-immo-rama-new.png';

const InscriptionValidee = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

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
    <div className="theme-luxury min-h-screen bg-background">
      {/* Header fixe */}
      <div
        className="fixed top-0 left-0 right-0 z-50"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/5">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2" aria-label="Retour à l'accueil Immo-Rama">
                <img src={logo} alt="Logo Immo-Rama" className="h-8 w-auto" />
              </Link>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Accueil</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
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
    </div>
  );
};

export default InscriptionValidee;
