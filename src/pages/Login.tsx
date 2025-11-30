import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ExternalLink } from 'lucide-react';
import logoImmorama from '@/assets/logo-immorama-2023.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user && userRole) {
      navigate(`/${userRole}`);
    }
  }, [user, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Connexion échouée');
      }

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      if (roleError) throw roleError;

      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue !',
      });

      // Navigate based on role
      navigate(`/${roleData.role}`);
    } catch (error: any) {
      toast({
        title: 'Erreur de connexion',
        description: error.message || 'Email ou mot de passe incorrect',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendLoading(true);

    try {
      const { error } = await supabase.functions.invoke('invite-client', {
        body: { email: resendEmail }
      });

      if (error) throw error;

      toast({
        title: 'Invitation envoyée',
        description: `Un email d'invitation a été envoyé à ${resendEmail}. Vérifiez votre boîte de réception.`,
      });

      setDialogOpen(false);
      setResendEmail('');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'envoyer l'invitation",
        variant: 'destructive',
      });
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

      toast({
        title: 'Email envoyé',
        description: `Un email de réinitialisation a été envoyé à ${resetEmail}. Vérifiez votre boîte de réception.`,
      });

      setResetDialogOpen(false);
      setResetEmail('');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'envoyer l'email de réinitialisation",
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logoImmorama} alt="Immo-Rama" className="h-20 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl">Logisorama</CardTitle>
            <CardDescription className="text-base mt-2">
              Logiciel Immobilier pour la recherche de bien immobilier en Suisse propulsé par l'agence immobilière Immo-rama.ch
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@example.ch"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>

            {/* Mot de passe oublié */}
            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="link" className="w-full text-sm text-muted-foreground" type="button">
                  Mot de passe oublié ?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
                  <DialogDescription>
                    Entrez votre adresse email pour recevoir un lien de réinitialisation.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="votre.email@example.ch"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      disabled={resetLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={resetLoading}>
                    {resetLoading ? 'Envoi...' : 'Envoyer le lien'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Renvoyer invitation */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="link" className="w-full text-sm text-muted-foreground" type="button">
                  Vous n'avez pas reçu votre invitation ?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Renvoyer l'invitation</DialogTitle>
                  <DialogDescription>
                    Entrez votre adresse email pour recevoir un nouveau lien d'invitation.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleResendInvitation} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resend-email">Email</Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="votre.email@example.ch"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                      disabled={resendLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={resendLoading}>
                    {resendLoading ? 'Envoi...' : "Renvoyer l'invitation"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Activer vos recherches */}
            <Button 
              variant="outline" 
              className="w-full" 
              type="button"
              onClick={() => window.open('https://immo-rama.ch/formulaire', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Activer vos recherches
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col text-center text-xs text-muted-foreground border-t pt-4">
          <p>Tous droits réservés Immo-Rama.ch</p>
          <p className="mt-1">Application Fièrement Suisse 🇨🇭</p>
        </CardFooter>
      </Card>
    </div>
  );
}
