import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PremiumAuthLayout, AuthInput, AuthSubmitButton } from '@/components/auth/PremiumAuthLayout';
import { Lock, Eye, EyeOff, Loader2, MailWarning, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { withAuthStorageRemoval } from '@/lib/authStorageGuard';

type Phase = 'checking' | 'ready' | 'expired';

export default function FirstLogin() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const resolvedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // 1) Listener: dès qu'une session est posée (par le hash, le code PKCE, etc.)
    //    on bascule sur le formulaire de mot de passe.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) {
        resolvedRef.current = true;
        if (session.user?.email) {
          setSessionEmail(session.user.email);
          setResendEmail(session.user.email);
        }
        setPhase('ready');
      }
    });

    (async () => {
      try {
        // 2) PKCE flow (?code=...) — l'échanger explicitement
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(window.location.href).catch((e) => {
            console.warn('exchangeCodeForSession failed', e);
          });
          // Nettoyer l'URL pour éviter double consommation du code en cas de reload
          try {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          } catch {}
        } else if (window.location.hash.includes('access_token')) {
          // Implicit flow : laisser supabase-js consommer le hash, puis le retirer
          setTimeout(() => {
            try {
              window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
            } catch {}
          }, 500);
        }

        // 3) Vérifier si une session est déjà là
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session) {
          resolvedRef.current = true;
          if (session.user?.email) {
            setSessionEmail(session.user.email);
            setResendEmail(session.user.email);
          }
          setPhase('ready');
          return;
        }

        // 4) Fallback: laisser jusqu'à 6s au listener pour recevoir SIGNED_IN
        setTimeout(() => {
          if (cancelled) return;
          if (!resolvedRef.current) {
            setPhase('expired');
          }
        }, 6000);
      } catch (e) {
        console.error('FirstLogin init error', e);
        if (!cancelled && !resolvedRef.current) setPhase('expired');
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

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
      await withAuthStorageRemoval(() => supabase.auth.signOut());
      navigate('/login');
    } catch (error: any) {
      const msg = (error?.message || '').toLowerCase();
      const sessionLost =
        msg.includes('auth session missing') ||
        msg.includes('bad_jwt') ||
        msg.includes('missing sub') ||
        msg.includes('jwt expired') ||
        error?.status === 401 ||
        error?.status === 403;
      if (sessionLost) {
        if (sessionEmail) setResendEmail(sessionEmail);
        setPhase('expired');
        toast({
          title: 'Session expirée',
          description: "Votre lien d'activation a expiré pendant la saisie. Demandez-en un nouveau ci-dessous.",
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Erreur', description: error.message || 'Une erreur est survenue', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resendEmail.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/first-login`,
      });
      if (error) throw error;
      toast({
        title: 'Email envoyé',
        description: `Un nouveau lien d'activation a été envoyé à ${resendEmail}. Vérifiez votre boîte de réception (et les spams).`,
      });
      setResendEmail('');
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message || "Impossible d'envoyer l'email", variant: 'destructive' });
    } finally {
      setResendLoading(false);
    }
  };

  // === État: vérification en cours ===
  if (phase === 'checking') {
    return (
      <PremiumAuthLayout
        title="Activation de votre compte"
        description="Vérification de votre lien d'invitation..."
        badge="Première connexion"
      >
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Un instant...</p>
        </div>
      </PremiumAuthLayout>
    );
  }

  // === État: lien expiré ou invalide ===
  if (phase === 'expired') {
    return (
      <PremiumAuthLayout
        title="Lien expiré ou déjà utilisé"
        description="Votre lien d'invitation n'est plus valide. Demandez-en un nouveau ci-dessous."
        badge="Nouveau lien"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <MailWarning className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              Les liens d'invitation expirent après quelques heures et ne peuvent être utilisés
              qu'une seule fois. Saisissez votre email pour recevoir un nouveau lien d'activation.
            </p>
          </div>

          <form onSubmit={handleResendLink} className="space-y-3">
            <div>
              <Label htmlFor="fl-resend-email">Votre email</Label>
              <Input
                id="fl-resend-email"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="vous@exemple.ch"
                required
                disabled={resendLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={resendLoading || !resendEmail.trim()}>
              {resendLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Recevoir un nouveau lien
            </Button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </PremiumAuthLayout>
    );
  }

  // === État: prêt → formulaire de création de mot de passe ===
  const isValid = password.length >= 8 && password === confirmPassword;

  return (
    <PremiumAuthLayout
      title="Bienvenue !"
      description="Définissez votre mot de passe pour activer votre compte"
      badge="Première connexion"
    >
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
        💡 Pour éviter tout souci, définissez votre mot de passe maintenant, sans recharger ni fermer cette page.
      </div>
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
