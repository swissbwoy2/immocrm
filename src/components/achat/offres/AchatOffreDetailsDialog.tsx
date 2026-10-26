import { ExternalLink, Info, MapPin, StickyNote, Home, Maximize, Layers, CalendarCheck, CalendarDays } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import {
  DETAIL_DIALOG, DetailHeader, DetailBody, KeyFacts, DetailSection, DetailText, DetailActions, DetailNotice, DetailLinkCard, chfDetail,
} from '@/components/details/DetailPrimitives';
import { Button } from '@/components/ui/button';
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
      video: m.type === 'video' || (typeof m.mime === 'string' && m.mime.startsWith('video')) || /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(String(m.url)),
    }))
    // même fichier présent dans deux listes : une seule fois
    .filter((m, i, arr) => arr.findIndex((x) => x.url === m.url) === i);
}

const CR_LIBELLES: [string, string][] = [
  ['appreciation', 'Appréciation du conseiller'],
  ['etat_general', 'État général'],
  ['avantages', 'Avantages'],
  ['inconvenients', 'Inconvénients'],
  ['type_sol', 'Sols'],
  ['ascenseur', 'Ascenseur'],
  ['autres_infos', 'Autres'],
];

/** Fiche détaillée d'un bien à l'achat — même structure que la fiche d'une offre de location. */
export function AchatOffreDetailsDialog({
  open, onOpenChange, offre, visites, handlers, busy, demandeEnvoyee = false, negociation = null, notaire = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offre: any | null;
  visites: any[];
  handlers: AchatActionsHandlers;
  busy?: boolean;
  demandeEnvoyee?: boolean;
  negociation?: any | null;
  notaire?: any | null;
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

  const prix = formatPrixAchat(offre.prix) ? chfDetail(offre.prix) : null;
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
      <DialogContent className={DETAIL_DIALOG}>
        <DetailHeader
          titleAs={DialogTitle}
          descriptionAs={DialogDescription}
          media={<AchatOffrePhoto offre={offre} ratio="aspect-[16/10]" className="rounded-2xl" />}
          badge={<DashBadge tone={enAttente ? 'primary' : 'muted'}>{ACHAT_STATUT_COURT[offre.statut] ?? 'Bien proposé'}</DashBadge>}
          title={
            <AddressLink
              address={offre.adresse}
              className="text-[19px] font-semibold leading-snug sm:text-xl"
              iconClassName="text-muted-foreground"
            />
          }
          subtitle={details || "Informations sur le bien à l'achat proposé par votre conseiller"}
        />

        <DetailBody>
          <KeyFacts
            columns={4}
            items={[
              prix ? { label: 'Prix de vente', value: prix, emphasis: true } : null,
              pieces ? { label: 'Pièces', value: pieces, icon: Home } : null,
              offre.surface ? { label: 'Surface', value: `${offre.surface} m²`, icon: Maximize } : null,
              offre.etage ? { label: 'Étage', value: offre.etage, icon: Layers } : null,
              offre.disponibilite ? { label: 'Disponible dès', value: offre.disponibilite, icon: CalendarCheck } : null,
            ]}
          />

          <DetailSection className="bg-primary/5">
            <AchatProchaineEtape offre={offre} visitesDuBien={visitesDuBien} handlers={wrapped} busy={busy} demandeEnvoyee={demandeEnvoyee} negociation={negociation} notaire={notaire} />
          </DetailSection>

          {visitesDuBien.length > 0 && (
            <DetailSection title="Vos visites" icon={CalendarDays}>
              <div className="divide-y divide-border/50">
                {visitesDuBien.map((v) => {
                  const medias = mediasPartages(v);
                  const cr = v.compte_rendu && typeof v.compte_rendu === 'object' ? v.compte_rendu : null;
                  const lignesCr = cr ? CR_LIBELLES.filter(([k]) => cr[k]).map(([k, l]) => [l, String(cr[k])]) : [];
                  return (
                    <div key={v.id} className="py-3 first:pt-0 last:pb-0">
                      {v.date_visite && <p className="text-[15px] font-semibold capitalize text-foreground">{formatVisite(v.date_visite)}</p>}
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
                              <video key={m.url} src={m.url} controls preload="metadata" className="col-span-2 max-h-64 w-full rounded-xl bg-black" />
                            ) : (
                              <a key={m.url} href={m.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
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
            </DetailSection>
          )}

          {noteSuiviClient(offre.commentaires) && (
            <DetailSection title="Suivi" icon={StickyNote}>
              <DetailText>{noteSuiviClient(offre.commentaires)}</DetailText>
            </DetailSection>
          )}

          {offre.description && (
            <DetailSection title="Description">
              <DetailText>{offre.description}</DetailText>
            </DetailSection>
          )}

          {infos.length > 0 && (
            <DetailSection title="Informations utiles">
              <dl className="divide-y divide-border/50">
                {infos.map((info) => (
                  <div key={info.label} className="flex min-h-[44px] items-start justify-between gap-4 py-2.5">
                    <dt className="text-sm text-muted-foreground">{info.label}</dt>
                    <dd className="text-right text-[15px] font-medium text-foreground">{info.value}</dd>
                  </div>
                ))}
              </dl>
            </DetailSection>
          )}

          {offre.adresse && (
            <DetailSection title="Emplacement" icon={MapPin} className="overflow-hidden">
              <div className="-mx-4 -mb-4 sm:-mx-5 sm:-mb-5">
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
                  className="flex min-h-[48px] items-center justify-center gap-1.5 text-sm font-medium text-foreground hover:bg-muted/60"
                >
                  <MapPin className="h-4 w-4" /> Ouvrir dans Google Maps
                </a>
              </div>
            </DetailSection>
          )}

          <DetailNotice icon={Info}>
            Avant toute offre d'achat, votre conseiller vérifie avec vous le financement et l'état du bien.
          </DetailNotice>

          {lienAnnonce && (
            <DetailLinkCard
              href={lienAnnonce}
              title="Voir l'annonce d'origine"
              subtitle={lienAnnonce.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
              icon={ExternalLink}
            />
          )}
        </DetailBody>

        <DetailActions>
          <Button variant="ghost" onClick={close}>
            Fermer
          </Button>
        </DetailActions>
      </DialogContent>
    </Dialog>
  );
}

