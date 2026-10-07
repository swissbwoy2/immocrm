import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { ForgotPasswordLink } from '@/components/auth/ForgotPasswordLink';
import { toast } from 'sonner';
import { CalendarCheck, CheckCircle2, Loader2, BellRing, UserRound, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchCreneauxReservations } from '@/lib/creneauxCapacite';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicFavoris } from '@/hooks/usePublicFavoris';

export function useAnnonceCreneaux(annonceId?: string) {
  return useQuery({
    queryKey: ['annonce-creneaux-public', annonceId],
    enabled: !!annonceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonce_creneaux')
        .select('id, date_heure, capacite_max')
        .eq('annonce_id', annonceId!)
        .eq('actif', true)
        .gt('date_heure', new Date().toISOString())
        .order('date_heure', { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      const withCap = rows.filter((r) => r.capacite_max != null).map((r) => r.id);
      const counts = await fetchCreneauxReservations(withCap);
      return rows.map((r) => {
        const reservations = counts[r.id] ?? 0;
        const restantes = r.capacite_max != null ? Math.max(0, r.capacite_max - reservations) : null;
        return { ...r, restantes, full: restantes === 0 };
      });
    },
  });
}

export const formatCreneau = (iso: string) =>
  new Date(iso)
    .toLocaleString('fr-CH', {
      timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })
    .replace(':', 'h');

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  annonce: { id: string; titre: string };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_PRIORITY = ['admin', 'automation_operator', 'agent', 'agent_ia', 'closeur', 'coursier', 'apporteur', 'proprietaire', 'annonceur', 'client', 'candidat'];

/** Espace d'atterrissage d'une personne connectee, selon son role prioritaire. */
function espaceDuRole(roles: string[]): string {
  const role = ROLE_PRIORITY.find((r) => roles.includes(r)) || roles[0];
  if (!role) return '/candidat';
  if (role === 'annonceur') return '/espace-annonceur';
  return `/${role}`;
}

export function ReserverVisiteDialog({ open, onOpenChange, annonce }: Props) {
  const { data: creneaux = [], isLoading } = useAnnonceCreneaux(annonce.id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [slotFull, setSlotFull] = useState(false);
  const [accountOnly, setAccountOnly] = useState(false);
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '' });
  const [creneauId, setCreneauId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { user, userRoles } = useAuth();
  const { favoris, toggleFavorite } = usePublicFavoris();
  const connecte = !!user;
  const espace = useMemo(() => espaceDuRole((userRoles ?? []) as string[]), [userRoles]);
  const [profilCharge, setProfilCharge] = useState(false);

  // Non connecte : onglet « J'ai deja un compte » (connexion dans la modale) / « Creer mon compte ».
  const [onglet, setOnglet] = useState<'connexion' | 'nouveau'>('nouveau');
  const [identifiants, setIdentifiants] = useState({ email: '', password: '' });
  const [connexionEnCours, setConnexionEnCours] = useState(false);
  const [messageConnexion, setMessageConnexion] = useState<string | null>(null);

  // Une fois connecte depuis la modale : on quitte le mode « compte seulement »
  // pour retomber sur le parcours connecte (reservation ou « Etre averti »).
  useEffect(() => {
    if (connecte && accountOnly && !done) setAccountOnly(false);
  }, [connecte, accountOnly, done]);

  const seConnecter = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = identifiants.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || !identifiants.password) return toast.error('Saisissez votre e-mail et votre mot de passe');
    setConnexionEnCours(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: identifiants.password });
      if (error) {
        toast.error(error.message?.includes('Invalid login credentials') ? 'E-mail ou mot de passe incorrect' : (error.message || 'Connexion impossible'));
        return;
      }
      setIdentifiants({ email, password: '' });
      setMessageConnexion(null);
      toast.success('Vous êtes connecté');
    } finally {
      setConnexionEnCours(false);
    }
  };

  // Personne connectee : on reprend ses coordonnees du profil, sans rien lui redemander.
  useEffect(() => {
    if (!open || !user?.id) { setProfilCharge(false); return; }
    let vivant = true;
    (async () => {
      const { data: profil } = await supabase
        .from('profiles').select('prenom, nom, email, telephone').eq('id', user.id).maybeSingle();
      if (!vivant) return;
      setForm((f) => ({
        prenom: f.prenom || (profil?.prenom ?? ''),
        nom: f.nom || (profil?.nom ?? ''),
        email: f.email || (profil?.email ?? user.email ?? ''),
        telephone: f.telephone || (profil?.telephone ?? ''),
      }));
      setProfilCharge(true);
    })();
    return () => { vivant = false; };
  }, [open, user?.id, user?.email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.prenom.trim() || !form.nom.trim() || form.telephone.trim().length < 6) return toast.error('Veuillez remplir tous les champs');
    if (!EMAIL_RE.test(form.email.trim())) return toast.error('Adresse e-mail invalide');
    if (!accountOnly && !creneauId) return toast.error('Choisissez un créneau');
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('inscription-candidat-visite', {
        body: { annonce_id: annonce.id, ...(accountOnly ? {} : { creneau_id: creneauId }), ...form },
      });
      let payload: any = data;
      if (error) {
        payload = null;
        try {
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.json === 'function') payload = await ctx.clone?.().json?.() ?? await ctx.json();
        } catch { payload = null; }
      }
      if (payload?.code === 'already_booked') {
        toast.info('Vous avez déjà réservé ce créneau — retrouvez votre visite dans votre espace candidat');
        close(false);
        return;
      }
      if (payload?.code === 'account_exists' && connecte) {
        // Session refusee par le serveur (expiree) : on demande une reconnexion.
        toast.error('Votre session a expiré, reconnectez-vous pour réserver');
        return;
      }
      if (payload?.code === 'account_exists') {
        // Compte existant : jamais de re-saisie ni d'inscription silencieuse, on passe a la connexion.
        setIdentifiants({ email: form.email.trim().toLowerCase(), password: '' });
        setMessageConnexion('Un compte existe déjà avec cet e-mail. Connectez-vous pour continuer.');
        setOnglet('connexion');
        return;
      }
      if (payload?.code === 'slot_full') {
        setSlotFull(true);
        setCreneauId(null);
        qc.invalidateQueries({ queryKey: ['annonce-creneaux-public', annonce.id] });
        return;
      }
      if (!payload?.ok) {
        toast.error(typeof payload?.error === 'string' ? payload.error : 'Réservation impossible, réessayez');
        return;
      }
      setDone(true);
    } catch (err) {
      console.error('[reserver-visite]', err);
      toast.error('Réservation impossible, réessayez');
    } finally {
      setSubmitting(false);
    }
  };

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(() => {
      setDone(false); setCreneauId(null); setSlotFull(false); setAccountOnly(false);
      setOnglet('nouveau'); setMessageConnexion(null); setIdentifiants((i) => ({ ...i, password: '' }));
    }, 200);
  };

  const allFull = creneaux.length > 0 && creneaux.every((c) => c.full);
  const showTropTard = !done && !accountOnly && !isLoading && (creneaux.length === 0 || allFull || slotFull);

  // Connecte : on ne demande que ce qui manque vraiment au profil.
  const champsManquants = !connecte ? ['prenom', 'nom', 'email', 'telephone'] : [
    !form.prenom.trim() ? 'prenom' : null,
    !form.nom.trim() ? 'nom' : null,
    !EMAIL_RE.test(form.email.trim()) ? 'email' : null,
    form.telephone.trim().length < 6 ? 'telephone' : null,
  ].filter(Boolean) as string[];
  const demandeInfos = !connecte || (profilCharge && champsManquants.length > 0);

  const allerAMonEspace = () => { close(false); navigate(espace); };

  const [alerting, setAlerting] = useState(false);
  const etreAverti = async () => {
    if (alerting) return;
    setAlerting(true);
    try {
      if (!favoris.includes(annonce.id)) await toggleFavorite(annonce.id);
      else toast.info('Cette annonce est deja dans vos favoris');
    } finally {
      setAlerting(false);
      allerAMonEspace();
    }
  };

  const formulaireReservation = (
    <form onSubmit={submit} className="space-y-4">
      {!accountOnly && <div className="space-y-2">
        <Label>Choisissez un créneau *</Label>
        <div className="grid gap-2">
          {creneaux.map((c) => (
            <button
              type="button"
              key={c.id}
              disabled={c.full}
              onClick={() => !c.full && setCreneauId(c.id)}
              className={cn(
                'flex min-h-[44px] items-center justify-between gap-2 rounded-lg border px-4 py-2 text-left text-sm transition-colors',
                c.full ? 'cursor-not-allowed border-border opacity-50' :
                creneauId === c.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted',
              )}
            >
              <span className="capitalize">{formatCreneau(c.date_heure)}</span>
              {c.full && (
                <span className="text-xs font-medium text-destructive">Complet</span>
              )}
            </button>
          ))}
        </div>
      </div>}
      {demandeInfos && (
        <>
          {connecte && (
            <p className="text-sm text-muted-foreground">Il manque {champsManquants.length > 1 ? 'quelques informations' : 'une information'} à votre profil pour réserver.</p>
          )}
          {(!connecte || champsManquants.includes('prenom') || champsManquants.includes('nom')) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(!connecte || champsManquants.includes('prenom')) && <div className="space-y-1"><Label htmlFor="rv-prenom">Prénom *</Label><Input id="rv-prenom" maxLength={80} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></div>}
              {(!connecte || champsManquants.includes('nom')) && <div className="space-y-1"><Label htmlFor="rv-nom">Nom *</Label><Input id="rv-nom" maxLength={80} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>}
            </div>
          )}
          {(!connecte || champsManquants.includes('email')) && <div className="space-y-1"><Label htmlFor="rv-email">E-mail *</Label><Input id="rv-email" type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>}
          {(!connecte || champsManquants.includes('telephone')) && <div className="space-y-1"><Label htmlFor="rv-tel">Téléphone *</Label><Input id="rv-tel" type="tel" maxLength={30} placeholder="+41 XX XXX XX XX" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>}
        </>
      )}
      {connecte ? (
        <p className="text-xs text-muted-foreground">Vous réservez avec votre compte{form.email ? ` (${form.email})` : ''}.</p>
      ) : (
        <p className="text-xs text-muted-foreground">Un espace candidat sera créé avec cet e-mail ; vos identifiants vous seront envoyés par e-mail. Déjà un compte ?{' '}
          <button type="button" className="text-primary hover:underline" onClick={() => setOnglet('connexion')}>Connectez-vous</button></p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => close(false)}>Annuler</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCheck className="mr-2 h-4 w-4" />}{accountOnly && !connecte ? 'Créer mon compte' : 'Réserver'}
        </Button>
      </div>
    </form>
  );

  const formulaireConnexion = (
    <form onSubmit={seConnecter} className="space-y-4">
      {messageConnexion && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">{messageConnexion}</p>
      )}
      <div className="space-y-1"><Label htmlFor="rv-login-email">E-mail *</Label><Input id="rv-login-email" type="email" autoComplete="email" maxLength={255} value={identifiants.email} onChange={(e) => setIdentifiants({ ...identifiants, email: e.target.value })} /></div>
      <div className="space-y-1">
        <div className="flex items-center justify-between"><Label htmlFor="rv-login-password">Mot de passe *</Label><ForgotPasswordLink defaultEmail={identifiants.email.trim()} /></div>
        <Input id="rv-login-password" type="password" autoComplete="current-password" value={identifiants.password} onChange={(e) => setIdentifiants({ ...identifiants, password: e.target.value })} />
      </div>
      <Button type="submit" className="w-full" disabled={connexionEnCours}>
        {connexionEnCours ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}Se connecter
      </Button>
      <GoogleSignInButton next={`${window.location.pathname}${window.location.search}`} />
      <p className="text-xs text-muted-foreground">Une fois connecté, {accountOnly ? 'vous pourrez être averti des prochaines dates.' : 'vous choisissez votre créneau sans rien ressaisir.'}</p>
    </form>
  );

  if (showTropTard) {
    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Trop tard !</DialogTitle>
            <DialogDescription>
              {connecte
                ? 'Tu viens de louper le dernier créneau disponible ! Enregistre cette annonce pour être prévenu dès qu’une nouvelle date s’ouvre.'
                : 'Tu viens de louper le dernier créneau disponible ! Connecte-toi pour recevoir les prochaines dates disponibles avant tout le monde !'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => close(false)}>Annuler</Button>
            {connecte ? (
              <Button disabled={alerting} onClick={etreAverti}>
                {alerting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                Être averti si un créneau se libère
              </Button>
            ) : (
              <Button onClick={() => { setAccountOnly(true); setOnglet('connexion'); }}>Créer mon compte / Se connecter</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" />{accountOnly ? 'Créer mon compte / Se connecter' : 'Réserver une visite'}</DialogTitle>
          <DialogDescription>{annonce.titre}</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="text-lg font-semibold text-foreground">{accountOnly ? 'Votre demande est enregistrée' : 'Votre visite est réservée'}</p>
            <p className="text-sm text-muted-foreground">{connecte ? 'Vous la retrouverez dans votre espace ; la confirmation vous a aussi été envoyée par e-mail.' : accountOnly ? 'Vos identifiants vous ont été envoyés par e-mail.' : 'Vérifiez votre e-mail pour vos identifiants et la confirmation.'}</p>
            {connecte ? (
              <Button className="mt-2" onClick={allerAMonEspace}><UserRound className="mr-2 h-4 w-4" />Aller à mon espace</Button>
            ) : accountOnly ? (
              <Button className="mt-2" onClick={() => { setDone(false); setIdentifiants({ email: form.email.trim().toLowerCase(), password: '' }); setOnglet('connexion'); }}>Se connecter</Button>
            ) : (
              <Button className="mt-2" onClick={() => close(false)}>Fermer</Button>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : creneaux.length === 0 && !accountOnly ? (
          <p className="py-6 text-sm text-muted-foreground">Aucun créneau de visite disponible pour le moment.</p>
        ) : (
          connecte ? formulaireReservation : (
            <Tabs value={onglet} onValueChange={(v) => setOnglet(v as 'connexion' | 'nouveau')} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="connexion">J'ai déjà un compte</TabsTrigger>
                <TabsTrigger value="nouveau">Créer mon compte</TabsTrigger>
              </TabsList>
              <TabsContent value="connexion" className="mt-0">{formulaireConnexion}</TabsContent>
              <TabsContent value="nouveau" className="mt-0">{formulaireReservation}</TabsContent>
            </Tabs>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
