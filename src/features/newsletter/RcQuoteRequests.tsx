import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, RefreshCw, ExternalLink } from "lucide-react";
import { rcDb, RC_STATUSES, type RcRequest, type RcStatus } from "./rc-api";

export default function RcQuoteRequests() {
  const [rows, setRows] = useState<RcRequest[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  async function refresh() {
    setBusy(true); setError("");
    const result = await rcDb.from("rc_quote_requests").select("id,user_id,first_name,last_name,current_address,email,phone,insured_people,birth_date,nationality,status,created_at,consent_at").order("created_at", { ascending: false }).limit(500);
    if (result.error) setError("Impossible de charger les demandes RC. Réessayez.");
    else setRows((result.data || []) as RcRequest[]);
    setBusy(false);
  }
  useEffect(() => { void refresh(); }, []);
  async function changeStatus(id: string, status: RcStatus) {
    setBusy(true); setError("");
    const result = await rcDb.rpc("admin_set_rc_quote_status", { p_id: id, p_status: status });
    if (result.error) { setError("Le statut n’a pas pu être enregistré. Une autre demande peut être en cours pour ce compte."); setBusy(false); }
    else await refresh();
  }
  return <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5" aria-label="Demandes d’offre RC">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="text-blue-500" /> Demandes d’offre RC <span className="text-sm text-muted-foreground">{rows.filter(r => r.status === "new").length} à traiter</span></h2><p className="mt-1 text-sm text-muted-foreground">Formulaire « Dossier béton » · clients, candidats et prospects · plus récentes en premier.</p></div><div className="flex gap-3"><Link to="/offre-rc" target="_blank" className="flex items-center gap-1 text-sm text-blue-700 underline">Voir le formulaire <ExternalLink size={14} /></Link><button aria-label="Actualiser les demandes RC" disabled={busy} onClick={() => void refresh()}><RefreshCw size={18} /></button></div></div>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    <label className="my-4 flex items-center gap-3 text-sm">Statut<select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border bg-background p-2"><option value="all">Tous</option>{Object.entries(RC_STATUSES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {busy && <p role="status" className="text-sm">Chargement…</p>}
    {!busy && !error && !rows.some(r => filter === "all" || r.status === filter) && <p className="rounded-xl bg-white p-4 text-sm text-slate-500">Aucune demande pour ce filtre.</p>}
    <div className="space-y-3">{rows.filter(r => filter === "all" || r.status === filter).map(r => <details key={r.id} className="rounded-xl border bg-background p-4"><summary className="cursor-pointer text-sm"><strong>{r.first_name} {r.last_name}</strong> · {r.email} · {RC_STATUSES[r.status]}<span className="ml-3 text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-CH", { timeZone: "Europe/Zurich" })}</span></summary><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{[["Origine",r.user_id ? "Compte Logisorama" : "Prospect sans compte"],["Adresse actuelle",r.current_address],["Email",r.email],["Téléphone",r.phone],["Personnes à assurer",String(r.insured_people)],["Date de naissance",r.birth_date.split("-").reverse().join(".")],["Nationalité",r.nationality],["Demande et contact acceptés le",new Date(r.consent_at).toLocaleString("fr-CH", { timeZone: "Europe/Zurich" })]].map(([k,v]) => <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="break-words font-medium">{v}</dd></div>)}</dl><label className="mt-4 flex gap-3 text-sm">Suivi<select aria-label={`Statut de ${r.first_name} ${r.last_name}`} disabled={busy} value={r.status} onChange={e => void changeStatus(r.id, e.target.value as RcStatus)} className="rounded border bg-background p-2">{Object.entries(RC_STATUSES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></details>)}</div>
    {rows.length === 500 && <p className="mt-3 text-sm text-muted-foreground">Les 500 demandes les plus récentes sont affichées.</p>}
  </section>;
}
