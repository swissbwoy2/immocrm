import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { rcDb } from "@/features/newsletter/rc-api";
import { RC_CAMPAIGN } from "@/features/newsletter/rc-campaign";

const blank = { first_name: "", last_name: "", current_address: "", email: "", phone: "", insured_people: "1", birth_date: "", nationality: "" };
const fieldClass = "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";

export default function OffreRC() {
  const { user, loading, userRoles } = useAuth();
  const userId = user?.id, userEmail = user?.email;
  const [fields, setFields] = useState(blank);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestKey] = useState(() => crypto.randomUUID());
  const allowed = userRoles.some(r => ["client", "candidat", "admin"].includes(r));

  useEffect(() => {
    let cancelled = false;
    setRequestId(null);
    setFields(blank);
    setConsent(false);
    if (!userId) return;
    setPrefilling(true);
    setLoadError(false);
    void (async () => {
      try {
        const [profile, client, existing] = await Promise.all([
          supabase.from("profiles").select("prenom,nom,email,telephone").eq("id", userId).maybeSingle(),
          supabase.from("clients").select("adresse,nationalite,date_naissance,nombre_occupants").eq("user_id", userId).limit(1),
          rcDb.from("rc_quote_requests").select("id").eq("user_id", userId).neq("status", "closed").limit(1),
        ]);
        if (existing.error) throw existing.error;
        if (cancelled) return;
        const p = profile.data, c = client.data?.[0];
        setFields({ first_name: p?.prenom || "", last_name: p?.nom || "", email: p?.email || userEmail || "", phone: p?.telephone || "", current_address: c?.adresse || "", nationality: c?.nationalite || "", birth_date: c?.date_naissance || "", insured_people: String(c?.nombre_occupants || 1) });
        setRequestId(existing.data?.[0]?.id || null);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally { if (!cancelled) setPrefilling(false); }
    })();
    return () => { cancelled = true; };
  }, [userId, userEmail, reload]); // A fresh identity always clears the previous account's fields.

  useEffect(() => {
    if (!loading && !prefilling && window.location.hash === "#demande") document.getElementById("demande")?.scrollIntoView();
  }, [loading, prefilling]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !consent || !user || !allowed) return;
    setBusy(true); setError("");
    try {
      const { data, error: failure } = await rcDb.rpc("request_rc_quote", {
        p_request_key: requestKey, p_first_name: fields.first_name, p_last_name: fields.last_name,
        p_current_address: fields.current_address, p_email: fields.email, p_phone: fields.phone,
        p_insured_people: Number(fields.insured_people), p_birth_date: fields.birth_date,
        p_nationality: fields.nationality, p_consent: consent,
      });
      if (failure || typeof data !== "string") throw failure || new Error("Enregistrement non confirmé");
      setRequestId(data);
    } catch {
      setError("Ta demande n’a pas pu être confirmée. Vérifie les champs et réessaie. En cas de besoin : support@logisorama.ch. Une nouvelle tentative ne créera pas de doublon.");
    } finally { setBusy(false); }
  }

  const input = (key: keyof typeof blank, label: string, type = "text", autoComplete?: string, maxLength = 100) => (
    <label className="block text-sm font-semibold text-slate-700" htmlFor={key}>{label}
      <input id={key} name={key} type={type} autoComplete={autoComplete} required maxLength={maxLength}
        max={type === "date" ? new Date().toLocaleDateString("en-CA") : undefined}
        min={type === "date" ? "1906-01-01" : undefined}
        className={fieldClass} value={fields[key]} onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))} />
    </label>
  );

  return <main className="min-h-screen bg-blue-50 text-slate-900">
    <header className="border-b border-blue-100 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
      <Link to="/" aria-label="Logisorama, accueil"><img src="/email/logo-logisorama.png" width="168" height="47" alt="Immo-rama · Logisorama" /></Link>
      <span className="flex items-center gap-2 text-xs font-semibold text-blue-700"><ShieldCheck size={20} /> Ton dossier, ta tranquillité</span>
    </div></header>
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:py-12 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
      <section>
        <p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-blue-700">Clients & candidats · Assurance RC</p>
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">Ajoute ta RC pour<br /><span className="text-blue-600">un dossier béton.</span></h1>
        <p className="mb-6 mt-5 max-w-lg text-lg leading-relaxed text-slate-600">Prépare la suite avec confiance. Demande ton offre RC gratuite et sans engagement : notre équipe s’occupe de ta demande, tu gardes le choix.</p>
        <img src={RC_CAMPAIGN.image} width="1280" height="853" alt="Un dossier bleu protégé par un bouclier, aux côtés d’une candidate sereine." className="w-full rounded-3xl border border-blue-100" />
        <div className="mt-6 grid gap-3 text-sm text-slate-600">{["Une demande d’offre gratuite, sans engagement.", "Tes informations restent liées à ton compte existant.", "Une équipe pour t’accompagner dans la suite."].map(text => <p key={text} className="flex gap-3"><CheckCircle2 className="shrink-0 text-blue-600" size={19} />{text}</p>)}</div>
        <p className="mt-6 text-xs leading-5 text-slate-500">La demande d’offre est gratuite. L’assurance est payante en cas de souscription. Si tu as déjà une RC, vérifie ton attestation avant de demander une nouvelle offre.</p>
      </section>
      <section id="demande" className="scroll-mt-6 self-start rounded-3xl border border-blue-100 bg-white p-6 shadow-sm md:p-8" aria-label="Demande d’offre RC">
        {loading || prefilling ? <p role="status">Chargement de ton espace…</p> : !user ? <>
          <ShieldCheck size={36} className="mb-5 text-blue-500" /><h2 className="text-2xl font-bold">Ton offre commence ici.</h2>
          <p className="my-5 leading-7 text-slate-600">Connecte-toi à ton compte Logisorama pour retrouver tes informations et compléter ta demande d’offre RC.</p>
          <Link className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white" to="/login?next=%2Foffre-rc">Me connecter et recevoir une offre <ArrowRight size={18} /></Link>
          <p className="mt-4 text-sm text-slate-500">Utilise ton compte client ou candidat habituel.</p>
        </> : loadError ? <div role="alert"><h2 className="text-xl font-bold">Ton formulaire est momentanément indisponible.</h2><p className="my-4 text-slate-600">Nous n’avons pas pu vérifier tes demandes existantes.</p><button className="rounded-xl bg-blue-600 px-5 py-3 text-white" onClick={() => setReload(n => n + 1)}>Réessayer</button></div> : requestId ? <div role="status">
          <CheckCircle2 size={44} className="mb-5 text-blue-600" /><h2 className="text-2xl font-bold">Ta demande est bien enregistrée.</h2>
          <p className="my-5 leading-7 text-slate-600">Notre équipe va la traiter et te recontacter aux coordonnées indiquées. Tu n’as rien à payer pour cette demande et tu restes libre de choisir.</p>
          <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">Une demande est déjà en cours pour ton compte : inutile de la renvoyer.</p>
          <a href="mailto:support@logisorama.ch" className="mt-5 inline-block text-sm font-semibold text-blue-700 underline">Une information à corriger ? Contacte-nous.</a>
        </div> : !allowed ? <p role="alert">Cette offre est réservée aux comptes clients et candidats. Connecte-toi avec ton compte concerné.</p> : <>
          <h2 className="text-2xl font-bold">Recevoir mon offre RC</h2><p className="mb-7 mt-2 text-sm text-slate-500">Complète ces informations pour que notre équipe traite ta demande. Tous les champs sont requis.</p>
          <form onSubmit={submit}>
            <fieldset disabled={busy} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">{input("first_name", "Prénom", "text", "given-name")}{input("last_name", "Nom", "text", "family-name")}</div>
              {input("current_address", "Adresse actuelle complète (rue, numéro, NPA, ville)", "text", "street-address", 500)}
              <div className="grid gap-5 sm:grid-cols-2">{input("email", "Adresse email", "email", "email", 254)}{input("phone", "Téléphone", "tel", "tel", 40)}</div>
              <div className="grid gap-5 sm:grid-cols-2"><label htmlFor="insured_people" className="block text-sm font-semibold text-slate-700">Nombre de personnes à assurer<input id="insured_people" name="insured_people" required type="number" min="1" max="30" step="1" className={fieldClass} value={fields.insured_people} onChange={e => setFields(f => ({ ...f, insured_people: e.target.value }))} /></label>{input("birth_date", "Date de naissance", "date", "bday")}</div>
              {input("nationality", "Nationalité")}
              <label className="flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-slate-600"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" /><span>Je demande une offre RC et j’accepte qu’Immo-rama / Logisorama utilise ces informations pour traiter ma demande et me recontacter. <Link to="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Protection des données</Link>.</span></label>
              {error && <p role="alert" className="text-sm leading-6 text-red-700">{error}</p>}
              <button type="submit" className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-5 py-4 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? "Enregistrement…" : "Recevoir une offre gratuite"}<ArrowRight size={18} /></button>
              <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500"><LockKeyhole size={14} /> Aucun paiement demandé · Aucun engagement</p>
            </fieldset>
          </form>
        </>}
      </section>
    </div>
    <footer className="mx-auto max-w-6xl px-5 pb-8 text-xs leading-6 text-slate-500">Logisorama · Immo-rama · <a href="mailto:support@logisorama.ch" className="underline">support@logisorama.ch</a></footer>
  </main>;
}
