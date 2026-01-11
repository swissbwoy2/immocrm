import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import logoImmoRama from '@/assets/logo-immo-rama-new.png';

export default function ConnexionAnnonceur() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Verify user is an annonceur
      const { data: annonceur, error: annonceurError } = await supabase
        .from('annonceurs')
        .select('id, statut')
        .eq('user_id', data.user.id)
        .single();

      if (annonceurError || !annonceur) {
        await supabase.auth.signOut();
        throw new Error('Ce compte n\'est pas un compte annonceur');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <PublicHeader />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card className="p-6 md:p-8">
              <div className="text-center mb-8">
                <img src={logoImmoRama} alt="Immo-Rama" className="h-12 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Espace Annonceur</h1>
                <p className="text-muted-foreground">Connectez-vous pour gérer vos annonces</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    <button
                      type="button"
                      onClick={() => setResetDialogOpen(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
                Pas encore de compte ?{' '}
                <Link to="/inscription-annonceur" className="text-primary font-medium hover:underline">
                  Créer un compte
                </Link>
              </div>

              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                    <DialogDescription>
                      Entrez votre email pour recevoir un lien de réinitialisation.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="votre@email.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={resetLoading}>
                      {resetLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        'Envoyer le lien de réinitialisation'
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </Card>

            <p className="text-center text-sm text-muted-foreground mt-6">
              <Link to="/" className="hover:text-foreground">
                ← Retour au site principal
              </Link>
            </p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}