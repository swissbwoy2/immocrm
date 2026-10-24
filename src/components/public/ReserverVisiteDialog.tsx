import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarCheck, CheckCircle2, Loader2, BellRing, UserRound } from 'lucide-react';
import { Choice, Field, PrimaryButton, SecondaryButton, SheetDialog } from '@/components/funnel-ui/FunnelKit';
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
    if (!o) setTimeout(() => { setDone(false); setCreneauId(null); setSlotFull(false); setAccountOnly(false); }, 200);
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

  if (showTropTard) {
    return (
      <SheetDialog
        open={open}
        onOpenChange={close}
        icon={<BellRing className="h-5 w-5" strokeWidth={1.8} />}
        title="Trop tard !"
        description={connecte
          ? 'Tu viens de louper le dernier créneau disponible ! Enregistre cette annonce pour être prévenu dès qu’une nouvelle date s’ouvre.'
          : 'Tu viens de louper le dernier créneau disponible ! Connecte-toi pour recevoir les prochaines dates disponibles avant tout le monde !'}
        footer={
          <>
            <SecondaryButton onClick={() => close(false)}>Annuler</SecondaryButton>
            {connecte ? (
              <PrimaryButton loading={alerting} onClick={etreAverti}>Être averti si un créneau se libère</PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => setAccountOnly(true)}>Créer mon compte / Se connecter</PrimaryButton>
            )}
          </>
        }
      />
    );
  }

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const showForm = !done && !isLoading && !(creneaux.length === 0 && !accountOnly);

  return (
    <SheetDialog
      open={open}
      onOpenChange={close}
      wide
      icon={done ? <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} /> : <CalendarCheck className="h-5 w-5" strokeWidth={1.8} />}
      title={done ? (accountOnly ? 'Votre demande est enregistrée' : 'Votre visite est réservée') : accountOnly ? 'Créer mon compte / Se connecter' : 'Réserver une visite'}
      description={done
        ? (connecte ? 'Vous la retrouverez dans votre espace ; la confirmation vous a aussi été envoyée par e-mail.' : accountOnly ? 'Si votre compte vient d’être créé, vos identifiants vous ont été envoyés par e-mail. Sinon, connectez-vous avec votre compte existant.' : 'Vérifiez votre e-mail pour vos identifiants et la confirmation.')
        : annonce.titre}
      footer={done ? (
        connecte ? (
          <PrimaryButton full onClick={allerAMonEspace}><UserRound className="h-4 w-4" />Aller à mon espace</PrimaryButton>
        ) : accountOnly ? (
          <PrimaryButton full onClick={() => { close(false); navigate('/login'); }}>Se connecter</PrimaryButton>
        ) : (
          <PrimaryButton full onClick={() => close(false)}>Fermer</PrimaryButton>
        )
      ) : showForm ? (
        <>
          <SecondaryButton onClick={() => close(false)}>Annuler</SecondaryButton>
          <PrimaryButton loading={submitting} onClick={() => submit({ preventDefault() {} } as React.FormEvent)}>
            {accountOnly && !connecte ? 'Créer mon compte / Se connecter' : 'Réserver'}
          </PrimaryButton>
        </>
      ) : undefined}
    >
      {done ? null : isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#222222]" /></div>
      ) : creneaux.length === 0 && !accountOnly ? (
        <p className="py-4 text-[15px] text-[#3f3f3f]">Aucun créneau de visite disponible pour le moment.</p>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4">
          {!accountOnly && (
            <div>
              <p className="mb-3 text-[14px] font-semibold text-[#222222]">Choisissez un créneau</p>
              <div className="grid gap-3">
                {creneaux.map((c, i) => (
                  <Choice key={c.id} index={i} disabled={c.full} selected={creneauId === c.id}
                    onClick={() => !c.full && setCreneauId(c.id)}
                    label={formatCreneau(c.date_heure).replace(/^./, (m) => m.toUpperCase())}
                    hint={c.full ? 'Complet' : c.restantes != null ? `${c.restantes} place${c.restantes > 1 ? 's' : ''} restante${c.restantes > 1 ? 's' : ''}` : undefined} />
                ))}
              </div>
            </div>
          )}
          {demandeInfos && (
            <div className="grid gap-3">
              {connecte && (
                <p className="text-[15px] text-[#3f3f3f]">Il manque {champsManquants.length > 1 ? 'quelques informations' : 'une information'} à votre profil pour réserver.</p>
              )}
              {(!connecte || champsManquants.includes('prenom') || champsManquants.includes('nom')) && (
                <div className="grid grid-cols-2 gap-3">
                  {(!connecte || champsManquants.includes('prenom')) && <Field id="rv-prenom" label="Prénom" maxLength={80} value={form.prenom} onChange={set('prenom')} autoComplete="given-name" />}
                  {(!connecte || champsManquants.includes('nom')) && <Field id="rv-nom" label="Nom" maxLength={80} value={form.nom} onChange={set('nom')} autoComplete="family-name" />}
                </div>
              )}
              {(!connecte || champsManquants.includes('email')) && <Field id="rv-email" label="E-mail" type="email" inputMode="email" maxLength={255} value={form.email} onChange={set('email')} autoComplete="email" />}
              {(!connecte || champsManquants.includes('telephone')) && <Field id="rv-tel" label="Téléphone" type="tel" inputMode="tel" maxLength={30} value={form.telephone} onChange={set('telephone')} autoComplete="tel" placeholder="+41 …" />}
            </div>
          )}
          <p className="text-[13px] leading-[1.4] text-[#6a6a6a]">
            {connecte
              ? `Vous réservez avec votre compte${form.email ? ` (${form.email})` : ''}.`
              : accountOnly ? 'Si vous avez déjà un compte, connectez-vous avec vos identifiants habituels.' : 'Un espace candidat sera créé avec cet e-mail ; vos identifiants vous seront envoyés par e-mail.'}
          </p>
          <button type="submit" className="sr-only">Réserver</button>
        </form>
      )}
    </SheetDialog>
  );
}
