import { Banknote, CalendarDays, CalendarPlus, ChevronRight, ExternalLink, FileCheck, Home } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { VISIT_DIALOG_CLASS, VisitActionBar, VisitBody, VisitHero, VisitInfoTiles, VisitNote } from '@/components/visites/VisitDetailParts';
import { formatZurichDay, formatZurichTime, zurichDayKey } from '@/lib/dateZurich';
import { Capacitor } from '@capacitor/core';
import { ExternalListingPlaceholder } from '@/components/public/ExternalListingPlaceholder';
import { Button } from '@/components/ui/button';
import { DASH_CARD, DashBadge, DashEmptyState, DashPage, DashPageHeader, DashSection } from '@/components/client/dashboard/DashPrimitives';
import { useCandidatCandidatures, statutLabel, type UnifiedCandidature } from '@/hooks/useCandidatCandidatures';
import { toast } from 'sonner';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReserverVisiteDialog } from '@/components/public/ReserverVisiteDialog';
import { VisiteConfirmGate } from '@/components/candidature/VisiteConfirmGate';

const fmtVisite = (d: string) =>
  new Date(d).toLocaleString('fr-CH', { timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).replace(':', 'h');

const annonceOf = (c: UnifiedCandidature) => c.raw?.annonces_publiques ?? null;

const photoOf = (a: any): string | null => {
  const p = a?.photos_annonces_publiques as { url: string; est_principale: boolean }[] | undefined;
  if (!p?.length) return null;
  return (p.find((x) => x.est_principale) ?? p[0]).url;
};

const annonceUrl = (a: any) => (a ? `${window.location.origin}/annonces/${a.slug || a.id}` : null);

const fmtPrix = (a: any) => {
  if (!a?.prix) return null;
  const v = new Intl.NumberFormat('fr-CH').format(Number(a.prix)).replace(/[\u202F\u00A0]/g, "'");
  return `CHF ${v}.-${a.type_transaction === 'location' ? ' /mois' : ''}`;
};

// Local Zurich time with TZID
const icsLocal = (d: Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      .formatToParts(d).map((p) => [p.type, p.value]),
  );
  const h = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}${parts.month}${parts.day}T${h}${parts.minute}${parts.second}`;
};
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

function buildIcs(c: UnifiedCandidature) {
  const a = annonceOf(c);
  const start = new Date(c.date_visite!);
  const end = new Date(start.getTime() + 30 * 60000);
  const loc = a ? [a.adresse, [a.code_postal, a.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') : c.adresse;
  const url = annonceUrl(a);
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Logisorama//Agenda candidat//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Zurich',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:visite-${c.id}@logisorama.ch`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Europe/Zurich:${icsLocal(start)}`,
    `DTEND;TZID=Europe/Zurich:${icsLocal(end)}`,
    `SUMMARY:${esc(`Visite — ${loc}`)}`,
    `LOCATION:${esc(loc)}`,
    `DESCRIPTION:${esc(`${url ? `Annonce : ${url}\n` : ''}Rappel Immo-rama : merci d'être ponctuel(le) à votre visite.`)}`,
    ...(url ? [`URL:${url}`] : []),
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Rappel : visite dans 1 heure', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

async function addToCalendar(c: UnifiedCandidature) {
  try {
    const ics = buildIcs(c);
    const fileName = `visite-${icsLocal(new Date(c.date_visite!)).slice(0, 8)}.ics`;
    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const res = await Filesystem.writeFile({ path: fileName, data: ics, directory: Directory.Cache, encoding: Encoding.UTF8 });
        await Share.share({ title: 'Visite', url: res.uri, dialogTitle: 'Ajouter à mon agenda' });
        return;
      } catch (e) {
        console.warn('Partage natif indisponible, téléchargement standard', e);
      }
    }
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch {
    toast.error("Impossible de générer l'invitation calendrier");
  }
}

function VisiteCard({ c, past, nextSlot, onReserve, onOpen }: { c: UnifiedCandidature; past?: boolean; nextSlot?: string; onReserve?: () => void; onOpen: () => void }) {
  const a = annonceOf(c);
  const annulee = !!c.annulee;
  // Règle métier : le placeholder « Annonce externe » ne s'applique qu'aux annonces
  // externes (reprises d'autres sites, identifiées par lien_annonce — même critère
  // que PublicAnnonceCard). Annonces internes/clients : vraie photo pour tous les rôles.
  const isExternal = !!a?.lien_annonce;
  const photo = isExternal ? null : photoOf(a);
  const prix = fmtPrix(a);
  return (
    <div className={`${DASH_CARD} min-w-0 overflow-hidden ${annulee ? 'opacity-90' : past ? 'opacity-75' : ''}`}>
      <button type="button" onClick={onOpen} className="flex min-h-[88px] w-full items-center gap-3 p-3 text-left active:scale-[0.99] sm:p-4">
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted">
          {photo ? (
            <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : a ? (
            <ExternalListingPlaceholder />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground"><Home className="h-6 w-6" /></span>
          )}
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          {c.date_visite && (
            <span className={`block text-[15px] font-semibold leading-tight ${annulee ? 'text-muted-foreground line-through' : 'text-primary'}`}>{formatZurichTime(c.date_visite)}</span>
          )}
          <span className="block truncate text-[15px] font-semibold text-foreground">{a?.titre || c.adresse}</span>
          {a?.titre && <span className="block truncate text-sm text-muted-foreground">{c.adresse}</span>}
          {!c.date_visite && (
            <span className="block text-sm text-muted-foreground">Candidature du {c.date ? new Date(c.date).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' }) : '—'}</span>
          )}
          <span className="flex flex-wrap items-center gap-2">
            {annulee ? <DashBadge tone="danger">Annulé — nouvelle date à venir</DashBadge> : <DashBadge tone="muted">{statutLabel(c.statut)}</DashBadge>}
            {prix && <span className="text-sm font-semibold text-foreground">{prix}</span>}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      {annulee && nextSlot && (
        <div className="mx-3 mb-3 flex flex-col gap-2 rounded-2xl bg-primary/10 p-3 sm:mx-4 sm:mb-4">
          <p className="flex items-start gap-2 text-sm font-medium text-primary">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Nouvelle date disponible : {fmtVisite(nextSlot)}</span>
          </p>
          <Button size="sm" className="min-h-[44px]" onClick={onReserve}>Réserver ce créneau</Button>
        </div>
      )}
    </div>
  );
}

/** Détail d'une visite : même gabarit que les autres rôles (VisitHero, tuiles, barre d'actions). */
function VisiteDetail({ c, onClose }: { c: UnifiedCandidature | null; onClose: () => void }) {
  const a = c ? annonceOf(c) : null;
  const isExternal = !!a?.lien_annonce;
  const photo = c && !isExternal ? photoOf(a) : null;
  const url = annonceUrl(a);
  const prix = fmtPrix(a);
  const past = !!c?.date_visite && new Date(c.date_visite).getTime() < Date.now();
  const adresse = a ? [a.adresse, [a.code_postal, a.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') : c?.adresse;
  return (
    <Dialog open={!!c} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={VISIT_DIALOG_CLASS}>
        {c && (
          <>
            <VisitHero
              TitleAs={DialogTitle}
              kicker="Visite"
              badges={c.annulee ? <DashBadge tone="danger">Annulé — nouvelle date à venir</DashBadge> : <DashBadge tone="muted">{statutLabel(c.statut)}</DashBadge>}
              date={c.date_visite}
              title={a?.titre || c.adresse}
              address={adresse}
              photoUrl={photo}
            />
            <DialogDescription className="sr-only">Détail de la visite et de la candidature</DialogDescription>
            <VisitBody>
              <VisitInfoTiles
                items={[
                  { icon: Banknote, label: 'Loyer', value: prix ?? undefined },
                  { icon: FileCheck, label: 'Candidature', value: statutLabel(c.statut) },
                  { icon: CalendarDays, label: 'Déposée le', value: c.date ? new Date(c.date).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' }) : undefined },
                ]}
              />
              {c.annulee && c.annulation_message && <VisitNote tone="warning">{c.annulation_message}</VisitNote>}
              {!c.annulee && c.date_visite && !past && (
                <VisitNote>Merci d'être ponctuel(le) à votre visite. Ajoutez-la à votre agenda pour recevoir un rappel une heure avant.</VisitNote>
              )}
            </VisitBody>
            {(url || (c.date_visite && !past && !c.annulee)) && (
              <VisitActionBar
                primary={c.date_visite && !past && !c.annulee ? (
                  <Button onClick={() => addToCalendar(c)}>
                    <CalendarPlus className="mr-1 h-4 w-4" />Ajouter à mon agenda
                  </Button>
                ) : undefined}
              >
                {url && (
                  <Button asChild variant="outline">
                    <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Voir l'annonce</a>
                  </Button>
                )}
              </VisitActionBar>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Regroupe des candidatures par jour de visite (heure suisse). */
function groupByDay(list: UnifiedCandidature[]) {
  const groups: { key: string; label: string; items: UnifiedCandidature[] }[] = [];
  list.forEach((c) => {
    const key = zurichDayKey(c.date_visite);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      const label = formatZurichDay(c.date_visite, { weekday: true });
      g = { key, label: label ? label.charAt(0).toUpperCase() + label.slice(1) : '', items: [] };
      groups.push(g);
    }
    g.items.push(c);
  });
  return groups;
}

function DayGroups({ list, past, onOpen }: { list: UnifiedCandidature[]; past?: boolean; onOpen: (c: UnifiedCandidature) => void }) {
  return (
    <div className="space-y-5">
      {groupByDay(list).map((g) => (
        <div key={g.key} className="space-y-2.5">
          <h3 className="flex items-center gap-2 px-0.5 text-[15px] font-semibold text-foreground">
            {g.key === zurichDayKey(new Date()) && <DashBadge tone="primary">Aujourd'hui</DashBadge>}
            <span className="min-w-0 truncate">{g.label}</span>
            <span className="text-sm font-normal text-muted-foreground">· {g.items.length}</span>
          </h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {g.items.map((c) => <VisiteCard key={`${c.source}-${c.id}`} c={c} past={past} onOpen={() => onOpen(c)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CandidatAgenda() {
  const { data = [], isLoading } = useCandidatCandidatures();
  const now = Date.now();
  const withDate = data.filter((c) => c.date_visite);
  const cancelled = withDate.filter((c) => c.annulee);
  const active = withDate.filter((c) => !c.annulee);
  const upcoming = active.filter((c) => new Date(c.date_visite!).getTime() >= now).sort((a, b) => a.date_visite!.localeCompare(b.date_visite!));
  const past = active.filter((c) => new Date(c.date_visite!).getTime() < now).sort((a, b) => b.date_visite!.localeCompare(a.date_visite!));
  const others = data.filter((c) => !c.date_visite);
  const [reserve, setReserve] = useState<{ id: string; titre: string } | null>(null);
  const [detail, setDetail] = useState<UnifiedCandidature | null>(null);
  const cancelledIds = Array.from(new Set(cancelled.map((c) => c.raw?.annonce_id).filter(Boolean))) as string[];
  const { data: slots = {} } = useQuery({
    queryKey: ['candidat-new-slots', cancelledIds.join(',')],
    enabled: cancelledIds.length > 0,
    queryFn: async () => {
      const { data: rows } = await (supabase as any).from('annonce_creneaux').select('annonce_id, date_heure')
        .in('annonce_id', cancelledIds).eq('actif', true).gt('date_heure', new Date().toISOString()).order('date_heure');
      const m: Record<string, string> = {};
      (rows ?? []).forEach((r: any) => { if (!m[r.annonce_id]) m[r.annonce_id] = r.date_heure; });
      return m;
    },
  });

  return (
    <>
      <VisiteConfirmGate list={data} />
      <VisiteDetail c={detail} onClose={() => setDetail(null)} />
      {reserve && <ReserverVisiteDialog open onOpenChange={(o) => !o && setReserve(null)} annonce={reserve} />}
      <DashPage>
        <DashPageHeader title="Agenda" subtitle="Vos visites et candidatures, en heure suisse" />
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : data.length === 0 ? (
          <DashEmptyState icon={CalendarDays} title="Aucun événement pour le moment." />
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <DashSection title="À venir" action={<DashBadge tone="muted">{upcoming.length}</DashBadge>}>
                <DayGroups list={upcoming} onOpen={setDetail} />
              </DashSection>
            )}
            {past.length > 0 && (
              <DashSection title="Passées" action={<DashBadge tone="muted">{past.length}</DashBadge>}>
                <DayGroups list={past} past onOpen={setDetail} />
              </DashSection>
            )}
            {cancelled.length > 0 && (
              <DashSection title="Annulées" action={<DashBadge tone="muted">{cancelled.length}</DashBadge>}>
                <div className="grid gap-3 lg:grid-cols-2">
                  {cancelled.map((c) => {
                    const aid = c.raw?.annonce_id as string | undefined;
                    return <VisiteCard key={`${c.source}-${c.id}`} c={c} nextSlot={aid ? (slots as Record<string, string>)[aid] : undefined}
                      onOpen={() => setDetail(c)}
                      onReserve={() => aid && setReserve({ id: aid, titre: annonceOf(c)?.titre || c.adresse })} />;
                  })}
                </div>
              </DashSection>
            )}
            {others.length > 0 && (
              <DashSection title="Autres candidatures" action={<DashBadge tone="muted">{others.length}</DashBadge>}>
                <div className="grid gap-3 lg:grid-cols-2">
                  {others.map((c) => <VisiteCard key={`${c.source}-${c.id}`} c={c} onOpen={() => setDetail(c)} />)}
                </div>
              </DashSection>
            )}
          </div>
        )}
      </DashPage>
    </>
  );
}
