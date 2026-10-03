import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  Mail,
  Users,
  Code2,
  Send,
  Monitor,
  Smartphone,
  Download,
  Plus,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { newsletterApi as api } from "@/features/newsletter/api";
import {
  CONTACT_CATEGORIES,
  STATUS_LABELS,
  filterContacts,
  parseContactCsv,
  type Category,
  type Contact,
  type ContactKind,
  type Campaign,
  type ImportRow,
} from "@/features/newsletter/model";
import referenceHtml from "@/features/newsletter/reference.html?raw";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const tz = "Europe/Zurich";
const dateLabel = (value: string | null) =>
  value ? formatInTimeZone(value, tz, "dd.MM.yyyy à HH:mm") : "";
const initial = { name: "", subject: "", html: "" };
function CategoryPicker({
  value,
  onChange,
}: {
  value: Category[];
  onChange: (v: Category[]) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(CONTACT_CATEGORIES).map(([k, label]) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.includes(k as Category)}
            onCheckedChange={(v) =>
              onChange(
                v ? [...value, k as Category] : value.filter((c) => c !== k),
              )
            }
          />
          {label}
        </label>
      ))}
    </div>
  );
}
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export default function Newsletter() {
  const [tab, setTab] = useState("create");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState(initial);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [mobile, setMobile] = useState(false);
  const [when, setWhen] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const testKey = useRef(crypto.randomUUID());
  const [confirm, setConfirm] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [issues, setIssues] = useState<
    { email: string; error: string; status: string }[]
  >([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importKind, setImportKind] = useState<ContactKind>("prospect");
  const [importCategories, setImportCategories] = useState<Category[]>([
    "renter",
  ]);
  const [importInfo, setImportInfo] = useState("");
  const [importSource, setImportSource] = useState<"csv" | "application">(
    "csv",
  );
  const [importSelection, setImportSelection] = useState<Set<string>>(
    new Set(),
  );
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const locked = !!campaign && campaign.status !== "draft";
  const visible = useMemo(
    () => filterContacts(contacts, query, kind, category),
    [contacts, query, kind, category],
  );
  const eligible = visible.filter((c) => !c.excluded && !c.unsubscribed);
  const recipients = contacts.filter(
    (c) => selected.has(c.id) && !c.excluded && !c.unsubscribed,
  );
  const htmlPreview = useMemo(() => {
    const safe = DOMPurify.sanitize(draft.html, {
      WHOLE_DOCUMENT: true,
      ADD_TAGS: ["style"],
      FORBID_TAGS: [
        "script",
        "iframe",
        "object",
        "embed",
        "form",
        "input",
        "button",
        "link",
        "meta",
      ],
    });
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'; font-src https:; base-uri 'none'; form-action 'none'">`;
    return safe.replace(/<head>/i, `<head>${csp}`);
  }, [draft.html]);
  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      const [c, n] = await Promise.all([
        api<{ contacts: Contact[] }>({ action: "contacts" }),
        api<{ campaigns: Campaign[] }>({ action: "list" }),
      ]);
      setContacts(c.contacts);
      setCampaigns(n.campaigns);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [query, kind, category]);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function changeDraft(patch: Partial<typeof initial>) {
    setDraft((d) => ({ ...d, ...patch }));
    testKey.current = crypto.randomUUID();
  }
  async function save(): Promise<Campaign> {
    const { campaign: saved } = await api<{ campaign: Campaign }>({
      action: "save",
      ...draft,
      id: campaign?.id,
      revision: campaign?.revision,
    });
    setCampaign(saved);
    setDraft({ name: saved.name, subject: saved.subject, html: saved.html });
    return saved;
  }
  async function openCampaign(id: string) {
    await run(async () => {
      const data = await api<{
        campaign: Campaign;
        counts: Record<string, number>;
        issues: typeof issues;
      }>({ action: "get", id });
      setCampaign(data.campaign);
      setDraft({
        name: data.campaign.name,
        subject: data.campaign.subject,
        html: data.campaign.html,
      });
      setCounts(data.counts);
      setIssues(data.issues);
      setWhen("");
      setSelected(new Set());
      setTab("create");
    });
  }
  function openImport(source: "csv" | "application") {
    setImportSource(source);
    setImportRows([]);
    setImportSelection(new Set());
    setImportInfo("");
    setImportKind(
      source === "application"
        ? "client"
        : kind === "client"
          ? "client"
          : "prospect",
    );
    setImportCategories([
      category === "all" ? "renter" : (category as Category),
    ]);
    setImportOpen(true);
    if (source === "application")
      void run(async () => {
        const data = await api<{ clients: ImportRow[] }>({ action: "clients" });
        setImportRows(data.clients);
        setImportInfo(
          "Sélectionnez les clients à ajouter dans la catégorie choisie.",
        );
      });
  }
  async function readCsv(file?: File) {
    if (!file) return;
    setImportRows([]);
    setImportInfo("");
    setImportSelection(new Set());
    try {
      if (file.size > 2_000_000)
        throw new Error("Le CSV doit peser moins de 2 Mo");
      const parsed = parseContactCsv(await file.text());
      setImportRows(parsed.rows);
      setImportSelection(new Set(parsed.rows.map((r) => r.email)));
      setImportInfo(
        `${parsed.rows.length} adresses valides · ${parsed.duplicates} doublons retirés${parsed.invalid.length ? ` · ${parsed.invalid.length} lignes ignorées (email invalide) : ${parsed.invalid.slice(0, 12).join(", ")}` : ""}`,
      );
    } catch (e) {
      setImportInfo((e as Error).message);
    }
  }
  const selectionPanel = (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          aria-label="Rechercher des contacts"
          placeholder="Nom ou email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Type de contact"
          className={selectClass}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="all">Clients et prospects</option>
          <option value="client">Clients</option>
          <option value="prospect">Prospects</option>
        </select>
        <select
          aria-label="Catégorie des contacts"
          className={selectClass}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">Toutes les catégories</option>
          {Object.entries(CONTACT_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={locked || busy}
          onClick={() =>
            setSelected(new Set([...selected, ...eligible.map((c) => c.id)]))
          }
        >
          Sélectionner les {eligible.length} contacts éligibles affichés
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelected(new Set())}
          disabled={locked}
        >
          Effacer la sélection
        </Button>
        <span className="text-sm text-muted-foreground">
          {recipients.length} sélectionnés, y compris dans les autres filtres
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3">Choix</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Type et catégories</th>
              <th className="p-3">Statut</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.slice((page - 1) * 40, page * 40).map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">
                  <Checkbox
                    aria-label={`Sélectionner ${c.email}`}
                    disabled={locked || c.excluded || c.unsubscribed}
                    checked={selected.has(c.id)}
                    onCheckedChange={(checked) =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(c.id);
                        else next.delete(c.id);
                        return next;
                      })
                    }
                  />
                </td>
                <td className="p-3">
                  <div className="font-medium">
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") ||
                      c.email}
                  </div>
                  <div className="text-muted-foreground">{c.email}</div>
                </td>
                <td className="p-3">
                  <Badge variant="outline">
                    {c.kind === "client" ? "Client" : "Prospect"}
                  </Badge>
                  <div className="mt-1 max-w-xs text-xs text-muted-foreground">
                    {c.categories.map((v) => CONTACT_CATEGORIES[v]).join(" · ")}
                  </div>
                </td>
                <td className="p-3">
                  {c.unsubscribed
                    ? "Désinscrit"
                    : c.excluded
                      ? "Exclu"
                      : "Disponible"}
                </td>
                <td className="p-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditContact({ ...c })}
                  >
                    Classer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-6 text-center text-muted-foreground">
            Aucun contact. Importez un CSV ou ajoutez des clients de
            l’application.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>
          {visible.length} contacts · page {page}/
          {Math.max(1, Math.ceil(visible.length / 40))}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page * 40 >= visible.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <section className="rounded-2xl bg-[#1c4734] p-6 text-white md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[.2em] text-[#d8ddc9]">
              <Mail className="h-4 w-4" />
              Logisorama · Communication
            </div>
            <h1 className="text-3xl font-semibold">Newsletter</h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              Vos contacts, votre HTML, vos envois. Préparez une newsletter
              adaptée à chaque projet immobilier.
            </p>
          </div>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setCampaign(null);
              setDraft(initial);
              setCounts({});
              setIssues([]);
              setWhen("");
              setSelected(new Set());
              setTab("create");
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle newsletter
          </Button>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(CONTACT_CATEGORIES).map(([key, label]) => (
          <button
            key={key}
            className={`rounded-xl border bg-card p-4 text-left transition hover:border-[#205a43] ${category === key ? "ring-1 ring-[#205a43]" : ""}`}
            onClick={() => {
              setCategory(key);
              setTab("contacts");
            }}
          >
            <span className="block text-2xl font-semibold text-[#205a43]">
              {
                contacts.filter((c) => c.categories.includes(key as Category))
                  .length
              }
            </span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>
      {loadError && (
        <div role="alert" className="rounded-lg border border-destructive p-4">
          <p>Le module n’est pas disponible : {loadError}</p>
          <Button
            variant="outline"
            onClick={() => void refresh()}
            className="mt-2"
          >
            Réessayer
          </Button>
        </div>
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap justify-between gap-3">
          <TabsList>
            <TabsTrigger value="create">
              <Code2 className="mr-2 h-4 w-4" />
              Créer
            </TabsTrigger>
            <TabsTrigger value="contacts">
              <Users className="mr-2 h-4 w-4" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="sm"
            disabled={loading || busy}
            onClick={() => void refresh()}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Actualiser
          </Button>
        </div>
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openImport("csv")} disabled={busy}>
              Importer un CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => openImport("application")}
              disabled={busy}
            >
              Ajouter des clients de l’application
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                download(
                  "modele-contacts.csv",
                  "email;prenom;nom\nexemple@example.com;Prénom;Nom\n",
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Modèle CSV
            </Button>
          </div>
          {selectionPanel}
        </TabsContent>
        <TabsContent value="create" className="space-y-5">
          {locked && (
            <Card>
              <CardContent className="space-y-3 pt-6">
                <p className="font-medium">
                  {STATUS_LABELS[campaign.status]}{" "}
                  {dateLabel(campaign.scheduled_at)} · heure suisse
                </p>
                {campaign.worker_error && (
                  <p role="alert" className="text-sm text-destructive">
                    {campaign.worker_error}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-sm">
                  <span>{counts.sent || 0} transmis à Resend</span>
                  <span>
                    {(counts.pending || 0) + (counts.processing || 0)} en
                    attente
                  </span>
                  <span>{counts.failed || 0} échecs</span>
                  <span>{counts.skipped || 0} exclus</span>
                  <span>{counts.attention || 0} à vérifier</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  « Transmis » signifie accepté par Resend ; ce n’est pas une
                  confirmation de livraison.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void openCampaign(campaign.id)}
                  >
                    Actualiser le suivi
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCampaign(null);
                      setDraft({ ...draft, name: draft.name + " (copie)" });
                      setSelected(new Set());
                      setWhen("");
                    }}
                  >
                    Dupliquer en brouillon
                  </Button>
                  {campaign.status === "queued" &&
                    campaign.scheduled_at &&
                    new Date(campaign.scheduled_at) > new Date() && (
                      <Button
                        variant="destructive"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api({ action: "cancel", id: campaign.id });
                            await openCampaign(campaign.id);
                            await refresh();
                          })
                        }
                      >
                        Annuler la programmation
                      </Button>
                    )}
                </div>
                {issues.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-sm">
                      Voir les erreurs et exclusions
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs">
                      {issues.map((i) => (
                        <li key={i.email}>
                          {i.email} : {i.error || i.status}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          )}
          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>1. Votre contenu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="newsletter-name">Nom interne</Label>
                  <Input
                    id="newsletter-name"
                    value={draft.name}
                    maxLength={120}
                    disabled={locked || busy}
                    onChange={(e) => changeDraft({ name: e.target.value })}
                    placeholder="Newsletter octobre — Recherche de logement"
                  />
                </div>
                <div>
                  <Label htmlFor="newsletter-subject">Objet de l’email</Label>
                  <Input
                    id="newsletter-subject"
                    value={draft.subject}
                    maxLength={200}
                    disabled={locked || busy}
                    onChange={(e) => changeDraft({ subject: e.target.value })}
                    placeholder="Bonjour, vous avez trouvé un appart ?"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={locked || busy}
                    onClick={() =>
                      changeDraft({
                        html: referenceHtml,
                        subject:
                          draft.subject ||
                          "Bonjour, vous avez trouvé un appart ?",
                        name: draft.name || "Newsletter Logisorama",
                      })
                    }
                  >
                    Utiliser le modèle Logisorama
                  </Button>
                  <label className="text-sm">
                    Importer un fichier HTML
                    <Input
                      type="file"
                      accept=".html,.htm,text/html"
                      disabled={locked || busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f)
                          void run(async () => {
                            if (f.size > 250000)
                              throw new Error("Fichier HTML limité à 250 Ko");
                            changeDraft({ html: await f.text() });
                          });
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Référence du 3 octobre : largeur 640 px, vert profond et
                  crème, grande image puis blocs alternés. Les images de votre
                  HTML doivent être hébergées en HTTPS.
                </p>
                <div>
                  <Label htmlFor="newsletter-html">
                    Collez votre code HTML
                  </Label>
                  <Textarea
                    id="newsletter-html"
                    className="min-h-[330px] font-mono text-xs"
                    value={draft.html}
                    disabled={locked || busy}
                    onChange={(e) => changeDraft({ html: e.target.value })}
                    placeholder="<!DOCTYPE html>…"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Le lien de désinscription est ajouté automatiquement. Vous
                  pouvez le placer avec {"{{unsubscribe_url}}"}.
                </p>
                <Button
                  disabled={
                    locked ||
                    busy ||
                    !draft.html ||
                    !draft.name ||
                    !draft.subject
                  }
                  onClick={() =>
                    void run(async () => {
                      await save();
                      await refresh();
                      toast.success("Brouillon enregistré");
                    })
                  }
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer le brouillon
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Aperçu</CardTitle>
                <div className="flex gap-1">
                  <Button
                    aria-label="Aperçu ordinateur"
                    variant={mobile ? "ghost" : "secondary"}
                    size="icon"
                    onClick={() => setMobile(false)}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    aria-label="Aperçu mobile"
                    variant={mobile ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setMobile(true)}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto rounded-xl bg-[#eef0eb] p-2">
                  {draft.html ? (
                    <iframe
                      title="Aperçu de la newsletter"
                      sandbox=""
                      referrerPolicy="no-referrer"
                      srcDoc={htmlPreview}
                      className="mx-auto h-[700px] border-0 bg-white"
                      style={{ width: mobile ? 375 : 640, maxWidth: "100%" }}
                    />
                  ) : (
                    <div className="flex h-[700px] items-center justify-center p-8 text-center text-muted-foreground">
                      Collez votre code HTML ou utilisez le modèle Logisorama
                      pour voir le résultat.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          {!locked && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>2. Vos destinataires</CardTitle>
                </CardHeader>
                <CardContent>{selectionPanel}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>3. Vérifier et envoyer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-64 flex-1">
                      <Label htmlFor="newsletter-test">Recevoir un test</Label>
                      <Input
                        id="newsletter-test"
                        type="email"
                        value={testEmail}
                        onChange={(e) => {
                          setTestEmail(e.target.value);
                          testKey.current = crypto.randomUUID();
                        }}
                        placeholder="votre@email.ch"
                      />
                    </div>
                    <Button
                      variant="outline"
                      disabled={
                        busy || !draft.html || !draft.subject || !testEmail
                      }
                      onClick={() =>
                        void run(async () => {
                          await api({
                            action: "test",
                            email: testEmail,
                            subject: draft.subject,
                            html: draft.html,
                            request_id: testKey.current,
                          });
                          testKey.current = crypto.randomUUID();
                          toast.success("Test transmis à Resend");
                        })
                      }
                    >
                      Envoyer un test
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <Label htmlFor="newsletter-time">
                        Programmer — heure suisse (facultatif)
                      </Label>
                      <Input
                        id="newsletter-time"
                        type="datetime-local"
                        value={when}
                        onChange={(e) => setWhen(e.target.value)}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Vide = dès validation. Les envois démarrent à partir de
                        l’heure choisie et se poursuivent même si vous fermez
                        l’application.
                      </p>
                    </div>
                    <Button
                      className="bg-[#205a43] hover:bg-[#1c4734]"
                      disabled={
                        busy ||
                        loading ||
                        !!loadError ||
                        !recipients.length ||
                        !draft.name ||
                        !draft.subject ||
                        !draft.html
                      }
                      onClick={() => setConfirm(true)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {when ? "Programmer" : "Envoyer"} à {recipients.length}{" "}
                      contacts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Vos newsletters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!campaigns.length && (
                <p className="text-muted-foreground">
                  Vos brouillons et envois apparaîtront ici.
                </p>
              )}
              {campaigns.map((c) => (
                <button
                  key={c.id}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-left hover:bg-muted/40"
                  disabled={busy}
                  onClick={() => void openCampaign(c.id)}
                >
                  <span>
                    <span className="block font-medium">{c.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {c.subject}
                    </span>
                  </span>
                  <span className="text-right">
                    <Badge variant="secondary">{STATUS_LABELS[c.status]}</Badge>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {dateLabel(c.scheduled_at)}
                    </span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog
        open={importOpen}
        onOpenChange={(v) => {
          if (!busy) setImportOpen(v);
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {importSource === "csv"
                ? "Importer des contacts CSV"
                : "Ajouter des clients"}
            </DialogTitle>
            <DialogDescription>
              Choisissez le type et les catégories avant l’import. Les doublons
              sont fusionnés ; les exclusions et désinscriptions sont
              conservées.
            </DialogDescription>
          </DialogHeader>
          <Label>
            Type de contact
            <select
              className={selectClass}
              value={importKind}
              disabled={importSource === "application" || busy}
              onChange={(e) => setImportKind(e.target.value as ContactKind)}
            >
              <option value="prospect">Prospect</option>
              <option value="client">Client</option>
            </select>
          </Label>
          <CategoryPicker
            value={importCategories}
            onChange={setImportCategories}
          />
          {importSource === "csv" && (
            <Input
              aria-label="Fichier CSV"
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                void readCsv(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          )}
          <p className="text-sm" role="status">
            {importInfo}
          </p>
          {importRows.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setImportSelection(
                    new Set(
                      importSelection.size === importRows.length
                        ? []
                        : importRows.map((r) => r.email),
                    ),
                  )
                }
              >
                Tout sélectionner / désélectionner ({importRows.length})
              </Button>
              <div className="max-h-64 overflow-auto rounded-lg border">
                {importRows.map((r) => (
                  <label
                    key={r.email}
                    className="flex items-center gap-3 border-b p-2 text-sm"
                  >
                    <Checkbox
                      checked={importSelection.has(r.email)}
                      disabled={busy}
                      onCheckedChange={(v) =>
                        setImportSelection((prev) => {
                          const next = new Set(prev);
                          if (v) next.add(r.email);
                          else next.delete(r.email);
                          return next;
                        })
                      }
                    />
                    <span>
                      {r.first_name} {r.last_name} — {r.email}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
          <Button
            disabled={busy || !importSelection.size || !importCategories.length}
            onClick={() =>
              void run(async () => {
                const rows = importRows.filter((r) =>
                  importSelection.has(r.email),
                );
                let imported = 0;
                for (let i = 0; i < rows.length; i += 1000) {
                  const result = await api<{ imported: number }>({
                    action: "import",
                    rows: rows.slice(i, i + 1000),
                    kind: importKind,
                    categories: importCategories,
                    source: importSource,
                  });
                  imported += result.imported;
                }
                toast.success(`${imported} contacts importés ou mis à jour`);
                setImportOpen(false);
                await refresh();
              })
            }
          >
            {busy
              ? "Import en cours…"
              : `Importer les ${importSelection.size} contacts sélectionnés`}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editContact}
        onOpenChange={(v) => {
          if (!v && !busy) setEditContact(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Classer le contact</DialogTitle>
            <DialogDescription>{editContact?.email}</DialogDescription>
          </DialogHeader>
          {editContact && (
            <>
              <select
                aria-label="Type du contact"
                className={selectClass}
                value={editContact.kind}
                onChange={(e) =>
                  setEditContact({
                    ...editContact,
                    kind: e.target.value as ContactKind,
                  })
                }
              >
                <option value="client">Client</option>
                <option value="prospect">Prospect</option>
              </select>
              <CategoryPicker
                value={editContact.categories}
                onChange={(v) =>
                  setEditContact({ ...editContact, categories: v })
                }
              />
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={editContact.excluded}
                  onCheckedChange={(v) =>
                    setEditContact({ ...editContact, excluded: !!v })
                  }
                />
                Exclure des newsletters
              </label>
              {editContact.unsubscribed && (
                <p className="text-sm text-muted-foreground">
                  Ce contact est désinscrit. Un changement de catégorie ne le
                  réinscrit pas.
                </p>
              )}
              <Button
                disabled={busy || !editContact.categories.length}
                onClick={() =>
                  void run(async () => {
                    await api({ action: "contact-update", ...editContact });
                    setEditContact(null);
                    await refresh();
                  })
                }
              >
                Enregistrer
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirm}
        onOpenChange={(v) => {
          if (!busy) setConfirm(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirmer {when ? "la programmation" : "l’envoi"}
            </DialogTitle>
            <DialogDescription>
              Vérifiez l’objet et la sélection avant de lancer la campagne.
            </DialogDescription>
          </DialogHeader>
          <p className="font-medium">{draft.subject}</p>
          <p>
            {recipients.length} contacts sélectionnés ·{" "}
            {when
              ? `${when.replace("T", " à ")} — heure suisse`
              : "Dès maintenant"}
          </p>
          <p className="text-sm text-muted-foreground">
            Les nouvelles désinscriptions seront également exclues au moment de
            l’envoi.
          </p>
          <Button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                let scheduled: string | undefined;
                if (when) {
                  const d = fromZonedTime(when, tz);
                  if (
                    !Number.isFinite(d.getTime()) ||
                    d.getTime() < Date.now() + 60000 ||
                    d.getTime() > Date.now() + 30 * 86400000
                  )
                    throw new Error(
                      "Choisissez une date entre une minute et 30 jours dans le futur",
                    );
                  if (formatInTimeZone(d, tz, "yyyy-MM-dd'T'HH:mm") !== when)
                    throw new Error(
                      "Cette heure n’existe pas lors du changement d’heure",
                    );
                  scheduled = d.toISOString();
                }
                const saved = await save();
                const result = await api<{ queued: number }>({
                  action: "queue",
                  id: saved.id,
                  revision: saved.revision,
                  contact_ids: recipients.map((c) => c.id),
                  scheduled_at: scheduled,
                });
                toast.success(
                  `${result.queued} destinataires mis en file d’envoi`,
                );
                setConfirm(false);
                await openCampaign(saved.id);
                await refresh();
              })
            }
          >
            {busy
              ? "Enregistrement…"
              : when
                ? "Confirmer la programmation"
                : "Confirmer l’envoi"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
