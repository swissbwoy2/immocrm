import { CalendarDays, CalendarPlus, ExternalLink, Home } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ExternalListingPlaceholder } from '@/components/public/ExternalListingPlaceholder';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { useCandidatCandidatures, statutLabel, type UnifiedCandidature } from '@/hooks/useCandidatCandidatures';
import { toast } from 'sonner';

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

function VisiteCard({ c, past }: { c: UnifiedCandidature; past?: boolean }) {
  const a = annonceOf(c);
  // Règle métier : le placeholder « Annonce externe » ne s'applique qu'aux annonces
  // externes (reprises d'autres sites, identifiées par lien_annonce — même critère
  // que PublicAnnonceCard). Annonces internes/clients : vraie photo pour tous les rôles.
  const isExternal = !!a?.lien_annonce;
  const photo = isExternal ? null : photoOf(a);
  const url = annonceUrl(a);
  const prix = fmtPrix(a);
  return (
    <Card className={past ? 'opacity-70' : undefined}>
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:p-4">
        <div className="h-32 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-32">
          {photo ? (
            <img src={photo} alt={a?.titre || c.adresse} loading="lazy" className="h-full w-full object-cover" />
          ) : a ? (
            <ExternalListingPlaceholder />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Home className="h-8 w-8" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 font-medium text-foreground">{a?.titre || c.adresse}</p>
            <Badge variant="secondary" className="shrink-0">{statutLabel(c.statut)}</Badge>
          </div>
          {a?.titre && <p className="truncate text-xs text-muted-foreground">{c.adresse}</p>}
          {c.date_visite ? (
            <p className="text-sm font-medium text-primary">Visite le {fmtVisite(c.date_visite)}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Candidature du {c.date ? new Date(c.date).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' }) : '—'}</p>
          )}
          {prix && <p className="text-sm font-semibold text-foreground">{prix}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            {url && (
              <Button asChild size="sm" variant="outline" className="min-h-[36px]">
                <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Voir l'annonce</a>
              </Button>
            )}
            {c.date_visite && !past && (
              <Button size="sm" className="min-h-[36px]" onClick={() => addToCalendar(c)}>
                <CalendarPlus className="mr-1 h-4 w-4" />Ajouter à mon agenda
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CandidatAgenda() {
  const { data = [], isLoading } = useCandidatCandidatures();
  const now = Date.now();
  const withDate = data.filter((c) => c.date_visite);
  const upcoming = withDate.filter((c) => new Date(c.date_visite!).getTime() >= now).sort((a, b) => a.date_visite!.localeCompare(b.date_visite!));
  const past = withDate.filter((c) => new Date(c.date_visite!).getTime() < now).sort((a, b) => b.date_visite!.localeCompare(a.date_visite!));
  const others = data.filter((c) => !c.date_visite);

  return (
    <div className="flex-1 overflow-y-auto">
      <PremiumPageShellV2>
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground">Vos visites et candidatures</p>
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : data.length === 0 ? (
          <Card><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><CalendarDays className="h-5 w-5" />Aucun événement pour le moment.</CardContent></Card>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">À venir</h2>
                {upcoming.map((c) => <VisiteCard key={`${c.source}-${c.id}`} c={c} canViewPhotos={canViewPhotos} />)}
              </section>
            )}
            {past.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Passées</h2>
                {past.map((c) => <VisiteCard key={`${c.source}-${c.id}`} c={c} past canViewPhotos={canViewPhotos} />)}
              </section>
            )}
            {others.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Autres candidatures</h2>
                {others.map((c) => <VisiteCard key={`${c.source}-${c.id}`} c={c} canViewPhotos={canViewPhotos} />)}
              </section>
            )}
          </div>
        )}
      </PremiumPageShellV2>
    </div>
  );
}
