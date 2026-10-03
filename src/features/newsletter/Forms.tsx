import { useEffect, useState } from "react";
import { Plus, Copy, RefreshCw, ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { newsletterApi as api } from "@/features/newsletter/api";
import { CONTACT_CATEGORIES, type Category } from "./model";
type FormRow = {
  id: string;
  name: string;
  category: Category;
  provider_form_id: number | null;
  provider_domain_id: number;
  updated_at: string;
};
type RemoteForm = {
  title: string;
  subtitle: string;
  button: string;
  rgpd_msg: string;
  design: string;
  codes?: { js?: string; html?: string };
  fields?: { id: number; selected: boolean }[];
  statistics?: { display: number; conversions: number };
};
const empty = {
  name: "",
  category: "renter" as Category,
  title: "Recevez les nouvelles Logisorama",
  subtitle: "Conseils et actualités pour votre projet immobilier.",
  button: "Je m’inscris",
  rgpd_msg:
    "J’accepte de recevoir les actualités de Logisorama. Je peux me désinscrire à tout moment grâce au lien présent dans chaque email.",
  firstname: true,
  lastname: false,
  design: "classic",
};
export default function NewsletterForms({
  onContactsChanged,
}: {
  onContactsChanged: () => void;
}) {
  const [forms, setForms] = useState<FormRow[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [editing, setEditing] = useState(false),
    [current, setCurrent] = useState<FormRow | null>(null),
    [draft, setDraft] = useState(empty),
    [remote, setRemote] = useState<RemoteForm | null>(null),
    [requestId, setRequestId] = useState(() => crypto.randomUUID()),
    [code, setCode] = useState<"js" | "html">("js");
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setForms(
        (await api<{ forms: FormRow[] }>({ action: "forms-list" })).forms,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    const r = await api<{ local: FormRow; form: RemoteForm }>({
      action: "form-get",
      id,
    });
    setCurrent(r.local);
    setRemote(r.form);
    setDraft({
      ...empty,
      ...r.form,
      name: r.local.name,
      category: r.local.category,
      firstname: !!r.form.fields?.some((x) => x.id === 2 && x.selected),
      lastname: !!r.form.fields?.some((x) => x.id === 3 && x.selected),
    });
    setEditing(true);
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Formulaires d’abonnement</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Collectez des inscriptions et classez les prospects par projet.
          </p>
        </div>
        <Button
          disabled={busy}
          onClick={() => {
            setCurrent(null);
            setRemote(null);
            setDraft(empty);
            setRequestId(crypto.randomUUID());
            setEditing(true);
          }}
        >
          <Plus size={16} className="mr-2" />
          Créer un formulaire
        </Button>
      </div>
      {error && (
        <div role="alert" className="rounded-lg border p-4">
          {error}
          <Button variant="ghost" onClick={() => void refresh()}>
            Réessayer
          </Button>
        </div>
      )}
      {editing ? (
        <>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            <ArrowLeft size={16} className="mr-2" />
            Tous les formulaires
          </Button>
          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contenu et classement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(
                  [
                    ["name", "Nom interne"],
                    ["title", "Titre du formulaire"],
                    ["subtitle", "Description"],
                    ["button", "Texte du bouton"],
                  ] as const
                ).map(([k, label]) => (
                  <div key={k}>
                    <Label htmlFor={"form-" + k}>{label}</Label>
                    <Input
                      id={"form-" + k}
                      value={draft[k]}
                      maxLength={k === "name" ? 120 : k === "button" ? 80 : 200}
                      onChange={(e) =>
                        setDraft({ ...draft, [k]: e.target.value })
                      }
                    />
                  </div>
                ))}
                <div>
                  <Label htmlFor="form-category">
                    Classer les inscriptions dans
                  </Label>
                  <select
                    id="form-category"
                    className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={draft.category}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        category: e.target.value as Category,
                      })
                    }
                  >
                    {Object.entries(CONTACT_CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-5">
                  {(["firstname", "lastname"] as const).map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        disabled={!!current}
                        checked={draft[k]}
                        onCheckedChange={(v) =>
                          setDraft({ ...draft, [k]: v === true })
                        }
                      />
                      {k === "firstname"
                        ? "Demander le prénom"
                        : "Demander le nom"}
                    </label>
                  ))}
                </div>
                <div>
                  <Label htmlFor="form-consent">
                    Information sur l’abonnement
                  </Label>
                  <Textarea
                    id="form-consent"
                    value={draft.rgpd_msg}
                    maxLength={1000}
                    onChange={(e) =>
                      setDraft({ ...draft, rgpd_msg: e.target.value })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Les champs sont définis à la création et restent modifiables
                  dans Infomaniak. Infomaniak envoie une demande de
                  confirmation. Seules les inscriptions confirmées seront
                  reprises dans vos abonnés Logisorama.
                </p>
                <Button
                  disabled={
                    busy ||
                    !draft.name ||
                    !draft.title ||
                    !draft.button ||
                    !draft.rgpd_msg
                  }
                  onClick={() =>
                    void run(async () => {
                      const r = await api<{ id: string }>({
                        action: "form-save",
                        ...draft,
                        id: current?.id,
                        request_id: requestId,
                      });
                      await open(r.id);
                      await refresh();
                      toast.success("Réglages du formulaire enregistrés");
                    })
                  }
                >
                  {busy ? "Enregistrement…" : "Enregistrer le formulaire"}
                </Button>
              </CardContent>
            </Card>
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Aperçu du contenu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 rounded-xl bg-[#f3f1e9] p-7">
                    <h3 className="text-xl font-semibold text-[#1c4734]">
                      {draft.title}
                    </h3>
                    <p className="text-sm">{draft.subtitle}</p>
                    <Input disabled placeholder="Votre adresse email *" />
                    {draft.firstname && <Input disabled placeholder="Prénom" />}
                    {draft.lastname && <Input disabled placeholder="Nom" />}
                    <p className="text-xs text-muted-foreground">
                      {draft.rgpd_msg}
                    </p>
                    <Button type="button" disabled>
                      {draft.button}
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Aperçu non interactif. Le formulaire intégré utilise le
                    thème Infomaniak.
                  </p>
                </CardContent>
              </Card>
              {current && remote && (
                <Card>
                  <CardHeader>
                    <CardTitle>Diffusion et inscriptions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">
                      {remote.statistics?.display ?? 0} affichages ·{" "}
                      {remote.statistics?.conversions ?? 0} conversions
                    </p>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const r = await api<{ imported: number }>({
                            action: "form-sync",
                            id: current.id,
                          });
                          onContactsChanged();
                          await open(current.id);
                          toast.success(
                            `${r.imported} abonnés confirmés synchronisés`,
                          );
                        })
                      }
                    >
                      <RefreshCw size={16} className="mr-2" />
                      Synchroniser les inscrits
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Les exclusions et désinscriptions existantes restent
                      respectées. Utilisez ce bouton avant de préparer une
                      campagne.
                    </p>
                    <a
                      className="flex items-center gap-2 text-sm underline"
                      href={`https://newsletter.infomaniak.com/v3/${current.provider_domain_id}/webforms/${current.provider_form_id}/email-confirmation`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} />
                      Personnaliser les pages et l’email de confirmation
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          {current && remote && !remote.codes?.html && (
            <div
              role="alert"
              className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
            >
              <p>
                Infomaniak a enregistré le formulaire, mais son API n’a pas
                encore généré le code d’intégration. Vérifiez ses réglages dans
                Infomaniak, puis contrôlez à nouveau son activation ici.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://newsletter.infomaniak.com/v3/${current.provider_domain_id}/webforms/${current.provider_form_id}/email-confirmation`}
                >
                  Ouvrir dans Infomaniak
                </a>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => open(current.id))}
                >
                  Vérifier l’activation
                </Button>
              </div>
            </div>
          )}
          {remote?.codes?.html && (
            <Card>
              <CardHeader>
                <CardTitle>Intégrer à votre site</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant={code === "js" ? "secondary" : "ghost"}
                    onClick={() => setCode("js")}
                  >
                    JavaScript
                  </Button>
                  <Button
                    variant={code === "html" ? "secondary" : "ghost"}
                    onClick={() => setCode("html")}
                  >
                    HTML
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(remote.codes?.[code] || "")
                        .then(() => toast.success("Code copié"))
                        .catch(() =>
                          toast.error(
                            "Sélectionnez et copiez le code ci-dessous.",
                          ),
                        )
                    }
                  >
                    <Copy size={14} className="mr-2" />
                    Copier le code
                  </Button>
                </div>
                <Textarea
                  aria-label="Code d’intégration du formulaire"
                  readOnly
                  className="h-40 font-mono text-xs"
                  value={remote.codes[code] || ""}
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <p>Chargement des formulaires…</p>
            ) : forms.length ? (
              <div className="overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">Nom</th>
                      <th>Catégorie</th>
                      <th>Dernière modification</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {forms.map((f) => (
                      <tr key={f.id} className="border-b">
                        <td className="p-3 font-medium">{f.name}</td>
                        <td>{CONTACT_CATEGORIES[f.category]}</td>
                        <td>
                          {new Date(f.updated_at).toLocaleDateString("fr-CH")}
                        </td>
                        <td>
                          {f.provider_form_id ? (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() => void run(() => open(f.id))}
                            >
                              Modifier
                            </Button>
                          ) : (
                            <span className="text-amber-700">
                              Création à vérifier chez Infomaniak
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <h3 className="text-lg font-semibold">
                  Votre prochain abonné commence ici.
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Créez un formulaire pour les bailleurs, vendeurs ou personnes
                  en recherche, puis intégrez-le à votre site.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
