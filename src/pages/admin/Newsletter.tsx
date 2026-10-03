import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Code2,
  Download,
  FileInput,
  LayoutDashboard,
  Loader2,
  Mail,
  Monitor,
  Paintbrush,
  Plus,
  RefreshCw,
  Send,
  Smartphone,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { newsletterApi as api } from "@/features/newsletter/api";
import {
  type Campaign,
  type Category,
  type Contact,
  CONTACT_CATEGORIES,
  type ContactKind,
  filterContacts,
  type ImportRow,
  parseContactCsv,
  STATUS_LABELS,
} from "@/features/newsletter/model";
import { NEWSLETTER_TEMPLATES } from "@/features/newsletter/templates";

import NewsletterTracking from "@/features/newsletter/Tracking";
import NewsletterForms from "@/features/newsletter/Forms";
const VisualEditor = lazy(
  () => import("@/features/newsletter/editor/VisualEditor"),
);

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const tz = "Europe/Zurich";
const dateLabel = (value: string | null) =>
  value ? formatInTimeZone(value, tz, "dd.MM.yyyy à HH:mm") : "";
const initial = { name: "", subject: "", preheader: "", html: "" };
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
                v ? [...value, k as Category] : value.filter((c) =>
                  c !== k
                ),
              )}
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
  const [tab, setTab] = useState("dashboard");
  const [step, setStep] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [campaignQuery, setCampaignQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [connection, setConnection] = useState<{
    ready: boolean;
    sender?: string;
    message: string;
  }>({ ready: false, message: "Vérification de la connexion Infomaniak…" });
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
  const [automaticImport, setAutomaticImport] = useState(true);
  const [answers, setAnswers] = useState<unknown>(null);
  const [answersOpen, setAnswersOpen] = useState(false);
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
    const csp =
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'; font-src https:; base-uri 'none'; form-action 'none'">`;
    return safe.replace(/<head>/i, `<head>${csp}`);
  }, [draft.html]);
  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      const [c, n, health] = await Promise.all([
        api<{ contacts: Contact[] }>({ action: "contacts" }),
        api<{ campaigns: Campaign[] }>({ action: "list" }),
        api<{ ready: boolean; sender?: string; message: string }>({
          action: "connection",
        }).catch((e: Error) => ({ ready: false, message: e.message })),
      ]);
      setContacts(c.contacts);
      setCampaigns(n.campaigns);
      setConnection(health);
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
    setDirty(true);
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
    setDraft({
      name: saved.name,
      subject: saved.subject,
      preheader: saved.preheader || "",
      html: saved.html,
    });
    setDirty(false);
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
      setStep(0);
      setDirty(false);
      setDraft({
        name: data.campaign.name,
        subject: data.campaign.subject,
        html: data.campaign.html,
        preheader: data.campaign.preheader || "",
      });
      setCounts(data.counts);
      setIssues(data.issues);
      setWhen("");
      setSelected(new Set());
      setTab("create");
    });
  }
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function newCampaign() {
    if (
      dirty &&
      !window.confirm(
        "Créer une nouvelle campagne sans enregistrer le brouillon actuel ?",
      )
    ) {
      return;
    }
    setCampaign(null);
    setDraft(initial);
    setCounts({});
    setIssues([]);
    setWhen("");
    setSelected(new Set());
    setStep(0);
    setDirty(false);
    setTab("create");
  }
  function openImport(source: "csv" | "application") {
    setImportSource(source);
    setAutomaticImport(true);
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
      category in CONTACT_CATEGORIES ? (category as Category) : "renter",
    ]);
    setImportOpen(true);
    if (source === "application") {
      void run(async () => {
        const data = await api<{ clients: ImportRow[] }>({ action: "clients" });
        setImportRows(data.clients);
        setImportInfo(
          "Sélectionnez les clients à ajouter dans la catégorie choisie.",
        );
      });
    }
  }
  async function readCsv(file?: File) {
    if (!file) return;
    setImportRows([]);
    setImportInfo("");
    setImportSelection(new Set());
    try {
      if (file.size > 20_000_000) {
        throw new Error("Le CSV doit peser moins de 20 Mo");
      }
      const parsed = parseContactCsv(await file.text());
      setImportRows(parsed.rows);
      setImportSelection(new Set(parsed.rows.map((r) => r.email)));
      setImportInfo(
        `${parsed.rows.length} adresses valides · ${parsed.duplicates} doublons retirés${
          parsed.invalid.length
            ? ` · ${parsed.invalid.length} lignes ignorées (email invalide) : ${
              parsed.invalid.slice(0, 12).join(", ")
            }`
            : ""
        }`,
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
          <option value="unclassified">À classer</option>
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
            setSelected(new Set([...selected, ...eligible.map((c) => c.id)]))}
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
                        if (checked) {
                          next.add(c.id);
                        } else next.delete(c.id);
                        return next;
                      })}
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
                    {c.categories.map((v) =>
                      CONTACT_CATEGORIES[v]
                    ).join(" · ") || "À classer"}
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
                    onClick={() =>
                      setEditContact({ ...c })}
                  >
                    Classer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        setAnswers(null);
                        const data = await api({
                          action: "contact-answers",
                          id: c.id,
                        });
                        setAnswers(data);
                        setAnswersOpen(true);
                      })}
                  >
                    Réponses au formulaire
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
    <div className="mx-auto max-w-[1600px] p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-[#205a43]">
            Logisorama · Communication
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Newsletter</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez, partagez et suivez vos campagnes immobilières.
          </p>
        </div>
        <Button disabled={busy} onClick={newCampaign}>
          <Plus className="mr-2 h-4 w-4" />
          Créer une campagne
        </Button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav
          aria-label="Navigation Newsletter"
          className="flex gap-1 overflow-auto rounded-xl border bg-white p-2 lg:sticky lg:top-5 lg:flex-col"
        >
          {[
            {
              id: "dashboard",
              label: "Tableau de bord",
              icon: LayoutDashboard,
            },
            { id: "history", label: "Campagnes", icon: Mail },
            { id: "tracking", label: "Suivi & statistiques", icon: Activity },
            { id: "contacts", label: "Abonnés", icon: Users },
            { id: "forms", label: "Formulaires", icon: FileInput },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={tab === id || (id === "history" && tab === "create")
                ? "page"
                : undefined}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-left text-sm ${
                tab === id || (id === "history" && tab === "create")
                  ? "bg-[#e8efe9] font-semibold text-[#205a43]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
          <div className="mt-4 hidden border-t px-4 pt-4 text-xs text-muted-foreground lg:block">
            logisorama.ch
            <br />
            Envois via Infomaniak
          </div>
        </nav>
        <div className="min-w-0 space-y-5">
          <div
            role="status"
            className={`rounded-xl border p-4 text-sm ${
              connection.ready
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-950"
            }`}
          >
            <p className="font-medium">{connection.message}</p>
            {connection.sender && (
              <p>Expéditeur : Logisorama &lt;{connection.sender}&gt;</p>
            )}
          </div>
          {loadError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive p-4"
            >
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
            <div className="flex justify-end">
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
            <TabsContent value="tracking">{tab === "tracking" && <NewsletterTracking />}</TabsContent>
            <TabsContent value="dashboard" className="space-y-6">
              <div className="flex flex-wrap justify-between gap-3"><h2 className="text-2xl font-semibold">Tableau de bord</h2><Button variant="outline" onClick={()=>setTab("tracking")}><Activity size={16} className="mr-2"/>Suivi des emails et notifications</Button></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  [
                    "Abonnés disponibles",
                    contacts.filter((c) => !c.excluded && !c.unsubscribed)
                      .length,
                  ],
                  [
                    "Brouillons",
                    campaigns.filter((c) => c.status === "draft").length,
                  ],
                  [
                    "En attente / en cours",
                    campaigns.filter((c) => c.status === "queued").length,
                  ],
                  [
                    "Traitements terminés",
                    campaigns.filter((c) => c.status === "completed").length,
                  ],
                ].map(([label, n]) => (
                  <Card key={String(label)}>
                    <CardContent className="pt-5">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="mt-2 text-3xl font-semibold">
                        {loading ? "—" : n}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <section className="rounded-2xl bg-[#1c4734] p-7 text-white">
                <p className="text-xs uppercase tracking-widest text-[#dbdec9]">
                  De l’idée à l’envoi
                </p>
                <h3 className="mt-3 text-2xl font-semibold">
                  Une newsletter à votre image.
                </h3>
                <p className="mt-2 max-w-xl text-sm text-white/80">
                  Choisissez un modèle, composez votre message avec l’éditeur
                  visuel, sélectionnez vos abonnés et programmez votre campagne.
                </p>
                <Button
                  variant="secondary"
                  className="mt-5"
                  onClick={newCampaign}
                >
                  Créer ma campagne
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </section>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Développer votre audience</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Importez vos listes CSV en choisissant leur catégorie
                      avant l’import.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTab("contacts");
                        openImport("csv");
                      }}
                    >
                      Importer des abonnés
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Collecter des inscriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Un formulaire adapté à chaque projet, avec confirmation de
                      l’adresse email.
                    </p>
                    <Button variant="outline" onClick={() => setTab("forms")}>
                      Gérer les formulaires
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <p className="text-xs text-muted-foreground">
                Les chiffres portent sur les campagnes créées dans Logisorama
                (100 dernières). Retrouvez les ouvertures, clics et notifications
                dans « Suivi & statistiques ».
              </p>
            </TabsContent>
            <TabsContent value="forms">
              <NewsletterForms onContactsChanged={() => void refresh()} />
            </TabsContent>
            <TabsContent value="contacts" className="space-y-4">
              <h2 className="text-2xl font-semibold">Abonnés</h2>
              <p className="text-sm text-muted-foreground">
                Clients et prospects, organisés selon leur projet immobilier et leurs inscriptions aux visites.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Object.entries(CONTACT_CATEGORIES).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => {
                      setCategory(k);
                      setImportCategories([k as Category]);
                    }}
                    className={`rounded-xl border p-4 text-left ${
                      category === k
                        ? "border-[#205a43] bg-[#eef3ee]"
                        : "bg-white"
                    }`}
                  >
                    <strong className="block text-2xl text-[#205a43]">
                      {contacts.filter((c) =>
                        c.categories.includes(k as Category)
                      ).length}
                    </strong>
                    <span className="text-xs">{v}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api({ action: "sync-leads" });
                      await refresh();
                      toast.success(
                        "Shortlist, Meta et visites synchronisés. Les nouveaux contacts sont ajoutés automatiquement.",
                      );
                    })}
                >
                  Synchroniser Shortlist, Meta et visites
                </Button>
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
                    )}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Modèle CSV
                </Button>
              </div>
              {selectionPanel}
            </TabsContent>
            <TabsContent value="create" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Campagnes / {campaign?.name || "Nouvelle campagne"}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    {locked ? "Suivi de la campagne" : "Créer une campagne"}
                  </h2>
                </div>
                {!locked && (
                  <Button
                    variant="outline"
                    disabled={busy || !draft.html || !draft.name ||
                      !draft.subject}
                    onClick={() =>
                      void run(async () => {
                        await save();
                        await refresh();
                        toast.success("Brouillon enregistré");
                      })}
                  >
                    {busy
                      ? "Enregistrement…"
                      : dirty || !campaign
                      ? "Enregistrer le brouillon"
                      : "Brouillon enregistré"}
                  </Button>
                )}
              </div>
              {!locked && (
                <nav
                  aria-label="Étapes de création"
                  className="grid grid-cols-5 gap-2"
                >
                  {[
                    "Détails",
                    "Contenu",
                    "Destinataires",
                    "Réviser",
                    "Planifier",
                  ].map((label, i) => (
                    <button
                      key={label}
                      onClick={() => setStep(i)}
                      className={`border-b-4 pb-3 text-xs sm:text-sm ${
                        step === i
                          ? "border-[#205a43] font-semibold text-[#205a43]"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >
                      {i + 1}. {label}
                    </button>
                  ))}
                </nav>
              )}

              {locked && (
                <Card>
                  <CardContent className="space-y-3 pt-6">
                    <p className="font-medium">
                      {STATUS_LABELS[campaign.status]}{" "}
                      {dateLabel(campaign.scheduled_at)} · heure suisse
                    </p>
                    {campaign.provider_campaign_id &&
                      campaign.provider_domain_id && (
                      <a
                        className="text-sm underline"
                        href={`https://newsletter.infomaniak.com/v3/${campaign.provider_domain_id}/campaigns`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Campagne Infomaniak n° {campaign.provider_campaign_id}
                        {" "}
                        — ouvrir le suivi
                      </a>
                    )}
                    {campaign.worker_error && (
                      <p role="alert" className="text-sm text-destructive">
                        {campaign.worker_error}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span>{counts.sent || 0} transmis au prestataire</span>
                      <span>
                        {(counts.pending || 0) + (counts.processing || 0)}{" "}
                        en attente
                      </span>
                      <span>{counts.failed || 0} échecs</span>
                      <span>{counts.skipped || 0} exclus</span>
                      <span>{counts.attention || 0} à vérifier</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      « Transmis » signifie accepté par le prestataire ; ce
                      n’est pas une confirmation de livraison.
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
                              await api({
                                action: "cancel",
                                id: campaign.id,
                              });
                              await openCampaign(campaign.id);
                              await refresh();
                            })}
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

              {!locked && step === 0 && (
                <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Détails de la campagne</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div>
                        <Label htmlFor="newsletter-name">Nom interne</Label>
                        <Input
                          id="newsletter-name"
                          value={draft.name}
                          maxLength={120}
                          onChange={(e) =>
                            changeDraft({ name: e.target.value })}
                          placeholder="Newsletter octobre — Recherche de logement"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newsletter-subject">
                          Objet de l’email
                        </Label>
                        <Input
                          id="newsletter-subject"
                          value={draft.subject}
                          maxLength={200}
                          onChange={(e) =>
                            changeDraft({ subject: e.target.value })}
                          placeholder="Bonjour, vous avez trouvé un appart ?"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newsletter-preheader">
                          Prévisualisation texte email
                        </Label>
                        <Input
                          id="newsletter-preheader"
                          value={draft.preheader}
                          maxLength={200}
                          onChange={(e) =>
                            changeDraft({ preheader: e.target.value })}
                          placeholder="Le texte qui accompagne votre objet dans la boîte de réception."
                        />
                      </div>
                      <div className="rounded-lg bg-muted/40 p-4 text-sm">
                        <strong>Expéditeur</strong>
                        <p className="mt-2">
                          Logisorama &lt;
                          {connection.sender || "support@logisorama.ch"}&gt;
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Langue : français · Lien de désinscription personnel
                          ajouté par Infomaniak.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Dans la boîte de réception</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl bg-[#f5f6f7] p-5">
                        <div className="mb-4 h-8 rounded bg-slate-200/50" />
                        <div className="rounded-lg bg-white p-4 shadow-sm">
                          <strong>Logisorama</strong>
                          <p className="mt-2 font-medium">
                            {draft.subject || "L’objet de votre newsletter"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {draft.preheader ||
                              "La prévisualisation de votre message apparaîtra ici."}
                          </p>
                        </div>
                        <div className="mt-4 h-8 rounded bg-slate-200/50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              {(locked || step === 1 || step === 3) && (
                <div className="grid gap-5 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {step === 3
                          ? "Vérifier votre message"
                          : "Composez votre newsletter"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!locked && step !== 3 && (
                        <>
                          <div className="grid gap-3">
                            {NEWSLETTER_TEMPLATES.map((template) => (
                              <button
                                key={template.id}
                                aria-label={`Utiliser le modèle ${template.name}`}
                                className="overflow-hidden rounded-xl border bg-[#f3f1e9] text-left hover:border-[#205a43]"
                                onClick={() => {
                                  if (
                                    (draft.html || draft.subject || draft.name || draft.preheader) &&
                                    !window.confirm("Remplacer le contenu, le nom, l’objet et le pré-en-tête par ce modèle ?")
                                  ) return;
                                  changeDraft({
                                    html: template.html,
                                    subject: template.subject,
                                    name: template.name,
                                    preheader: template.preheader,
                                  });
                                }}
                              >
                                <img src={template.image} alt="" className="aspect-[3/1] w-full object-cover" loading="lazy" />
                                <span className="block p-4">
                                  <span className="text-xs uppercase tracking-widest text-[#205a43]">{template.audience}</span>
                                  <strong className="mt-1 block text-lg">{template.name}</strong>
                                  <span className="mt-1 block text-sm text-muted-foreground">{template.description}</span>
                                </span>
                              </button>
                            ))}
                            <Button
                              variant="outline"
                              onClick={() => {
                                if (
                                  draft.html &&
                                  !window.confirm(
                                    "Remplacer le contenu actuel par une page blanche ?",
                                  )
                                ) {
                                  return;
                                }
                                changeDraft({
                                  html:
                                    '<html><head></head><body style="background:#f4f1e8"><table role="presentation" width="640" align="center" style="width:100%;max-width:640px;background:#fff"><tr><td style="padding:32px;font-family:Arial;color:#1c4734"><h1>Votre titre</h1><p>Écrivez votre message ici.</p></td></tr></table></body></html>',
                                });
                              }}
                            >
                              Partir d’une page blanche
                            </Button>
                          </div>
                          <Button
                            className="w-full bg-[#205a43]"
                            disabled={!draft.html}
                            onClick={() => setEditorOpen(true)}
                          >
                            <Paintbrush size={17} className="mr-2" />
                            Ouvrir l’éditeur visuel
                          </Button>
                          <p className="text-sm text-muted-foreground">
                            Ajoutez et déplacez des blocs, modifiez les textes,
                            remplacez les images et personnalisez les couleurs.
                          </p>
                          <Button
                            variant="ghost"
                            onClick={() => setShowCode(!showCode)}
                          >
                            <Code2 size={15} className="mr-2" />
                            {showCode
                              ? "Masquer le code"
                              : "Importer ou modifier le HTML"}
                          </Button>
                          {showCode && (
                            <div className="space-y-3">
                              <Label htmlFor="newsletter-html-file">
                                Importer un fichier HTML
                              </Label>
                              <Input
                                id="newsletter-html-file"
                                type="file"
                                accept=".html,.htm,text/html"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    void run(async () => {
                                      if (f.size > 250000) {
                                        throw new Error(
                                          "Fichier HTML limité à 250 Ko",
                                        );
                                      }
                                      changeDraft({ html: await f.text() });
                                    });
                                  }
                                  e.target.value = "";
                                }}
                              />
                              <Label htmlFor="newsletter-html">Code HTML</Label>
                              <Textarea
                                id="newsletter-html"
                                className="min-h-[300px] font-mono text-xs"
                                value={draft.html}
                                onChange={(e) =>
                                  changeDraft({ html: e.target.value })}
                              />
                            </div>
                          )}
                        </>
                      )}
                      {(locked || step === 3) && (
                        <dl className="space-y-3 text-sm">
                          <div>
                            <dt className="text-muted-foreground">Objet</dt>
                            <dd className="font-medium">{draft.subject}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              Prévisualisation texte
                            </dt>
                            <dd>{draft.preheader || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              Expéditeur
                            </dt>
                            <dd>{connection.sender}</dd>
                          </div>
                          {!locked && (
                            <div>
                              <dt className="text-muted-foreground">
                                Destinataires sélectionnés
                              </dt>
                              <dd>{recipients.length} abonnés disponibles</dd>
                            </div>
                          )}
                        </dl>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Infomaniak ajoute automatiquement le lien de
                        désinscription.
                      </p>
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
                        {draft.html
                          ? (
                            <iframe
                              title="Aperçu de la newsletter"
                              sandbox=""
                              referrerPolicy="no-referrer"
                              srcDoc={htmlPreview}
                              className="mx-auto h-[700px] border-0 bg-white"
                              style={{
                                width: mobile ? 375 : 640,
                                maxWidth: "100%",
                              }}
                            />
                          )
                          : (
                            <div className="flex h-[700px] items-center justify-center p-8 text-center text-muted-foreground">
                              Collez votre code HTML ou utilisez le modèle
                              Logisorama pour voir le résultat.
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              {!locked && (
                <>
                  {step === 2 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Vos destinataires</CardTitle>
                      </CardHeader>
                      <CardContent>{selectionPanel}</CardContent>
                    </Card>
                  )}
                  {(step === 3 || step === 4) && (
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          {step === 3
                            ? "Recevoir un test"
                            : "Planifier votre campagne"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {step === 3 && (
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-64 flex-1">
                              <Label htmlFor="newsletter-test">
                                Recevoir un test
                              </Label>
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
                              disabled={busy ||
                                !connection.ready ||
                                !draft.html ||
                                !draft.subject ||
                                !testEmail}
                              onClick={() =>
                                void run(async () => {
                                  await api({
                                    action: "test",
                                    email: testEmail,
                                    subject: draft.subject,
                                    preheader: draft.preheader,
                                    html: draft.html,
                                    request_id: testKey.current,
                                  });
                                  testKey.current = crypto.randomUUID();
                                  toast.success("Test transmis à Infomaniak");
                                })}
                            >
                              Envoyer un test
                            </Button>
                          </div>
                        )}
                        {step === 4 && (
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
                                Vide = dès validation. Les envois démarrent à
                                partir de l’heure choisie et se poursuivent même
                                si vous fermez l’application.
                              </p>
                            </div>
                            <Button
                              className="bg-[#205a43] hover:bg-[#1c4734]"
                              disabled={busy ||
                                loading ||
                                !!loadError ||
                                !connection.ready ||
                                !recipients.length ||
                                !draft.name ||
                                !draft.subject ||
                                !draft.html}
                              onClick={() => setConfirm(true)}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              {when ? "Programmer" : "Envoyer"} à{" "}
                              {recipients.length} contacts
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  <div className="flex justify-between border-t pt-5">
                    <Button
                      variant="ghost"
                      disabled={step === 0}
                      onClick={() => setStep(step - 1)}
                    >
                      <ArrowLeft size={16} className="mr-2" />
                      Précédent
                    </Button>
                    {step < 4 && (
                      <Button
                        disabled={(step === 0 &&
                          (!draft.name || !draft.subject)) ||
                          (step === 1 && !draft.html) ||
                          (step === 2 && !recipients.length)}
                        onClick={() => setStep(step + 1)}
                      >
                        Continuer
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Campagnes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <Input
                      aria-label="Rechercher une campagne"
                      className="max-w-xs"
                      placeholder="Rechercher une campagne…"
                      value={campaignQuery}
                      onChange={(e) => setCampaignQuery(e.target.value)}
                    />
                    <select
                      aria-label="Statut des campagnes"
                      className={selectClass + " max-w-xs"}
                      value={campaignFilter}
                      onChange={(e) => setCampaignFilter(e.target.value)}
                    >
                      <option value="all">Toutes les campagnes</option>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!campaigns.length && (
                    <p className="text-muted-foreground">
                      Vos brouillons et envois apparaîtront ici.
                    </p>
                  )}
                  {campaigns
                    .filter(
                      (c) =>
                        (campaignFilter === "all" ||
                          c.status === campaignFilter) &&
                        `${c.name} ${c.subject}`
                          .toLowerCase()
                          .includes(campaignQuery.toLowerCase()),
                    )
                    .map((c) => (
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
                          <Badge variant="secondary">
                            {STATUS_LABELS[c.status]}
                          </Badge>
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
        </div>
      </div>
      {editorOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[100] grid place-items-center bg-white">
              Chargement de l’éditeur…
            </div>
          }
        >
          <VisualEditor
            html={draft.html}
            onClose={() => setEditorOpen(false)}
            onApply={(html) => {
              changeDraft({ html });
              setEditorOpen(false);
              toast.success(
                "Contenu appliqué. Enregistrez le brouillon pour le conserver.",
              );
            }}
          />
        </Suspense>
      )}
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
              Le classement automatique utilise les réponses et le formulaire.
              Les projets incertains restent à classer ; les activités Immo-rama
              hors périmètre sont ignorées. Les doublons sont fusionnés ; les
              exclusions et désinscriptions sont conservées.
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
          <label className="flex items-center gap-2">
            <Checkbox
              checked={automaticImport}
              onCheckedChange={(v) => setAutomaticImport(!!v)}
            />Classer automatiquement selon le projet
          </label>
          {!automaticImport && (
            <CategoryPicker
              value={importCategories}
              onChange={setImportCategories}
            />
          )}
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
                  )}
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
                        })}
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
            disabled={busy || !importSelection.size ||
              (!automaticImport && !importCategories.length)}
            onClick={() =>
              void run(async () => {
                const rows = importRows.filter((r) =>
                  importSelection.has(r.email)
                );
                let imported = 0;
                let skipped = 0;
                for (let i = 0; i < rows.length; i += 1000) {
                  const result = await api<
                    { imported: number; out_of_scope?: number }
                  >({
                    action: "import",
                    automatic: automaticImport,
                    rows: rows.slice(i, i + 1000),
                    kind: importKind,
                    categories: importCategories,
                    source: importSource,
                  });
                  imported += result.imported;
                  skipped += result.out_of_scope || 0;
                }
                toast.success(
                  `${imported} contacts importés ou mis à jour${
                    skipped ? ` · ${skipped} hors périmètre` : ""
                  }`,
                );
                setImportOpen(false);
                await refresh();
              })}
          >
            {busy
              ? "Import en cours…"
              : `Importer les ${importSelection.size} contacts sélectionnés`}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={answersOpen} onOpenChange={setAnswersOpen}>
        <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Réponses aux formulaires</DialogTitle>
            <DialogDescription>
              Réponses d’origine, regroupées par source.
            </DialogDescription>
          </DialogHeader>
          <FormAnswerTree value={answers} />
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
                  })}
              >
                <option value="client">Client</option>
                <option value="prospect">Prospect</option>
              </select>
              <CategoryPicker
                value={editContact.categories}
                onChange={(v) =>
                  setEditContact({ ...editContact, categories: v })}
              />
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={editContact.excluded}
                  onCheckedChange={(v) =>
                    setEditContact({ ...editContact, excluded: !!v })}
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
                  })}
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
            {recipients.length} contacts sélectionnés · {when
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
                  ) {
                    throw new Error(
                      "Choisissez une date entre une minute et 30 jours dans le futur",
                    );
                  }
                  if (formatInTimeZone(d, tz, "yyyy-MM-dd'T'HH:mm") !== when) {
                    throw new Error(
                      "Cette heure n’existe pas lors du changement d’heure",
                    );
                  }
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
              })}
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

function FormAnswerTree({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "object") {
    return (
      <span className="whitespace-pre-wrap break-words">{String(value)}</span>
    );
  }
  const labels: Record<string, string> = {
    shortlist: "Shortlist",
    meta: "Meta Ads",
    imports: "Imports et inscriptions",
    visites: "Inscriptions aux visites",
    form_name: "Formulaire",
    formulaire: "Formulaire",
    raw_answers: "Réponses",
    raw_meta_payload: "Données du formulaire",
    answers: "Réponses",
    source: "Source",
    field_data: "Questions",
    name: "Question",
    values: "Réponse",
  };
  const entries = Object.entries(value).filter(([, v]) =>
    v !== null && v !== "" && !(Array.isArray(v) && !v.length)
  );
  if (!entries.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune réponse enregistrée.
      </p>
    );
  }
  return (
    <dl className="space-y-3">
      {entries.map(([key, item]) => (
        <div key={key} className="rounded-lg border p-3">
          {!/^\d+$/.test(key) && (
            <dt className="mb-1 text-sm font-semibold">
              {labels[key] || key.replace(/_/g, " ")}
            </dt>
          )}
          <dd className="text-sm">
            <FormAnswerTree value={item} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
