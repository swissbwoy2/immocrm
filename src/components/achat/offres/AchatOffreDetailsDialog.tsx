import { ExternalLink, Info, MapPin, StickyNote } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddressLink } from '@/components/AddressLink';
import { noteSuiviClient } from '@/lib/offreNote';
import { ACHAT_A_REPONDRE, ACHAT_STATUT_COURT, formatPrixAchat } from '@/lib/achatOffreActions';
import { AchatOffrePhoto, AchatProchaineEtape, formatVisite, type AchatActionsHandlers } from './AchatOffreParts';

function libelleVisite(v: any) {
  const statut = v.statut === 'effectuee' ? 'Visite effectuée'
    : v.statut === 'annulee' ? 'Visite annulée'
    : v.statut === 'confirmee' ? 'Visite confirmée'
    : v.statut === 'proposee' ? 'Créneau proposé'
    : 'Visite planifiée';
  const qui = v.est_deleguee ? 'votre conseiller visite pour vous' : 'avec votre conseiller';
  return `${statut} · ${qui}`;
}

/** Médias d'une visite partagés avec le client (vidéos et photos). */
function mediasPartages(v: any): { url: string; video: boolean }[] {
  const all = [
    ...(Array.isArray(v.medias) ? v.medias : []),
    ...(Array.isArray(v.medias_coursier) ? v.medias_coursier : []),
  ];
  return all
    .filter((m: any) => m && m.url && m.shared_to_clients !== false)
    .map((m: any) => ({
      url: m.url as string,
      video: m.type === 'video' || (typeof m.mime === 'string' && m.mime.startsWith('video')),
    }));
}

const CR_LIBELLES: [string, string][] = [
  ['etat_general', 'État général'],
  ['avantages', 'Avantages'],
  ['inconvenients', 'Inconvénients'],
  ['type_sol', 'Sols'],
  ['ascenseur', 'Ascenseur'],
  ['autres_infos', 'Autres'],
];

