import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PremiumAuthLayout, AuthInput, AuthSubmitButton } from '@/components/auth/PremiumAuthLayout';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import heroBg from '@/assets/hero-bg.jpg';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const fromAnnonceur = searchParams.get('from') === 'annonceur';
  const redirectPath = fromAnnonceur ? '/connexion-annonceur' : '/login';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setIsTokenValid(true);
        setIsInitializing(false);
      } else if (event === 'SIGNED_IN' && session) {
        setIsTokenValid(true);
        setIsInitializing(false);
      }
    });
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && mounted) {
        setIsTokenValid(true);
        setIsInitializing(false);
      }
    };
    setTimeout(checkExistingSession, 500);
    const timeout = setTimeout(() => {
      if (mounted && !isTokenValid) {
        toast({ title: 'Lien invalide', description: 'Le lien de réinitialisation est invalide ou a expiré.', variant: 'destructive' });
        navigate(redirectPath);
      }
    }, 10000);
    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, toast, redirectPath, isTokenValid]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 6 caractères.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Succès', description: 'Votre mot de passe a été réinitialisé avec succès.' });
      await supabase.auth.signOut();
      navigate(redirectPath);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message || 'Une erreur est survenue lors de la réinitialisation.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const isValid = password.length >= 6 && password === confirmPassword;

  // Loading screen — premium version with hero bg
  if (isInitializing) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80" />
        </div>
        <motion.div
          className="relative z-10 flex flex-col items-center gap-5"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <img
            src={logoImmoRama}
            alt="Immo-Rama"
            className="h-20 w-auto drop-shadow-xl brightness-0 invert"
          />
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-sm text-white/70 font-medium">Vérification du lien...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <PremiumAuthLayout
      title="Nouveau mot de passe"
      description="Choisissez un mot de passe sécurisé pour votre compte"
      backTo={redirectPath}
      badge="Réinitialisation"
    >
      <form onSubmit={handleResetPassword} className="space-y-4">
        <AuthInput
          label="Nouveau mot de passe"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          hint="Minimum 6 caractères"
          required
          disabled={loading}
          placeholder="Nouveau mot de passe"
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
          type={showConfirmPassword ? 'text' : 'password'}
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
              aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <AuthSubmitButton
          loading={loading}
          disabled={!isValid}
          animDelay={0.3}
        >
          Réinitialiser le mot de passe
        </AuthSubmitButton>
      </form>
    </PremiumAuthLayout>
  );
}
