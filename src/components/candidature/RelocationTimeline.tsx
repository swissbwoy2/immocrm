import { CheckCircle2, Circle, XCircle } from 'lucide-react';

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', dateStyle: 'short', timeStyle: 'short' }) : '';

const ORDER = ['candidature_deposee', 'documents_demandes', 'retenu_bailleur', 'bail_signe', 'etat_lieux_effectue', 'cles_remises'];

export function RelocationTimeline({ r }: { r: any }) {
  const refused = r?.statut === 'refusee' || r?.statut === 'refuse';
  const desiste = r?.statut === 'desiste';
  const idx = ORDER.indexOf(r?.statut);
  const reached = (k: string, date?: string | null) => !!date || (idx >= 0 && idx >= ORDER.indexOf(k));
  const steps: { label: string; date?: string | null; done: boolean; bad?: boolean }[] = [
    { label: 'Candidature déposée', date: r?.date_depot, done: reached('candidature_deposee', r?.date_depot) },
    { label: 'Documents demandés', date: r?.date_documents_demandes, done: reached('documents_demandes', r?.date_documents_demandes) },
    refused
      ? { label: 'Refusée', date: r?.date_decision, done: true, bad: true }
      : { label: 'Dossier retenu', date: r?.date_decision, done: reached('retenu_bailleur', r?.date_decision) },
    ...(refused ? [] : [
      { label: 'Bail signé', date: r?.date_signature, done: reached('bail_signe', r?.date_signature) },
      { label: "État des lieux", date: r?.date_etat_lieux_effectue || r?.date_etat_lieux, done: reached('etat_lieux_effectue', r?.date_etat_lieux_effectue) },
      { label: 'Remise des clés', date: r?.date_cles_remises, done: reached('cles_remises', r?.date_cles_remises) },
    ]),
    ...(desiste ? [{ label: 'Désistée', done: true, bad: true }] : []),
  ];
  return (
    <div className="space-y-2">
      <ol className="space-y-1.5">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs">
            {s.bad ? <XCircle className="h-4 w-4 text-destructive" /> : s.done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
            <span className={s.done ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
            {s.date && <span className="ml-auto text-muted-foreground">{fmt(s.date)}</span>}
          </li>
        ))}
      </ol>
      {r?.statut === 'bail_signe' && r?.date_etat_lieux && (
        <p className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">État des lieux prévu le {fmt(r.date_etat_lieux)}</p>
      )}
    </div>
  );
}