/** Fiche détaillée d'un bien à l'achat — même structure que la fiche d'une offre de location. */
export function AchatOffreDetailsDialog({
  open, onOpenChange, offre, visites, handlers, busy, demandeEnvoyee = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offre: any | null;
  visites: any[];
  handlers: AchatActionsHandlers;
  busy?: boolean;
  demandeEnvoyee?: boolean;
}) {
  if (!offre) return null;

  const close = () => onOpenChange(false);
  const now = Date.now();
  const visitesDuBien = (visites || [])
    .filter((v) => v.offre_id === offre.id)
    .sort((a, b) => {
      const ta = a.date_visite ? new Date(a.date_visite).getTime() : 0;
      const tb = b.date_visite ? new Date(b.date_visite).getTime() : 0;
      const fa = ta >= now; const fb = tb >= now;
      if (fa !== fb) return fa ? -1 : 1;
      return fa ? ta - tb : tb - ta;
    });

  const prix = formatPrixAchat(offre.prix);
  const pieces = offre.pieces ?? offre.nombre_pieces;
  const details = [
    pieces ? `${pieces} pièces` : null,
    offre.surface ? `${offre.surface} m²` : null,
    offre.etage ? `Étage ${offre.etage}` : null,
  ].filter(Boolean).join(' · ');
  const infos = [
    offre.type_bien && { label: 'Type de bien', value: offre.type_bien },
    offre.disponibilite && { label: 'Disponible dès', value: offre.disponibilite },
    offre.annee_construction && { label: 'Année de construction', value: String(offre.annee_construction) },
    offre.contact_annonceur && { label: 'Contact vendeur', value: offre.contact_annonceur },
    offre.contact_visite && { label: 'Contact visite', value: offre.contact_visite },
  ].filter(Boolean) as { label: string; value: string }[];
  const lienAnnonce = offre.lien_annonce
    ? (/^https?:\/\//i.test(String(offre.lien_annonce).trim()) ? String(offre.lien_annonce).trim() : `https://${String(offre.lien_annonce).trim()}`)
    : null;
  const enAttente = ACHAT_A_REPONDRE.includes(offre.statut);

  // Les actions ferment la fiche avant d'ouvrir leur propre fenêtre.
  const wrapped: AchatActionsHandlers = {
    onVisiter: (o) => { close(); handlers.onVisiter(o); },
    onDeleguer: (o) => { close(); handlers.onDeleguer(o); },
    onRefuser: (o) => handlers.onRefuser(o),
    onInteret: (o) => handlers.onInteret(o),
    onVisiteFaite: (o) => handlers.onVisiteFaite(o),
    onFaireOffre: (o) => { close(); handlers.onFaireOffre(o); },
    onRenoncer: (o) => handlers.onRenoncer(o),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl sm:rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Détail du bien</DialogTitle>
          <DialogDescription>Informations sur le bien à l'achat proposé par votre conseiller</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <AchatOffrePhoto offre={offre} ratio="aspect-[16/10]" className="rounded-xl" />

          <div>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
                enAttente ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
              )}
            >
              {ACHAT_STATUT_COURT[offre.statut] ?? 'Bien proposé'}
            </span>
            <AddressLink
              address={offre.adresse}
              className="mt-3 text-xl font-semibold leading-snug"
              iconClassName="text-muted-foreground"
            />
            {details && <p className="mt-1 text-[15px] text-muted-foreground">{details}</p>}
            {prix && (
              <p className="mt-2 text-[17px] text-foreground">
                <span className="font-semibold">{prix}</span>
                <span className="text-muted-foreground"> · prix de vente</span>
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border/70 p-4">
            <AchatProchaineEtape offre={offre} visitesDuBien={visitesDuBien} handlers={wrapped} busy={busy} demandeEnvoyee={demandeEnvoyee} />
          </div>

          {visitesDuBien.length > 0 && (
            <Bloc titre="Vos visites">
              <div className="space-y-3">
                {visitesDuBien.map((v) => {
                  const medias = mediasPartages(v);
                  const cr = v.compte_rendu && typeof v.compte_rendu === 'object' ? v.compte_rendu : null;
                  const lignesCr = cr ? CR_LIBELLES.filter(([k]) => cr[k]).map(([k, l]) => [l, String(cr[k])]) : [];
                  return (
                    <div key={v.id} className="rounded-xl bg-muted/50 p-3.5">
                      {v.date_visite && <p className="text-sm font-semibold capitalize text-foreground">{formatVisite(v.date_visite)}</p>}
                      <p className="mt-0.5 text-sm text-muted-foreground">{libelleVisite(v)}</p>
                      {(v.feedback_agent || v.feedback_coursier) && (
                        <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{v.feedback_agent || v.feedback_coursier}</p>
                      )}
                      {lignesCr.length > 0 && (
                        <dl className="mt-2 space-y-1 text-sm">
                          {lignesCr.map(([l, val]) => (
                            <div key={l}><dt className="inline font-medium text-foreground">{l} : </dt><dd className="inline text-muted-foreground">{val}</dd></div>
                          ))}
                        </dl>
                      )}
                      {medias.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {medias.map((m) =>
                            m.video ? (
                              <video key={m.url} src={m.url} controls preload="metadata" className="col-span-2 max-h-64 w-full rounded-lg bg-black" />
                            ) : (
                              <a key={m.url} href={m.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
                                <img src={m.url} alt="Photo de la visite" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                              </a>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Bloc>
          )}

          {noteSuiviClient(offre.commentaires) && (
            <Bloc titre="Suivi">
              <p className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-3.5 text-sm leading-relaxed text-foreground">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="whitespace-pre-line">{noteSuiviClient(offre.commentaires)}</span>
              </p>
            </Bloc>
          )}

          {offre.description && (
            <Bloc titre="Description">
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{offre.description}</p>
            </Bloc>
          )}

          {infos.length > 0 && (
            <Bloc titre="Informations utiles">
              <dl className="divide-y divide-border/70">
                {infos.map((info) => (
                  <div key={info.label} className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-sm text-muted-foreground">{info.label}</dt>
                    <dd className="text-right text-sm font-medium text-foreground">{info.value}</dd>
                  </div>
                ))}
              </dl>
            </Bloc>
          )}

          {offre.adresse && (
            <Bloc titre="Emplacement">
              <div className="overflow-hidden rounded-xl border border-border/70">
                <iframe
                  title={`Carte ${offre.adresse}`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(offre.adresse)}&output=embed`}
                  width="100%"
                  height="220"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{ border: 0, display: 'block' }}
                />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(offre.adresse)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <MapPin className="h-4 w-4" /> Ouvrir dans Google Maps
                </a>
              </div>
            </Bloc>
          )}

          <p className="flex items-start gap-2 rounded-xl bg-muted/50 p-3.5 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Avant toute offre d'achat, votre conseiller vérifie avec vous le financement et l'état du bien.
          </p>

          {lienAnnonce && (
            <a
              href={lienAnnonce}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-4 transition-colors hover:border-foreground/50"
            >
              <span>
                <span className="block text-sm font-semibold text-foreground">Voir l'annonce d'origine</span>
                <span className="block truncate text-xs text-muted-foreground">{lienAnnonce.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          )}
        </div>

        <DialogFooter className="mt-2 border-t border-border/70 pt-4">
          <Button variant="ghost" className="h-11 w-full rounded-full sm:w-auto" onClick={close}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/70 pt-5">
      <h3 className="mb-3 text-[17px] font-semibold text-foreground">{titre}</h3>
      {children}
    </section>
  );
}
