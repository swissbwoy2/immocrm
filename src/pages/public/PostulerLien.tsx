import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, MailCheck, AlertTriangle, Home } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cle = (token: string) => `postulation-lien:${token}`;

type Annonce = { id: string; titre: string; adresse?: string | null; ville?: string | null; prix?: number | null; pieces?: number | null; surface?: number | null };

/**
 * Lien de postulation genere par l'admin : /postuler/:token
 * La personne confirme son adresse, recoit un lien de connexion a usage unique,
 * et revient ici connectee. Sa candidature est alors creee et elle part remplir
 * le formulaire de demande de location.
 */
export default function PostulerLien() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshRoles } = useAuth() as any;

  const [annonce, setAnnonce] = useState<Annonce | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '' });
  const consomme = useRef(false);

  // 1. Validite du lien
  useEffect(() => {
    let vivant = true;
    (async () => {
      const { data, error } = await (supabase.rpc as any)('postulation_lien_info', { p_token: token });
      if (!vivant) return;
      if (error) { setErreur("Ce lien n'a pas pu être vérifié."); setChargement(false); return; }
      if (!data?.ok) {
        setErreur(data?.code === 'annonce_indisponible'
          ? "Cette annonce n'est plus disponible."
          : "Ce lien n'est plus valable. Demandez-en un nouveau à votre agence.");
        setChargement(false);
        return;
      }
      setAnnonce(data.annonce as Annonce);
      setChargement(false);
    })();
    return () => { vivant = false; };
  }, [token]);

  // 2. Retour du lien de connexion : on cree la candidature et on part au formulaire
  const consommer = useCallback(async () => {
    if (consomme.current) return;
    consomme.current = true;
    let memo: any = {};
    try { memo = JSON.parse(localStorage.getItem(cle(token)) || '{}'); } catch { memo = {}; }
    const { data, error } = await (supabase.rpc as any)('postulation_lien_consommer', {
      p_token: token,
      p_prenom: memo.prenom ?? null,
      p_nom: memo.nom ?? null,
      p_telephone: memo.telephone ?? null,
    });
    if (error || !data?.ok) {
      consomme.current = false;
      if (data?.code === 'identite_manquante') {
        setErreur('Il nous manque votre prénom et votre nom. Reprenez le lien depuis le début.');
        return;
      }
      setErreur("Nous n'avons pas pu ouvrir votre dossier. Contactez votre agence.");
      return;
    }
    try { localStorage.removeItem(cle(token)); } catch { /* sans importance */ }
    await refreshRoles?.();
    navigate(`/candidat/demande?candidature=${data.candidature_id}`, { replace: true });
  }, [token, navigate, refreshRoles]);

  useEffect(() => {
    if (authLoading || chargement || erreur || !annonce || !user) return;
    consommer();
  }, [authLoading, chargement, erreur, annonce, user, consommer]);

  const envoyerLien = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom.trim() || !form.nom.trim()) return toast.error('Indiquez votre prénom et votre nom');
    if (!EMAIL_RE.test(form.email.trim())) return toast.error('Adresse e-mail invalide');
    setEnvoi(true);
    try {
      try { localStorage.setItem(cle(token), JSON.stringify(form)); } catch { /* sans importance */ }
      const { error } = await supabase.auth.signInWithOtp({
        email: form.email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/postuler/${token}` },
      });
      if (error) throw error;
      setEnvoye(true);
    } catch (err: any) {
      toast.error(err?.message || "L'envoi du lien a échoué, réessayez");
    } finally {
      setEnvoi(false);
    }
  };

  const bien = annonce ? [annonce.adresse, annonce.ville].filter(Boolean).join(', ') || annonce.titre : '';

  if (chargement || authLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-muted/30"><Loader2 className="h-6 w-6 animate-spin text-primary" /></main>;
  }

  if (erreur) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Lien indisponible
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{erreur}</p>
            <Button className="w-full min-h-[44px]" onClick={() => navigate('/annonces')}>
              <Home className="mr-2 h-4 w-4" /> Voir les annonces
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (user) {
    return <main className="flex min-h-screen items-center justify-center bg-muted/30"><Loader2 className="h-6 w-6 animate-spin text-primary" /></main>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Votre demande de location</CardTitle>
          <CardDescription>{bien}</CardDescription>
        </CardHeader>
        <CardContent>
          {envoye ? (
            <div className="space-y-4 text-center">
              <MailCheck className="mx-auto h-10 w-10 text-primary" />
              <p className="text-sm">
                Nous venons d'envoyer un lien de connexion à <strong className="break-all">{form.email.trim()}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Ouvrez-le depuis cet appareil : vous arriverez directement sur le formulaire. Pensez aux indésirables si vous ne le voyez pas.
              </p>
              <Button variant="outline" className="w-full min-h-[44px]" disabled={envoi} onClick={() => setEnvoye(false)}>
                Modifier mon adresse
              </Button>
            </div>
          ) : (
            <form onSubmit={envoyerLien} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Renseignez vos coordonnées : nous vous enverrons un lien de connexion à usage unique pour accéder au formulaire.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="pl-prenom">Prénom *</Label>
                  <Input id="pl-prenom" maxLength={80} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pl-nom">Nom *</Label>
                  <Input id="pl-nom" maxLength={80} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="pl-email">E-mail *</Label>
                <Input id="pl-email" type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pl-tel">Téléphone</Label>
                <Input id="pl-tel" type="tel" maxLength={30} placeholder="+41 XX XXX XX XX" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
              <Button type="submit" className="w-full min-h-[44px]" disabled={envoi}>
                {envoi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailCheck className="mr-2 h-4 w-4" />}
                Recevoir mon lien de connexion
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
