import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function MustChangePasswordBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const mustChange = user?.user_metadata?.must_change_password === true;

  if (!mustChange) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Sécurisez votre compte
          </h3>
          <p className="text-sm text-amber-800/80 dark:text-amber-200/80 mt-1">
            Vous utilisez actuellement un mot de passe provisoire. Changez-le dès maintenant pour sécuriser votre compte.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-300 bg-white hover:bg-amber-100 text-amber-900"
          onClick={() => navigate('/client/parametres')}
        >
          <Lock className="w-4 h-4 mr-2" />
          Changer
        </Button>
      </div>
    </div>
  );
}
