import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logoImmorama from '@/assets/logo-immo-rama-new.png';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PremiumFormCard } from '@/components/forms-premium/PremiumFormCard';
import { PremiumInput } from '@/components/forms-premium/PremiumInput';
import { LuxuryFormBackground } from '@/components/forms-premium/backgrounds/LuxuryFormBackground';
import { IconLock, IconLoader, IconArrowLeft } from '@/components/forms-premium/icons/LuxuryIcons';
import { motion } from 'framer-motion';

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
      console.log('Auth event:', event, 'Session:', !!session);
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

  const EyeToggle = ({ show, onToggle, label }: { show: boolean; onToggle: () => void; label: string }) => (
    <button type="button" aria-label={label} onClick={onToggle} className="text-[hsl(40_20%_45%)] hover:text-[hsl(38_55%_65%)] transition-colors p-1">
      {show ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      )}
    </button>
  );

  const LoadingScreen = () => (
    <div className="min-h-screen bg-[hsl(30_15%_8%)] flex flex-col items-center justify-center gap-4 relative overflow-hidden">
      <LuxuryFormBackground />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="w-12 h-12 rounded-full border-2 border-[hsl(38_45%_48%/0.3)] border-t-[hsl(38_55%_65%)] animate-spin" />
        <p className="text-sm text-[hsl(40_20%_50%)]">Vérification du lien...</p>
      </motion.div>
    </div>
  );

  if (isInitializing) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[hsl(30_15%_8%)] flex items-center justify-center p-4 relative overflow-hidden">
      <LuxuryFormBackground />
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <PremiumFormCard>
          <div className="flex flex-col items-center gap-4 mb-8">
            <img
              src={logoImmorama}
              alt="Immo-Rama"
              className="h-14 w-auto"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div className="text-center">
              <h1 className="text-2xl font-serif font-bold text-[hsl(40_20%_88%)]">
                Nouveau mot de passe
              </h1>
              <p className="text-xs text-[hsl(40_20%_45%)] mt-2">
                Choisissez un nouveau mot de passe pour votre compte.
              </p>
            </div>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[hsl(38_45%_48%/0.6)] to-transparent" />
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            <PremiumInput
              label="Nouveau mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<IconLock size={16} />}
              required
              disabled={loading}
              rightAction={<EyeToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} label="Afficher le mot de passe" />}
            />
            <PremiumInput
              label="Confirmer le mot de passe"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<IconLock size={16} />}
              error={confirmPassword && password !== confirmPassword ? 'Les mots de passe ne correspondent pas' : undefined}
              required
              disabled={loading}
              rightAction={<EyeToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} label="Afficher la confirmation" />}
            />

            <motion.button
              type="submit"
              whileHover={loading || !isValid ? {} : { scale: 1.02, boxShadow: '0 0 30px hsl(38 45% 48% / 0.35)' }}
              whileTap={loading || !isValid ? {} : { scale: 0.98 }}
              disabled={loading || !isValid}
              className={`relative w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold text-sm text-[hsl(30_15%_8%)] overflow-hidden transition-all duration-300 ${
                loading || !isValid
                  ? 'bg-[hsl(38_45%_48%/0.3)] cursor-not-allowed text-[hsl(40_20%_40%)]'
                  : 'bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(38_45%_48%)] shadow-[0_4px_16px_hsl(38_45%_48%/0.25)]'
              }`}
            >
              {!loading && isValid && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
                />
              )}
              {loading ? <IconLoader size={16} /> : null}
              <span className="relative z-10">{loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}</span>
            </motion.button>

            <button
              type="button"
              onClick={() => navigate(redirectPath)}
              className="w-full flex items-center justify-center gap-2 text-xs text-[hsl(40_20%_45%)] hover:text-[hsl(38_55%_65%)] transition-colors py-1 cursor-pointer"
            >
              <IconArrowLeft size={14} />
              Retour à la connexion
            </button>
          </form>
        </PremiumFormCard>
      </motion.div>
    </div>
  );
}
