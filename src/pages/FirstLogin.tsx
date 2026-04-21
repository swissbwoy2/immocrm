import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const clearLocalSupabaseStorage = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((k) => {
      if (k.startsWith('sb-') || k.includes('supabase.auth')) {
        localStorage.removeItem(k);
      }
    });
  } catch {
    // ignore
  }
};

export default function FirstLogin() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    // Listener auth changes (PASSWORD_RECOVERY, SIGNED_IN)
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[FirstLogin] auth event:', event, !!session);
      if (!isMounted) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setSessionReady(true);
        setChecking(false);
      }
    });

    const init = async () => {
      // 1. Read URL errors (hash + query)
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(window.location.search);
      const urlError =
        hashParams.get('error') ||
        queryParams.get('error') ||
        hashParams.get('error_code') ||
        queryParams.get('error_code');
      const urlErrorDesc =
        hashParams.get('error_description') || queryParams.get('error_description');

      if (urlError) {
        console.warn('[FirstLogin] URL error:', urlError, urlErrorDesc);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        clearLocalSupabaseStorage();
        toast({
          title: 'Lien invalide ou expiré',
          description:
            urlErrorDesc?.replace(/\+/g, ' ') ||
            "Veuillez demander un nouveau lien d'invitation.",
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      // 2. Wait briefly so Supabase client can process the URL hash tokens
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (!isMounted) return;

      // 3. Validate session via getUser (real server-side check)
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        toast({
          title: 'Session introuvable',
          description: 'Veuillez cliquer à nouveau sur le lien dans votre email.',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        console.warn('[FirstLogin] stale session detected:', userError?.message);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        clearLocalSupabaseStorage();
        toast({
          title: 'Session expirée',
          description:
            'Votre session précédente n\'est plus valide. Veuillez demander un nouveau lien d\'invitation.',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      if (isMounted) {
        setSessionReady(true);
        setChecking(false);
      }
    };

    init();

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 8 caractères',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Re-validate user before updating password (avoid 403 on stale JWT)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        clearLocalSupabaseStorage();
        toast({
          title: 'Session expirée',
          description:
            'Votre lien n\'est plus valide. Veuillez demander un nouveau lien d\'invitation.',
          variant: 'destructive',
        });
        navigate('/login');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Votre mot de passe a été défini. Vous pouvez maintenant vous connecter.',
      });

      await supabase.auth.signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('[FirstLogin] updateUser error:', error);
      const msg = error?.message || '';
      if (msg.includes('JWT') || msg.includes('sub claim') || msg.includes('does not exist')) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        clearLocalSupabaseStorage();
        toast({
          title: 'Session expirée',
          description:
            'Votre lien d\'invitation n\'est plus valide. Veuillez en demander un nouveau.',
          variant: 'destructive',
        });
        navigate('/login');
      } else {
        toast({
          title: 'Erreur',
          description: msg || 'Une erreur est survenue',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Vérification de votre lien d'invitation…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Définir votre mot de passe</CardTitle>
            <CardDescription className="text-base">
              Bienvenue ! Veuillez définir votre mot de passe pour activer votre compte.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading || !sessionReady}
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmer votre mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading || !sessionReady}
                  minLength={8}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !sessionReady}>
              {loading ? 'Enregistrement...' : 'Définir mon mot de passe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
