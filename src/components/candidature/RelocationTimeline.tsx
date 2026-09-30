import { CheckCircle2, Circle, XCircle } from 'lucide-react';

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', dateStyle: 'short', timeStyle: 'short' }) : '';

export function RelocationTimeline({ r }: { r: any }) {
  const refused = r?.statut === 'refusee';
  const steps: { label: string; date?: string | null; done: boolean; bad?: boolean }[] = [
    { label: 'Candidature déposée', date: r?.date_depot, done: !!r?.date_depot },
    { label: 'Documents demandés', date: r?.date_documents_demandes, done: !!r?.date_documents_demandes },
    refused
      ? { label: 'Refusée', date: r?.date_decision, done: true, bad: true }
      : { label: 'Dossier retenu', date: r?.date_decision, done: !!r?.date_decision },
    ...(refused ? [] : [
      { label: 'Conclusion confirmée', date: r?.candidat_confirme_at, done: !!r?.candidat_confirme_at },
      { label: 'Bail signé', date: r?.date_signature, done: !!r?.date_signature },
      { label: 'État des lieux', date: r?.date_etat_lieux_effectue || r?.date_etat_lieux, done: !!r?.date_etat_lieux_effectue },
      { label: 'Remise des clés', date: r?.date_cles_remises, done: !!r?.date_cles_remises },
    ]),
  ];
  return (
    <ol className="space-y-1.5">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-2 text-xs">
          {s.bad ? <XCircle className="h-4 w-4 text-destructive" /> : s.done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
          <span className={s.done ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
          {s.date && <span className="ml-auto text-muted-foreground">{fmt(s.date)}</span>}
        </li>
      ))}
    </ol>
  );
}
