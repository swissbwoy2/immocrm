import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PremiumAuthLayout, AuthInput, AuthSubmitButton } from '@/components/auth/PremiumAuthLayout';
import { Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ConnexionAnnonceur() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: annonceur, error: annonceurError } = await supabase
        .from('annonceurs')
        .select('id, statut')
        .eq('user_id', data.user.id)
        .single();

      if (annonceurError || !annonceur) {
        await supabase.auth.signOut();
        throw new Error("Ce compte n'est pas un compte annonceur");
      }

      if (annonceur.statut === 'suspendu') {
        await supabase.auth.signOut();
        throw new Error('Votre compte a été suspendu. Contactez le support.');
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Connexion réussie !');
      navigate('/espace-annonceur');
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Email ou mot de passe incorrect');
      } else {
        toast.error(error.message || 'Erreur lors de la connexion');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    loginMutation.mutate();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Veuillez entrer votre email');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password?from=annonceur`,
      });
      if (error) throw error;
      toast.success(`Un email de réinitialisation a été envoyé à ${resetEmail}`);
      setResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      toast.error(error.message || "Impossible d'envoyer l'email de réinitialisation");
    } finally {
      setResetLoading(false);
    }
  };

  const isLoading = loginMutation.isPending;
  const canSubmit = !!email && !!password && !isLoading;

  return (
    <PremiumAuthLayout
      title="Espace Annonceur"
      description="Connectez-vous pour gérer vos annonces immobilières"
      backTo="/"
      badge="Portail Annonceur"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Adresse email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="h-4 w-4" />}
          required
          disabled={isLoading}
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
          disabled={isLoading}
          autoComplete="current-password"
          placeholder="Votre mot de passe"
          animDelay={0.2}
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

        <AuthSubmitButton
          loading={isLoading}
          disabled={!canSubmit}
          animDelay={0.3}
        >
          Se connecter
        </AuthSubmitButton>

        {/* Links */}
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
        </motion.div>

        {/* Register link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="pt-3 border-t border-border/50"
        >
          <Link
            to="/inscription-annonceur"
            className="w-full flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-border/60 text-foreground/70 text-sm font-medium hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200"
          >
            <UserPlus className="h-4 w-4" />
            Devenir annonceur
          </Link>
        </motion.div>
      </form>

      {/* Reset password dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif">Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Entrez votre email pour recevoir un lien de réinitialisation.
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
    </PremiumAuthLayout>
  );
}
