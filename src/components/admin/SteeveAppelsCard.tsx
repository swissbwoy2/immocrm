import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock, ExternalLink, Loader2, Mail, Phone, PhoneCall, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DASH_CARD, DashBadge, DashFilterPills } from '@/components/client/dashboard/DashPrimitives';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Appel = {
  id: string; type: 'mail' | 'contact'; kind: string; statut: string; created_at: string; age_heures: number;
  offre_id: string | null; client_id: string | null; objet: string | null; motif: string | null;
  telephone: string | null; expediteur: string | null; adresse: string | null; lien_annonce: string | null;
  contact: string | null; offre_statut: string | null; client_nom: string | null; client_telephone: string | null;
  rappel_note: string | null; agence: string | null; agence_telephone: string | null; agence_email: string | null;
};
type Liste = { total: number; mails: number; contacts: number; reportes: number; liste: Appel[] };
type Resultat = 'visite_fixee' | 'refuse' | 'rappeler' | 'classer';

const FILTRES = [
  { key: '', label: 'Tout' },
  { key: 'mail', label: 'E-mails de régie' },
  { key: 'contact', label: 'Contacts introuvables' },
];

const age = (h: number) => (h < 1 ? 'à l’instant' : h < 48 ? 'il y a ' + h + ' h' : 'il y a ' + Math.round(h / 24) + ' j');
const telHref = (t: string) => 'tel:' + t.replace(/[^0-9+]/g, '');
const deux = (n: number) => String(n).padStart(2, '0');

/** Demain 10 h, au format attendu par <input type="datetime-local">. */
function demainDixHeures(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.getFullYear() + '-' + deux(d.getMonth() + 1) + '-' + deux(d.getDate()) + 'T' + deux(d.getHours()) + ':' + deux(d.getMinutes());
}

/**
 * Appels du jour : tout ce qui attend l'admin (e-mails de régie à valider, régies à appeler faute de contact),
 * le plus ancien d'abord. Chaque ligne se ferme en un geste : visite fixée, refus, rappeler plus tard ou classer.
 */
