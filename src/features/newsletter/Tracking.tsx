import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  CheckCheck,
  Clock3,
  Eye,
  Mail,
  MousePointer2,
  RefreshCw,
  Search,
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { newsletterApi as api } from "@/features/newsletter/api";
import {
  elapsed,
  rate,
  type TrackingEvent,
  type TrackingRow,
  trackingStatus,
} from "./tracking-model";

type Report = {
  rows: TrackingRow[];
  summary: Record<string, number>;
  campaigns: string[];
  health: {
    receipts_configured: boolean;
    system: {
      id: string;
      last_synced_at: string | null;
      error: string | null;
      more: boolean;
    }[];
    campaigns: {
      id: string;
      name: string;
      tracking_error: string | null;
      tracking_synced_at: string | null;
    }[];
  };
};
const dates = (date: string | null) =>
  date
    ? formatInTimeZone(date, "Europe/Zurich", "dd.MM.yyyy · HH:mm:ss")
    : "Non disponible";
const channels = {
  email: "Email",
  newsletter: "Newsletter",
  notification: "Notification",
};
const eventNames: Record<string, string> = {
  opened: "Ouverture détectée",
  clicked: "Clic détecté",
  read: "Notification marquée lue",
  delivered: "Reçu par le serveur destinataire",
  bounced: "Email rejeté",
  complained: "Signalement comme spam",
  unsubscribed: "Désinscription",
  delayed: "Distribution retardée",
  failed: "Échec de distribution",
};
const selectStyle = "h-10 min-w-0 rounded-md border bg-white px-3 text-sm";
export default function NewsletterTracking() {
  const [filters, setFilters] = useState({
    days: 30,
    channel: "",
    status: "",
    campaign: "",
    search: "",
    page: 0,
  });
  const [search, setSearch] = useState("");
  const [receiptSecret, setReceiptSecret] = useState("");
  const [report, setReport] = useState<Report | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [detail, setDetail] = useState<
      { row: TrackingRow; events: TrackingEvent[]; event_count: number } | null
    >(null),
    [detailOpen, setDetailOpen] = useState(false),
    [detailError, setDetailError] = useState("");
  const request = useRef(0), detailRequest = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setError("");
    try {
      const data = await api<Report>({ action: "tracking-report", ...filters });
      if (version === request.current) setReport(data);
    } catch (e) {
      if (version === request.current) {
        setError(e instanceof Error ? e.message : "Chargement indisponible");
      }
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    const timer = setTimeout(
      () => setFilters((f) => ({ ...f, search, page: 0 })),
      300,
    );
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60000);
    return () => {
      clearInterval(interval);
      request.current++;
    };
  }, [refresh]);
  async function sync() {
    setBusy(true);
    setNotice("");
    try {
      const result = await api<
        Record<string, { error?: string; more?: boolean }>
      >({ action: "tracking-sync" });
      const errors = Object.values(result).flatMap((r) =>
        r.error ? [r.error] : []
      );
      setNotice(
        errors.length
          ? errors.join(" · ")
          : "Statistiques actualisées. Les historiques volumineux sont synchronisés progressivement.",
      );
      await refresh();
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Synchronisation indisponible",
      );
    } finally {
      setBusy(false);
    }
  }
  async function open(row: TrackingRow) {
    const version = ++detailRequest.current;
    setDetail(null);
    setDetailError("");
    setDetailOpen(true);
    try {
      const data = await api<
        { row: TrackingRow; events: TrackingEvent[]; event_count: number }
      >({ action: "tracking-detail", id: row.id });
      if (version === detailRequest.current) setDetail(data);
    } catch (e) {
      if (version === detailRequest.current) {
        setDetailError(e instanceof Error ? e.message : "Détail indisponible");
      }
    }
  }
  async function connect() {
    setBusy(true);
    try {
      const r = await api<{ message: string }>({ action: "tracking-connect" });
      setNotice(r.message);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Connexion indisponible");
    } finally {
      setBusy(false);
    }
  }
  async function saveReceiptSecret() {
    setBusy(true);
    try {
      const result = await api<{ message: string }>({
        action: "tracking-secret",
        secret: receiptSecret,
      });
      setReceiptSecret("");
      setNotice(result.message);
      await refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Raccordement indisponible");
    } finally {
      setBusy(false);
    }
  }
  const s = report?.summary;
  const filter = (key: string, value: string | number) =>
    setFilters((f) => ({ ...f, [key]: value, page: 0 }));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#205a43]">
            Chaque échange, au même endroit
          </p>
          <h2 className="text-2xl font-semibold">Suivi & statistiques</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Emails, campagnes et notifications · horaires suisses
          </p>
        </div>
        <Button variant="outline" disabled={busy || loading} onClick={sync}>
          <RefreshCw
            size={16}
            className={`mr-2 ${busy ? "animate-spin" : ""}`}
          />Synchroniser les statistiques
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["sent", "Envoyés", Mail],
          ["delivered", "Réceptions confirmées", CheckCheck],
          ["opened", "Messages ouverts", Eye],
          ["clicked", "Messages cliqués", MousePointer2],
          ["read", "Notifications marquées lues", Bell],
          ["failed", "Échecs / rejets", Activity],
        ].map(([key, label, Icon]) => {
          const I = Icon as typeof Mail;
          return (
            <Card key={String(key)}>
              <CardContent className="flex items-center justify-between gap-2 p-5">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {String(label)}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">
                    {s ? s[String(key)] : "—"}
                  </p>
                </div>
                <I className="h-5 w-5 text-[#205a43]" />
              </CardContent>
            </Card>
          );
        })}
        <Card className="border-[#d4ded5] bg-[#f3f4ed] sm:col-span-2">
          <CardContent className="flex flex-wrap gap-x-10 gap-y-3 p-5">
            <div>
              <p className="text-xs text-muted-foreground">Taux d’ouverture</p>
              <p className="mt-2 text-2xl font-semibold">
                {s ? rate(s.opened_emails, s.tracked_emails) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taux de clic</p>
              <p className="mt-2 text-2xl font-semibold">
                {s ? rate(s.clicked_emails, s.tracked_emails) : "—"}
              </p>
            </div>
            <p className="w-full text-xs text-muted-foreground">
              Sur {s?.tracked_emails ?? "—"}{" "}
              emails envoyés avec suivi activé, dans la sélection.
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="rounded-xl border bg-white p-4 text-sm leading-relaxed text-slate-600">
        <strong className="text-slate-900">
          Des indicateurs précis, sans confondre ouverture et lecture.
        </strong>{" "}
        Une ouverture correspond au chargement de l’image de suivi et peut
        provenir d’une protection automatique. « Reçu » confirme l’acceptation
        par le serveur email. Le temps de lecture et la réception d’un push sur
        un appareil ne sont pas mesurables ici. Les délais affichés relient des
        événements horodatés.
      </div>
      {report && !report.health.receipts_configured && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <span>
            Les accusés de réception Resend ne sont pas encore raccordés. Les
            envois, ouvertures et clics restent suivis.
          </span>
          <Button variant="outline" size="sm" disabled={busy} onClick={connect}>
            Raccorder les accusés de réception
          </Button>
        </div>
      )}
      {report && !report.health.receipts_configured && (
        <details className="rounded-lg border p-4 text-sm">
          <summary className="cursor-pointer font-medium">
            Raccordement manuel depuis Resend
          </summary>
          <p className="my-3 text-muted-foreground">
            Si votre clé autorise seulement l’envoi, créez le webhook dans
            Resend puis enregistrez ici son secret de signature. Il sera
            conservé dans le coffre sécurisé.
          </p>
          <label htmlFor="receipt-secret" className="mb-2 block">
            Secret de signature du webhook Resend
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="receipt-secret"
              type="password"
              autoComplete="off"
              value={receiptSecret}
              onChange={(e) => setReceiptSecret(e.target.value)}
              placeholder="whsec_…"
              className="min-w-0 flex-1"
            />
            <Button
              disabled={busy || !receiptSecret.trim()}
              onClick={saveReceiptSecret}
            >
              Enregistrer le raccordement
            </Button>
          </div>
        </details>
      )}
      {report?.health.system.filter((x) => x.error).map((x) => (
        <p role="status" key={x.id} className="text-sm text-amber-800">
          {x.error}
        </p>
      ))}
      {report?.health.campaigns.filter((x) => x.tracking_error).map((x) => (
        <p role="status" key={x.id} className="text-sm text-amber-800">
          {x.name} : {x.tracking_error}
        </p>
      ))}
      {notice && (
        <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm">
          {notice}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            aria-label="Rechercher un contact ou objet"
            placeholder="Email du contact ou objet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          aria-label="Période"
          className={selectStyle}
          value={filters.days}
          onChange={(e) => filter("days", Number(e.target.value))}
        >
          {[
            [7, "7 derniers jours"],
            [30, "30 derniers jours"],
            [90, "90 derniers jours"],
            [365, "12 derniers mois"],
            [3660, "Tout l’historique"],
          ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select
          aria-label="Canal"
          className={selectStyle}
          value={filters.channel}
          onChange={(e) => filter("channel", e.target.value)}
        >
          <option value="">Tous les canaux</option>
          {Object.entries(channels).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          aria-label="Événement"
          className={selectStyle}
          value={filters.status}
          onChange={(e) => filter("status", e.target.value)}
        >
          {[
            ["", "Tous les événements"],
            ["sent", "Envoyés"],
            ["delivered", "Réception confirmée"],
            ["opened", "Ouverts"],
            ["clicked", "Cliqués"],
            ["read", "Marquées lues"],
            ["failed", "Échecs / rejets"],
            ["bounced", "Rejetés"],
            ["untracked", "Suivi non activé"],
          ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select
          aria-label="Campagne ou type"
          className={selectStyle}
          value={filters.campaign}
          onChange={(e) => filter("campaign", e.target.value)}
        >
          <option value="">Toutes les campagnes / types</option>
          {report?.campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {error
        ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 p-4 text-sm"
          >
            {error}
            <Button variant="ghost" onClick={refresh}>Réessayer</Button>
          </div>
        )
        : (
          <div
            className="overflow-hidden rounded-xl border bg-white"
            aria-busy={loading}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="font-medium">Journal des communications</h3>
              <span className="text-xs text-muted-foreground">
                {loading ? "Actualisation…" : `${s?.total ?? 0} résultats`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {[
                      "Destinataire / objet",
                      "Canal / statut",
                      "Envoi / création",
                      "Réception",
                      "Ouvertures",
                      "Clics",
                      "",
                    ].map((h, i) => (
                      <th key={i} className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report?.rows.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-[#f8faf7]">
                      <td className="max-w-[270px] px-4 py-4">
                        <p
                          className="truncate font-medium"
                          title={row.recipient}
                        >
                          {row.recipient}
                        </p>
                        <p
                          className="mt-1 truncate text-xs text-slate-500"
                          title={row.subject}
                        >
                          {row.subject}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="mb-1 text-xs text-muted-foreground">
                          {channels[row.channel]}
                        </p>
                        <Badge
                          variant="outline"
                          className="whitespace-nowrap font-normal"
                        >
                          {trackingStatus(row)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-xs">
                        {dates(row.sent_at || row.created_at)}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        {row.channel === "notification"
                          ? "Dans l’application"
                          : row.delivered_at
                          ? dates(row.delivered_at)
                          : "Non confirmée"}
                      </td>
                      <td className="px-4 py-4 tabular-nums">
                        {row.channel === "notification"
                          ? "—"
                          : row.opens_count ?? "Non mesuré"}
                      </td>
                      <td className="px-4 py-4 tabular-nums">
                        {row.clicks_count ?? "Non mesuré"}
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void open(row)}
                          aria-label={`Voir le suivi de ${row.recipient}`}
                        >
                          Détail<ArrowRight size={14} className="ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && !report?.rows.length && (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Aucune communication ne correspond à ces filtres.
              </p>
            )}
            <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 0 || loading}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                Précédent
              </Button>
              <span>
                Page {filters.page + 1} /{" "}
                {Math.max(1, Math.ceil((s?.total || 0) / 50))}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || (filters.page + 1) * 50 >= (s?.total || 0)}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      <p className="text-xs text-muted-foreground">
        Journal actualisé toutes les minutes. Rapports fournisseurs synchronisés
        toutes les 10 minutes. Les données historiques ne permettent pas de
        reconstituer les interactions qui n’étaient pas suivies.
      </p>
      <Dialog
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) detailRequest.current++;
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historique du message</DialogTitle>
            <DialogDescription>
              {detail?.row.recipient || "Chargement du suivi…"}
            </DialogDescription>
          </DialogHeader>
          {detailError ? <p role="alert">{detailError}</p> : detail
            ? (
              <>
                <div className="rounded-xl bg-[#f3f4ed] p-4">
                  <h3 className="font-semibold">{detail.row.subject}</h3>
                  <p className="mt-2 text-xs text-slate-500">
                    {channels[detail.row.channel]} · {detail.row.provider} ·
                    {" "}
                    {trackingStatus(detail.row)}
                  </p>
                </div>
                {detail.row.tracking_note && (
                  <p className="text-sm text-amber-800">
                    {detail.row.tracking_note}
                  </p>
                )}
                {detail.row.error && (
                  <p role="alert" className="text-sm text-red-700">
                    {detail.row.error}
                  </p>
                )}
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ["Créé", dates(detail.row.created_at)],
                    ["Envoyé", dates(detail.row.sent_at)],
                    ["Réception confirmée", dates(detail.row.delivered_at)],
                    ["Première ouverture", dates(detail.row.opened_at)],
                    ["Dernière ouverture", dates(detail.row.last_opened_at)],
                    ["Premier clic", dates(detail.row.clicked_at)],
                    ["Dernier clic", dates(detail.row.last_clicked_at)],
                    ["Marquée lue", dates(detail.row.read_at)],
                    [
                      "Délai avant ouverture",
                      elapsed(detail.row.sent_at, detail.row.opened_at),
                    ],
                    [
                      "Délai avant clic",
                      elapsed(
                        detail.row.sent_at || detail.row.created_at,
                        detail.row.clicked_at,
                      ),
                    ],
                    [
                      "Délai avant lecture (application)",
                      elapsed(detail.row.created_at, detail.row.read_at),
                    ],
                    ["Dernière synchronisation", dates(detail.row.synced_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="border-t pt-4">
                  <h3 className="mb-4 flex items-center gap-2 font-medium">
                    <Clock3 size={16} />Chronologie des interactions
                  </h3>
                  {!detail.events.length
                    ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun événement détaillé enregistré. Les éventuels
                        totaux historiques restent affichés dans le journal.
                      </p>
                    )
                    : (
                      <ol className="ml-2 space-y-4 border-l pl-5">
                        {detail.events.map((e) => (
                          <li key={e.id}>
                            <p className="text-sm font-medium">
                              {eventNames[e.event_type] || e.event_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {dates(e.occurred_at)}
                              {e.time_basis === "observed"
                                ? " · constaté à la synchronisation, heure exacte inconnue"
                                : ""}
                            </p>
                            {e.url && (
                              <p className="mt-1 break-all text-xs text-[#205a43]">
                                {e.url}
                              </p>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  {detail.event_count > 200 && (
                    <p className="mt-3 text-xs">
                      200 derniers événements affichés sur {detail.event_count}.
                    </p>
                  )}
                </div>
              </>
            )
            : <p className="py-8 text-center text-sm">Chargement…</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
