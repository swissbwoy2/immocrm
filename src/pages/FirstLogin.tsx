import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PremiumAuthLayout, AuthInput, AuthSubmitButton } from '@/components/auth/PremiumAuthLayout';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function FirstLogin() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Session expirée', description: 'Veuillez cliquer à nouveau sur le lien dans votre email', variant: 'destructive' });
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate, toast]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 8 caractères', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Succès', description: 'Votre mot de passe a été défini. Vous pouvez maintenant vous connecter.' });
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message || 'Une erreur est survenue', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const isValid = password.length >= 8 && password === confirmPassword;

  return (
    <PremiumAuthLayout
      title="Bienvenue !"
      description="Définissez votre mot de passe pour activer votre compte"
      badge="Première connexion"
    >
      <form onSubmit={handleSetPassword} className="space-y-4">
        <AuthInput
          label="Nouveau mot de passe"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          hint="Minimum 8 caractères"
          required
          disabled={loading}
          placeholder="Choisissez un mot de passe"
          animDelay={0.1}
          rightAction={
            <button
              type="button"
              aria-label={showPassword ? 'Masquer' : 'Afficher'}
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <AuthInput
          label="Confirmer le mot de passe"
          type={showConfirm ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          error={confirmPassword && password !== confirmPassword ? 'Les mots de passe ne correspondent pas' : undefined}
          required
          disabled={loading}
          placeholder="Confirmez le mot de passe"
          animDelay={0.2}
          rightAction={
            <button
              type="button"
              aria-label={showConfirm ? 'Masquer' : 'Afficher'}
              onClick={() => setShowConfirm(!showConfirm)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <AuthSubmitButton
          loading={loading}
          disabled={!isValid}
          animDelay={0.3}
        >
          Définir mon mot de passe
        </AuthSubmitButton>
      </form>
    </PremiumAuthLayout>
  );
}
