import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logoImmorama from '@/assets/logo-immo-rama-new.png';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumFormCard } from '@/components/forms-premium/PremiumFormCard';
import { PremiumInput } from '@/components/forms-premium/PremiumInput';
import { PremiumButton } from '@/components/forms-premium/PremiumButton';
import { LuxuryFormBackground } from '@/components/forms-premium/backgrounds/LuxuryFormBackground';
import { FloatingKey3D } from '@/components/forms-premium/backgrounds/FloatingKey3D';
import { IconMail, IconLock, IconArrowLeft, IconLoader } from '@/components/forms-premium/icons/LuxuryIcons';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole } = useAuth();

  useEffect(() => {
    if (user && userRole) {
      navigate(`/${userRole}`);
    }
  }, [user, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('Connexion échouée');

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();
      if (roleError) throw roleError;

      toast({ title: 'Connexion réussie', description: 'Bienvenue !' });
      navigate(`/${roleData.role}`);
    } catch (error: any) {
      toast({ title: 'Erreur de connexion', description: error.message || 'Email ou mot de passe incorrect', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles').select('id, telephone, actif').eq('email', resendEmail).maybeSingle();
      if (!profile) {
        toast({ title: 'Compte non trouvé', description: 'Aucun compte n\'existe avec cet email. Veuillez créer votre dossier via "Activer vos recherches".', variant: 'destructive' });
        setResendLoading(false);
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
        redirectTo: `${window.location.origin}/first-login`,
      });
      if (error) throw error;
      toast({ title: 'Email envoyé', description: `Un lien de connexion a été envoyé à ${resendEmail}. Vérifiez votre boîte de réception.` });
      setDialogOpen(false);
      setResendEmail('');
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message || "Impossible d'envoyer l'email", variant: 'destructive' });
    } finally {
      setResendLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'Email envoyé', description: `Un email de réinitialisation a été envoyé à ${resetEmail}. Vérifiez votre boîte de réception.` });
      setResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message || "Impossible d'envoyer l'email de réinitialisation", variant: 'destructive' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(30_15%_8%)] flex items-center justify-center p-4 relative overflow-hidden">
      <LuxuryFormBackground />
      <FloatingKey3D />

      {/* Back link */}
      <Link
        to="/"
        className="absolute top-5 left-5 z-20 flex items-center gap-2 text-[hsl(40_20%_50%)] hover:text-[hsl(38_55%_65%)] transition-colors duration-200 group"
      >
        <IconArrowLeft size={16} />
        <span className="text-sm font-medium">Retour à l'accueil</span>
      </Link>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <PremiumFormCard>
          {/* Logo + titre */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <img
              src={logoImmorama}
              alt="Immo-Rama"
              className="h-16 w-auto"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div className="text-center">
              <h1 className="text-2xl font-serif font-bold text-[hsl(40_20%_88%)] tracking-wide">
                Logisorama
              </h1>
              <p className="text-xs text-[hsl(40_20%_45%)] mt-1.5 leading-relaxed max-w-xs">
                Logiciel immobilier suisse propulsé par Immo-rama.ch
              </p>
            </div>
            {/* Gold divider */}
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[hsl(38_45%_48%/0.6)] to-transparent" />
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <PremiumInput
              label="Adresse email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<IconMail size={16} />}
              required
              disabled={loading}
              autoComplete="email"
            />

            <PremiumInput
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<IconLock size={16} />}
              required
              disabled={loading}
              autoComplete="current-password"
              rightAction={
                <button
                  type="button"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[hsl(40_20%_45%)] hover:text-[hsl(38_55%_65%)] transition-colors p-1"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              }
            />

            {/* Submit */}
            <motion.button
              type="submit"
              whileHover={loading ? {} : { scale: 1.02, boxShadow: '0 0 30px hsl(38 45% 48% / 0.35)' }}
              whileTap={loading ? {} : { scale: 0.98 }}
              disabled={loading || !email || !password}
              className={`relative w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold text-sm text-[hsl(30_15%_8%)] overflow-hidden transition-all duration-300 ${
                loading || !email || !password
                  ? 'bg-[hsl(38_45%_48%/0.3)] cursor-not-allowed text-[hsl(40_20%_40%)]'
                  : 'bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(38_45%_48%)] shadow-[0_4px_16px_hsl(38_45%_48%/0.25)]'
              }`}
            >
              {!loading && !(!email || !password) && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
                />
              )}
              {loading ? <IconLoader size={16} /> : null}
              <span className="relative z-10">{loading ? 'Connexion...' : 'Se connecter'}</span>
            </motion.button>

            {/* Links */}
            <div className="space-y-1 pt-1">
              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogTrigger asChild>
                  <button type="button" className="w-full text-center text-xs text-[hsl(40_20%_45%)] hover:text-[hsl(38_55%_65%)] transition-colors py-1 cursor-pointer">
                    Mot de passe oublié ?
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-[hsl(30_15%_11%)] border-[hsl(38_45%_48%/0.2)] text-[hsl(40_20%_88%)]">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-[hsl(40_20%_88%)]">Réinitialiser le mot de passe</DialogTitle>
                    <DialogDescription className="text-[hsl(40_20%_50%)]">
                      Entrez votre adresse email pour recevoir un lien de réinitialisation.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleResetPassword} className="space-y-4 mt-2">
                    <PremiumInput
                      label="Email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      icon={<IconMail size={16} />}
                      required
                      disabled={resetLoading}
                    />
                    <PremiumButton variant="submit" disabled={resetLoading} loading={resetLoading} onClick={() => {}} className="w-full justify-center">
                      {resetLoading ? 'Envoi...' : 'Envoyer le lien'}
                    </PremiumButton>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <button type="button" className="w-full text-center text-xs text-[hsl(40_20%_45%)] hover:text-[hsl(38_55%_65%)] transition-colors py-1 cursor-pointer">
                    Vous n'avez pas reçu votre invitation ?
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-[hsl(30_15%_11%)] border-[hsl(38_45%_48%/0.2)] text-[hsl(40_20%_88%)]">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-[hsl(40_20%_88%)]">Renvoyer l'invitation</DialogTitle>
                    <DialogDescription className="text-[hsl(40_20%_50%)]">
                      Entrez votre adresse email pour recevoir un nouveau lien d'invitation.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleResendInvitation} className="space-y-4 mt-2">
                    <PremiumInput
                      label="Email"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      icon={<IconMail size={16} />}
                      required
                      disabled={resendLoading}
                    />
                    <PremiumButton variant="submit" disabled={resendLoading} loading={resendLoading} onClick={() => {}} className="w-full justify-center">
                      {resendLoading ? 'Envoi...' : "Renvoyer l'invitation"}
                    </PremiumButton>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Activer recherches */}
            <div className="pt-2 border-t border-[hsl(38_45%_48%/0.12)]">
              <button
                type="button"
                onClick={() => navigate('/nouveau-mandat')}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[hsl(38_45%_48%/0.2)] text-[hsl(40_20%_55%)] text-sm font-medium hover:border-[hsl(38_45%_48%/0.4)] hover:text-[hsl(40_20%_70%)] transition-all duration-200 cursor-pointer"
              >
                Activer vos recherches
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-[hsl(38_45%_48%/0.1)] text-center">
            <p className="text-[11px] text-[hsl(40_20%_35%)]">Tous droits réservés Immo-Rama.ch</p>
            <p className="text-[11px] text-[hsl(40_20%_35%)] mt-0.5">Application Fièrement Suisse 🇨🇭</p>
          </div>
        </PremiumFormCard>
      </motion.div>
    </div>
  );
}