export function SteeveAppelsCard() {
  const [data, setData] = useState<Liste | null>(null);
  const [filtre, setFiltre] = useState('');
  const [chargement, setChargement] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [visitePour, setVisitePour] = useState<string | null>(null);
  const [dateVisite, setDateVisite] = useState(demainDixHeures());
  const [note, setNote] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fonction ajoutée par la migration 20261027180000
    const { data: d, error } = await (supabase.rpc as any)('admin_appels_du_jour', { p_limite: 200 });
    setChargement(false);
    if (error) { toast.error('La liste des appels n’a pas pu être chargée'); return; }
    setData(d as Liste);
  }, []);
  useEffect(() => { void charger(); }, [charger]);

  const conclure = async (a: Appel, resultat: Resultat) => {
    if (resultat === 'refuse' && !window.confirm('Marquer ce bien comme refusé / plus disponible ? Les tâches ouvertes de cette offre seront annulées.')) return;
    let p_date: string | null = null;
    if (resultat === 'visite_fixee') {
      if (!dateVisite) { toast.error('Indique la date et l’heure de la visite'); return; }
      p_date = new Date(dateVisite).toISOString();
    }
    setEnCours(a.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fonction ajoutée par la migration 20261027180000
    const { data: r, error } = await (supabase.rpc as any)('admin_appel_resultat', {
      p_action_id: a.id, p_resultat: resultat, p_note: note.trim() || null, p_date,
    });
    setEnCours(null);
    const res = r as { ok?: boolean; motif?: string; visite?: { quand?: string } } | null;
    if (error || !res?.ok) { toast.error(res?.motif ?? 'Action impossible sur cette ligne'); return; }
    toast.success(
      resultat === 'visite_fixee' ? 'Visite inscrite' + (res.visite?.quand ? ' le ' + res.visite.quand : '') + ', client prévenu'
        : resultat === 'rappeler' ? 'Reporté : la ligne reviendra demain à 9 h'
        : resultat === 'refuse' ? 'Refus enregistré' : 'Classé',
    );
    setVisitePour(null);
    setNote('');
    void charger();
  };

  const liste = (data?.liste ?? []).filter((a) => !filtre || a.type === filtre);
  const libelle = (key: string, label: string) => {
    if (!data) return label;
    if (key === 'mail') return label + ' (' + data.mails + ')';
    if (key === 'contact') return label + ' (' + data.contacts + ')';
    return label;
  };

  return (
    <section aria-labelledby="steeve-appels-title" className={cn(DASH_CARD, 'min-w-0 p-4 md:p-6')}>
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PhoneCall className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 id="steeve-appels-title" className="flex flex-wrap items-center gap-2 text-base font-semibold leading-snug text-foreground md:text-[17px]">
            Appels du jour
            {data && <DashBadge tone={data.total > 0 ? 'warning' : 'success'}>{data.total > 0 ? data.total + ' en attente' : 'À jour'}</DashBadge>}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Ce qui attend un humain, le plus ancien en premier : réponses de régies que Steeve n’a pas su trancher et biens dont on n’a pas trouvé le contact.
            {data && data.reportes > 0 ? ' ' + data.reportes + ' ligne(s) reportée(s) reviendront à l’heure choisie.' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void charger()} disabled={chargement} aria-label="Actualiser la liste">
          {chargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </header>

      <div className="mt-4">
        <DashFilterPills
          options={FILTRES.map((f) => ({ key: f.key, label: libelle(f.key, f.label) }))}
          value={filtre}
          onChange={setFiltre}
          label="Filtrer les appels"
        />

        {!data ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</p>
        ) : liste.length === 0 ? (
          <p className="rounded-2xl border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground dark:bg-white/[0.03]">Rien à appeler pour le moment.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/50 dark:bg-white/[0.03]">
            {liste.map((a) => {
              const tel = a.telephone ?? a.agence_telephone;
              const occupe = enCours === a.id;
              return (
                <li key={a.id} className="space-y-2 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <DashBadge tone={a.type === 'mail' ? 'primary' : 'warning'}>{a.type === 'mail' ? 'E-mail de régie' : 'Contact introuvable'}</DashBadge>
                    <span className={cn('inline-flex items-center gap-1 text-xs', a.age_heures >= 24 ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {age(a.age_heures)}
                    </span>
                  </div>
                  <p className="font-medium text-foreground">
                    {a.adresse ?? a.objet ?? 'Sans adresse'}
                    {a.client_nom ? <span className="font-normal text-muted-foreground"> · pour {a.client_nom}</span> : null}
                  </p>
                  {a.motif && <p className="whitespace-pre-line text-muted-foreground">{a.motif.replace(/^Lecture incertaine : /, '')}</p>}
                  {a.rappel_note && <p className="text-xs text-muted-foreground">Note du report : {a.rappel_note}</p>}

                  <div className="flex flex-wrap items-center gap-2">
                    {tel && (
                      <Button asChild size="sm">
                        <a href={telHref(tel)}><Phone className="mr-1.5 h-4 w-4" />{a.agence && !a.telephone ? a.agence + ' · ' : ''}{tel}</a>
                      </Button>
                    )}
                    {!tel && a.agence && <span className="text-xs text-muted-foreground">Régie : {a.agence} (pas de numéro au carnet)</span>}
                    {a.agence_email && (
                      <Button asChild size="sm" variant="outline">
                        <a href={'mailto:' + a.agence_email}><Mail className="mr-1.5 h-4 w-4" />{a.agence_email}</a>
                      </Button>
                    )}
                    {a.lien_annonce && (
                      <Button asChild size="sm" variant="outline">
                        <a href={a.lien_annonce} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1.5 h-4 w-4" />Annonce</a>
                      </Button>
                    )}
                    {a.client_telephone && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={telHref(a.client_telephone)}><Phone className="mr-1.5 h-4 w-4" />Client</a>
                      </Button>
                    )}
                  </div>

                  {visitePour === a.id ? (
                    <div className="space-y-2 rounded-xl border border-border/60 p-3">
                      <label className="block text-xs font-medium text-foreground" htmlFor={'visite-' + a.id}>Date et heure de la visite</label>
                      <input
                        id={'visite-' + a.id}
                        type="datetime-local"
                        value={dateVisite}
                        onChange={(e) => setDateVisite(e.target.value)}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Note (facultatif) : interlocuteur, consignes…"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void conclure(a, 'visite_fixee')} disabled={occupe}>
                          {occupe ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CalendarCheck className="mr-1.5 h-4 w-4" />}Inscrire la visite
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setVisitePour(null)}>Annuler</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={occupe || !a.offre_id}
                        onClick={() => { setVisitePour(a.id); setDateVisite(demainDixHeures()); setNote(''); }}
                        title={a.offre_id ? undefined : 'Pas d’offre rattachée : fixe la visite depuis la fiche du client'}
                      >
                        <CalendarCheck className="mr-1.5 h-4 w-4" />Visite fixée
                      </Button>
                      <Button size="sm" variant="outline" disabled={occupe} onClick={() => void conclure(a, 'rappeler')}>
                        <Clock className="mr-1.5 h-4 w-4" />Rappeler demain
                      </Button>
                      <Button size="sm" variant="outline" disabled={occupe} onClick={() => void conclure(a, 'refuse')}>
                        <X className="mr-1.5 h-4 w-4" />Refus / plus dispo
                      </Button>
                      <Button size="sm" variant="ghost" disabled={occupe} onClick={() => void conclure(a, 'classer')}>
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />Classer
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
