import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, Clock, Lock } from "lucide-react";

const schema = z.object({
  prenom: z.string().trim().min(1, "Prénom requis").max(80),
  nom: z.string().trim().min(1, "Nom requis").max(80),
  email: z.string().trim().email("Email invalide").max(255),
  telephone: z
    .string()
    .trim()
    .min(7, "Numéro invalide")
    .max(30)
    .regex(/^[+0-9 ().-]+$/, "Numéro invalide"),
  adresse: z.string().trim().min(3, "Adresse requise").max(255),
  npa: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "NPA suisse à 4 chiffres"),
  type_bien: z.enum(["Appartement", "Maison", "Immeuble", "Terrain", "Autre"]),
  date_rdv: z.string().min(1, "Sélectionnez une date"),
  creneau: z.string().min(1, "Sélectionnez un créneau"),
  message: z.string().trim().max(1000).optional(),
});

type FormState = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  npa: string;
  type_bien: string;
  date_rdv: string;
  creneau: string;
  message: string;
};

const INITIAL: FormState = {
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  adresse: "",
  npa: "",
  type_bien: "",
  date_rdv: "",
  creneau: "",
  message: "",
};

const CRENEAUX = [
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
];

function getAvailableDates(count = 10): { value: string; label: string }[] {
  const dates: { value: string; label: string }[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  while (dates.length < count) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const value = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("fr-CH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "Europe/Zurich",
      });
      dates.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export default function RendezVousProprietaire() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [params] = useSearchParams();

  useEffect(() => {
    document.title = "Vendez votre bien en toute discrétion | Logisorama";
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute("content") ?? null;
    if (meta) meta.setAttribute("content", "Demandez la visite de votre bien par un expert Logisorama. Vente off-market, 100% confidentielle, réponse sous 24h.");
    return () => { if (meta && prev !== null) meta.setAttribute("content", prev); };
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => {
      const { [k]: _, ...rest } = e;
      return rest;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const flat: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        flat[issue.path[0] as string] = issue.message;
      }
      setErrors(flat);
      toast.error("Merci de vérifier les champs en rouge");
      return;
    }
    setSubmitting(true);
    try {
      const data = parsed.data;
      const dateLabel = new Date(data.date_rdv).toLocaleDateString("fr-CH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Zurich",
      });
      const notes = [
        `Demande RDV visite propriétaire`,
        `Date souhaitée: ${dateLabel} (${data.date_rdv})`,
        `Créneau: ${data.creneau}`,
        `Adresse: ${data.adresse}`,
        `NPA: ${data.npa}`,
        `Type de bien: ${data.type_bien}`,
        data.message ? `Message: ${data.message}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const { error } = await supabase.from("leads").insert({
        email: data.email,
        prenom: data.prenom,
        nom: data.nom,
        telephone: data.telephone,
        localite: data.npa,
        type_bien: data.type_bien,
        type_recherche: "vente",
        source: "vente_proprietaire",
        formulaire: "rdv_proprietaire",
        notes,
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        utm_content: params.get("utm_content"),
        utm_term: params.get("utm_term"),
      });
      if (error && !/duplicate/i.test(error.message)) throw error;
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error("Une erreur est survenue. Réessayez ou appelez-nous.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0c0a] text-[#f4ecd8]">

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#b8893d]/20 bg-gradient-to-br from-[#0e0c0a] via-[#1c1814] to-[#0e0c0a]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_10%,rgba(212,168,87,0.18),transparent_50%),radial-gradient(circle_at_80%_60%,rgba(184,137,61,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-3xl px-5 pt-12 pb-8 text-center">
          <span className="inline-block rounded-full border border-[#b8893d]/50 bg-[#b8893d]/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#e0c089]">
            🤫 VENTE OFF-MARKET · 100% CONFIDENTIEL
          </span>
          <h1 className="mt-5 font-serif text-3xl leading-tight md:text-4xl">
            Vendez votre bien <em className="not-italic text-[#d4a857]">en toute discrétion</em>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#c9bfac] md:text-base">
            Un expert Logisorama se déplace chez vous, évalue votre bien et active immédiatement
            son réseau d'acheteurs qualifiés. Aucune annonce publique, zéro défilé d'inconnus.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["✓ Discrétion totale", "✓ Vente rapide", "✓ Acheteurs qualifiés"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#b8893d]/40 bg-[#b8893d]/10 px-3 py-1.5 text-xs font-bold text-[#d4a857]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="mx-auto max-w-2xl px-5 py-10">
        {done ? (
          <div className="rounded-2xl border border-[#b8893d]/40 bg-[#1c1814] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <CheckCircle2 className="mx-auto h-14 w-14 text-[#d4a857]" />
            <h2 className="mt-4 font-serif text-2xl text-[#f4ecd8]">Demande bien reçue</h2>
            <p className="mt-3 text-[#c9bfac]">
              Un expert Logisorama vous appelle <strong className="text-[#d4a857]">sous 24h</strong>{" "}
              pour convenir d'un rendez-vous de visite sur place — en toute discrétion.
            </p>
            <p className="mt-2 text-sm text-[#8a7f6e]">
              Une urgence ? <a className="text-[#d4a857] underline" href="tel:+41216343161">+41 21 634 31 61</a>
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#b8893d]/25 bg-[#1c1814] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] md:p-8"
          >
            <h2 className="mb-1 font-serif text-2xl text-[#f4ecd8]">
              📍 Demander la visite de mon bien
            </h2>
            <p className="mb-6 text-sm text-[#8a7f6e]">
              Réponse sous 24h. Sans engagement.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Prénom" error={errors.prenom}>
                <Input
                  value={form.prenom}
                  onChange={(e) => set("prenom", e.target.value)}
                  className="dark-input"
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Nom" error={errors.nom}>
                <Input
                  value={form.nom}
                  onChange={(e) => set("nom", e.target.value)}
                  className="dark-input"
                  autoComplete="family-name"
                />
              </Field>
              <Field label="Email" error={errors.email}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="dark-input"
                  autoComplete="email"
                />
              </Field>
              <Field label="Téléphone" error={errors.telephone}>
                <Input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => set("telephone", e.target.value)}
                  className="dark-input"
                  placeholder="+41 79 ..."
                  autoComplete="tel"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Adresse du bien" error={errors.adresse}>
                  <Input
                    value={form.adresse}
                    onChange={(e) => set("adresse", e.target.value)}
                    className="dark-input"
                    placeholder="Rue et numéro"
                    autoComplete="street-address"
                  />
                </Field>
              </div>
              <Field label="Code postal" error={errors.npa}>
                <Input
                  value={form.npa}
                  onChange={(e) => set("npa", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="dark-input"
                  inputMode="numeric"
                  placeholder="1000"
                  autoComplete="postal-code"
                />
              </Field>
              <Field label="Type de bien" error={errors.type_bien}>
                <Select
                  value={form.type_bien}
                  onValueChange={(v) => set("type_bien", v)}
                >
                  <SelectTrigger className="dark-input">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Appartement", "Maison", "Immeuble", "Terrain", "Autre"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="md:col-span-2 rounded-xl border border-[#b8893d]/25 bg-[#0e0c0a]/60 p-4">
                <Label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[#d4a857]">
                  📅 Choisissez votre créneau de visite
                </Label>
                <p className="mb-3 text-xs text-[#8a7f6e]">
                  Sélectionnez un jour puis un horaire qui vous convient. Nous confirmons sous 24h.
                </p>

                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#c9bfac]">
                  Jour
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {getAvailableDates(9).map((d) => {
                    const active = form.date_rdv === d.value;
                    return (
                      <button
                        type="button"
                        key={d.value}
                        onClick={() => set("date_rdv", d.value)}
                        className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                          active
                            ? "border-[#d4a857] bg-[#d4a857]/15 text-[#f4ecd8] shadow-[0_0_0_1px_rgba(212,168,87,0.5)]"
                            : "border-[#b8893d]/25 bg-[#1c1814] text-[#c9bfac] hover:border-[#d4a857]/60"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {errors.date_rdv ? <p className="mt-2 text-xs text-red-400">{errors.date_rdv}</p> : null}

                <div className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#c9bfac]">
                  Horaire
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {CRENEAUX.map((c) => {
                    const active = form.creneau === c;
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => set("creneau", c)}
                        className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition ${
                          active
                            ? "border-[#d4a857] bg-[#d4a857]/15 text-[#f4ecd8] shadow-[0_0_0_1px_rgba(212,168,87,0.5)]"
                            : "border-[#b8893d]/25 bg-[#1c1814] text-[#c9bfac] hover:border-[#d4a857]/60"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                {errors.creneau ? <p className="mt-2 text-xs text-red-400">{errors.creneau}</p> : null}
              </div>

              <div className="md:col-span-2">
                <Field label="Message (facultatif)" error={errors.message}>
                  <Textarea
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    className="dark-input min-h-24"
                    placeholder="Précisions sur votre bien, délais souhaités..."
                  />
                </Field>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full bg-gradient-to-r from-[#d4a857] to-[#b8893d] text-[#1c1814] font-bold text-base py-6 rounded-xl shadow-[0_10px_28px_rgba(184,137,61,0.45)] hover:opacity-95"
            >
              {submitting ? "Envoi en cours..." : "📞 Demander la visite de mon bien"}
            </Button>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[#8a7f6e]">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Réponse sous 24h</span>
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> 100% confidentiel</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Sans engagement</span>
            </div>
          </form>
        )}
      </section>

      <style>{`
        .dark-input {
          background: #0e0c0a !important;
          border: 1px solid rgba(184,137,61,0.25) !important;
          color: #f4ecd8 !important;
        }
        .dark-input::placeholder { color: #6b6253 !important; }
        .dark-input:focus-visible {
          border-color: #d4a857 !important;
          box-shadow: 0 0 0 2px rgba(212,168,87,0.25) !important;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c9bfac]">
        {label}
      </Label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
