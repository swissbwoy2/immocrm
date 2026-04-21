import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PremiumAuthLayout, AuthInput, AuthSubmitButton } from '@/components/auth/PremiumAuthLayout';
import { Mail, Lock, Eye, EyeOff, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

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
        toast({ title: 'Compte non trouvé', description: "Aucun compte n'existe avec cet email. Veuillez créer votre dossier via \"Activer vos recherches\".", variant: 'destructive' });
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
    <PremiumAuthLayout
      title="Bon retour"
      description="Connectez-vous à votre espace Logisorama"
      backTo="/"
      badge="Espace Sécurisé"
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <AuthInput
          label="Adresse email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="h-4 w-4" />}
          required
          disabled={loading}
          autoComplete="email"
          placeholder="vous@exemple.com"
          animDelay={0.1}
        />

        <AuthInput
          label="Mot de passe"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          required
          disabled={loading}
          autoComplete="current-password"
          placeholder="Votre mot de passe"
          animDelay={0.2}
          rightAction={
            <button
              type="button"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <AuthSubmitButton
          loading={loading}
          disabled={!email || !password}
          animDelay={0.3}
        >
          <Rocket className="h-4 w-4" />
          Se connecter
        </AuthSubmitButton>

        {/* Secondary links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-1 pt-1"
        >
          <button
            type="button"
            onClick={() => setResetDialogOpen(true)}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors py-1 cursor-pointer underline-offset-4 hover:underline"
          >
            Mot de passe oublié ?
          </button>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors py-1 cursor-pointer underline-offset-4 hover:underline"
          >
            Vous n'avez pas reçu votre invitation ?
          </button>
        </motion.div>

        {/* CTA activation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="pt-3 border-t border-border/50"
        >
          <button
            type="button"
            onClick={() => navigate('/nouveau-mandat')}
            className="w-full flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-border/60 text-foreground/70 text-sm font-medium hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer"
          >
            Activer vos recherches
          </button>
        </motion.div>
      </form>

      {/* Dialog : réinitialisation mot de passe */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif">Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Entrez votre adresse email pour recevoir un lien de réinitialisation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 mt-2">
            <AuthInput
              label="Email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              required
              disabled={resetLoading}
              placeholder="vous@exemple.com"
            />
            <AuthSubmitButton loading={resetLoading} disabled={!resetEmail}>
              Envoyer le lien
            </AuthSubmitButton>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog : renvoyer invitation */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif">Renvoyer l'invitation</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Entrez votre adresse email pour recevoir un nouveau lien d'invitation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResendInvitation} className="space-y-4 mt-2">
            <AuthInput
              label="Email"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              required
              disabled={resendLoading}
              placeholder="vous@exemple.com"
            />
            <AuthSubmitButton loading={resendLoading} disabled={!resendEmail}>
              Renvoyer l'invitation
            </AuthSubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </PremiumAuthLayout>
  );
}
