import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, MailCheck, AlertTriangle, Home } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Field, FunnelCardPage, Note, PrimaryButton, SecondaryButton } from '@/components/funnel-ui/FunnelKit';

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

  const spinner = (
    <FunnelCardPage>
      <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#222222]" /></div>
    </FunnelCardPage>
  );

  if (chargement || authLoading) return spinner;

  if (erreur) {
    return (
      <FunnelCardPage>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff4ef] text-[#c13515]"><AlertTriangle className="h-6 w-6" /></span>
        <h1 className="mt-5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[#222222]">Lien indisponible</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-[#3f3f3f]">{erreur}</p>
        <div className="mt-8"><PrimaryButton full onClick={() => navigate('/annonces')}><Home className="h-4 w-4" /> Voir les annonces</PrimaryButton></div>
      </FunnelCardPage>
    );
  }

  if (user) return spinner;

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <FunnelCardPage>
      <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-[#222222]">Votre demande de location</h1>
      {bien && <p className="mt-2 text-[16px] leading-relaxed text-[#3f3f3f]">{bien}</p>}
      {envoye ? (
        <div className="mt-6 grid gap-4">
          <Note tone="ok">
            <span className="flex items-start gap-2"><MailCheck className="mt-0.5 h-5 w-5 flex-none" />
              <span>Nous venons d'envoyer un lien de connexion à <strong className="break-all font-semibold">{form.email.trim()}</strong>.</span>
            </span>
          </Note>
          <p className="text-[15px] leading-relaxed text-[#3f3f3f]">
            Ouvrez-le depuis cet appareil : vous arriverez directement sur le formulaire. Pensez aux indésirables si vous ne le voyez pas.
          </p>
          <SecondaryButton disabled={envoi} onClick={() => setEnvoye(false)}>Modifier mon adresse</SecondaryButton>
        </div>
      ) : (
        <form onSubmit={envoyerLien} noValidate className="mt-6 grid gap-3">
          <p className="text-[15px] leading-relaxed text-[#3f3f3f]">
            Renseignez vos coordonnées : nous vous enverrons un lien de connexion à usage unique pour accéder au formulaire.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field id="pl-prenom" label="Prénom" maxLength={80} value={form.prenom} onChange={set('prenom')} autoComplete="given-name" />
            <Field id="pl-nom" label="Nom" maxLength={80} value={form.nom} onChange={set('nom')} autoComplete="family-name" />
          </div>
          <Field id="pl-email" label="E-mail" type="email" inputMode="email" maxLength={255} value={form.email} onChange={set('email')} autoComplete="email" />
          <Field id="pl-tel" label="Téléphone (facultatif)" type="tel" inputMode="tel" maxLength={30} placeholder="+41 …" value={form.telephone} onChange={set('telephone')} autoComplete="tel" />
          <div className="mt-3"><PrimaryButton type="submit" full loading={envoi}>Recevoir mon lien de connexion</PrimaryButton></div>
        </form>
      )}
    </FunnelCardPage>
  );
}
