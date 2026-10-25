import { CalendarDays, CalendarPlus, ExternalLink, Home } from 'lucide-react';
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

function VisiteCard({ c, past, nextSlot, onReserve }: { c: UnifiedCandidature; past?: boolean; nextSlot?: string; onReserve?: () => void }) {
  const a = annonceOf(c);
  const annulee = !!c.annulee;
  // Règle métier : le placeholder « Annonce externe » ne s'applique qu'aux annonces
  // externes (reprises d'autres sites, identifiées par lien_annonce — même critère
  // que PublicAnnonceCard). Annonces internes/clients : vraie photo pour tous les rôles.
  const isExternal = !!a?.lien_annonce;
  const photo = isExternal ? null : photoOf(a);
  const url = annonceUrl(a);
  const prix = fmtPrix(a);
  return (
    <div className={`${DASH_CARD} flex flex-col overflow-hidden ${annulee ? 'opacity-80' : past ? 'opacity-70' : ''}`}>
      <div className="h-40 w-full shrink-0 overflow-hidden bg-muted">
        {photo ? (
          <img src={photo} alt={a?.titre || c.adresse} loading="lazy" className="h-full w-full object-cover" />
        ) : a ? (
          <ExternalListingPlaceholder />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Home className="h-8 w-8" /></div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 p-4">
        <div className="flex flex-wrap gap-2">
          {annulee ? (
            <DashBadge tone="danger">Annulé — nouvelle date à venir</DashBadge>
          ) : (
            <DashBadge tone="muted">{statutLabel(c.statut)}</DashBadge>
          )}
        </div>
        <p className="line-clamp-2 text-base font-semibold text-foreground">{a?.titre || c.adresse}</p>
        {a?.titre && <p className="truncate text-xs text-muted-foreground">{c.adresse}</p>}
        {c.date_visite ? (
          <p className={annulee ? 'text-sm font-medium text-muted-foreground line-through' : 'text-sm font-medium text-primary'}>
            Visite le {fmtVisite(c.date_visite)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Candidature du {c.date ? new Date(c.date).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' }) : '—'}</p>
        )}
        {annulee && c.annulation_message && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{c.annulation_message}</p>
        )}
        {annulee && nextSlot && (
          <div className="flex flex-col gap-2 rounded-xl bg-primary/10 p-3">
            <p className="flex items-start gap-2 text-sm font-medium text-primary">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Nouvelle date disponible : {fmtVisite(nextSlot)}</span>
            </p>
            <Button size="sm" className="min-h-[36px] rounded-full" onClick={onReserve}>Réserver ce créneau</Button>
          </div>
        )}
        {prix && <p className="text-sm font-semibold text-foreground">{prix}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          {url && (
            <Button asChild size="sm" variant="outline" className="min-h-[36px] rounded-full">
              <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Voir l'annonce</a>
            </Button>
          )}
          {c.date_visite && !past && !annulee && (
            <Button size="sm" className="min-h-[36px] rounded-full" onClick={() => addToCalendar(c)}>
              <CalendarPlus className="mr-1 h-4 w-4" />Ajouter à mon agenda
            </Button>
          )}
        </div>
      </div>
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
      {reserve && <ReserverVisiteDialog open onOpenChange={(o) => !o && setReserve(null)} annonce={reserve} />}
      <DashPage>
        <DashPageHeader title="Agenda" subtitle="Vos visites et candidatures" />
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : data.length === 0 ? (
          <DashEmptyState icon={CalendarDays} title="Aucun événement pour le moment." />
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <DashSection title="À venir">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {upcoming.map((c) => <VisiteCard key={`${c.source}-${c.id}`} c={c} />)}
                </div>
              </DashSection>
            )}
            {past.length > 0 && (
              <DashSection title="Passées">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {past.map((c) => <VisiteCard key={`${c.source}-${c.id}`} c={c} past />)}
                </div>
              </DashSection>
            )}
            {cancelled.length > 0 && (
              <DashSection title="Annulées">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {cancelled.map((c) => {
                    const aid = c.raw?.annonce_id as string | undefined;
                    return <VisiteCard key={`${c.source}-${c.id}`} c={c} nextSlot={aid ? (slots as Record<string, string>)[aid] : undefined}
                      onReserve={() => aid && setReserve({ id: aid, titre: annonceOf(c)?.titre || c.adresse })} />;
                  })}
                </div>
              </DashSection>
            )}
            {others.length > 0 && (
              <DashSection title="Autres candidatures">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {others.map((c) => <VisiteCard key={`${c.source}-${c.id}`} c={c} />)}
                </div>
              </DashSection>
            )}
          </div>
        )}
      </DashPage>
    </>
  );
}
