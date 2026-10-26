import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashBadge } from "@/components/client/dashboard/DashPrimitives";
import {
  DETAIL_DIALOG,
  DetailHeader,
  DetailBody,
  KeyFacts,
  DetailSection,
  DetailText,
  DetailActions,
  chfDetail,
} from "@/components/details/DetailPrimitives";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { Home, Calendar, FileCheck, User, ExternalLink, StickyNote, Maximize, Layers, CalendarCheck } from "lucide-react";
import { noteSuiviClient } from "@/lib/offreNote";
import { usePreviewImage, type ShowcaseItem } from "@/components/public-site/showcase/useShowcase";
import { ChanceIndicator } from "@/components/ChanceIndicator";
import { CandidatureWorkflowInteractive } from "@/components/CandidatureWorkflowInteractive";
import { calculateChances } from "@/utils/chanceCalculator";
import { AddressLink } from "@/components/AddressLink";

function formatDateVisite(d: string) {
  try {
    return new Date(d).toLocaleString("fr-CH", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Zurich",
    });
  } catch {
    return d;
  }
}

function libelleStatutVisite(statut?: string) {
  switch (statut) {
    case "planifiee": return "Visite planifiée";
    case "effectuee": return "Visite effectuée";
    case "annulee": return "Visite annulée";
    default: return statut || "Visite";
  }
}

function quiSOccupeDeLaVisite(v: any) {
  if (v?.coursier_id) return "Un coursier s'en occupe";
  if (v?.est_deleguee) return "Votre agent s'en occupe";
  return "Vous vous en occupez";
}

interface PremiumOffreDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offre: any | null;
  candidatures: any[];
  clientData: any;
  documentsStats: Record<string, any>;
  visites: any[];
  onProgressWorkflow: (nextStatut: string, candidatureId: string) => Promise<void>;
  onPlanVisit: (offre: any) => void;
  onDeleguerVisite?: (offre: any) => void;
  onRespondInteret?: (offre: any, statut: 'interesse' | 'refusee') => Promise<void> | void;
  onPostulerDirect: (offre: any) => void;
  formatStatutOffre: (statut: string) => { label: string; variant: any };
}

export function PremiumOffreDetailsDialog({
  open,
  onOpenChange,
  offre,
  candidatures,
  clientData,
  documentsStats,
  visites,
  onProgressWorkflow,
  onPlanVisit,
  onDeleguerVisite,
  onRespondInteret,
  onPostulerDirect,
  formatStatutOffre
}: PremiumOffreDetailsDialogProps) {
  if (!offre) return null;

  const candidature = candidatures.find(c => c.offre_id === offre.id);
  const showWorkflow = ['candidature_deposee', 'en_attente', 'acceptee', 'bail_conclu', 'attente_bail', 'bail_recu', 'signature_planifiee', 'signature_effectuee', 'etat_lieux_fixe', 'cles_remises'].includes(candidature?.statut || offre.statut);
  const effectiveStatut = candidature?.statut || offre.statut;
  const statutInfo = formatStatutOffre(offre.statut);

  const showChances = ['interesse', 'visite_planifiee', 'visite_effectuee', 'candidature_deposee'].includes(offre.statut);

  // Visites liees a cette offre : la prochaine a venir d'abord, puis les passees, les plus recentes en tete.
  const maintenant = Date.now();
  const offreVisites = (visites || [])
    .filter((v: any) => v.offre_id === offre.id)
    .sort((a: any, b: any) => {
      const ta = a.date_visite ? new Date(a.date_visite).getTime() : 0;
      const tb = b.date_visite ? new Date(b.date_visite).getTime() : 0;
      const aVenirA = ta >= maintenant;
      const aVenirB = tb >= maintenant;
      if (aVenirA !== aVenirB) return aVenirA ? -1 : 1;
      return aVenirA ? ta - tb : tb - ta;
    });
  const visiteFuture = offreVisites.find(
    (v: any) => v.date_visite && new Date(v.date_visite).getTime() >= maintenant && v.statut !== 'annulee'
  );
  const peutOrganiserVisite = ['envoyee', 'vue', 'interesse'].includes(offre.statut) && !visiteFuture;

  const details = [
    offre.pieces ? `${offre.pieces} pièces` : null,
    offre.surface ? `${offre.surface} m²` : null,
    offre.etage ? `Étage ${offre.etage}` : null,
  ].filter(Boolean).join(' · ');

  const infos: { label: string; value: string }[] = [
    offre.type_bien && { label: 'Type de bien', value: offre.type_bien },
    offre.disponibilite && { label: 'Disponible dès', value: offre.disponibilite },
    offre.contact_gerance && { label: 'Contact gérance', value: offre.contact_gerance },
    offre.contact_annonceur && { label: 'Contact annonceur', value: offre.contact_annonceur },
    offre.contact_visite && { label: 'Contact visite', value: offre.contact_visite },
    offre.code_immeuble && { label: 'Code immeuble', value: offre.code_immeuble },
    offre.concierge_nom && { label: 'Concierge', value: [offre.concierge_nom, offre.concierge_tel].filter(Boolean).join(' · ') },
    offre.locataire_nom && { label: 'Locataire actuel', value: [offre.locataire_nom, offre.locataire_tel].filter(Boolean).join(' · ') },
  ].filter(Boolean) as { label: string; value: string }[];

  const enAttente = ['envoyee', 'vue'].includes(offre.statut);
  const lienAnnonce = offre.lien_annonce
    ? (/^https?:\/\//i.test(String(offre.lien_annonce).trim()) ? String(offre.lien_annonce).trim() : `https://${String(offre.lien_annonce).trim()}`)
    : null;
  const close = () => onOpenChange(false);

  const prochaineEtape = peutOrganiserVisite || offre.statut === 'visite_effectuee' || (onRespondInteret && offre.statut === 'refusee');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DETAIL_DIALOG}>
        <DetailHeader
          titleAs={DialogTitle}
          descriptionAs={DialogDescription}
          media={<OffreHero offre={offre} />}
          badge={
            <DashBadge tone={enAttente ? 'primary' : 'muted'}>
              {statutInfo.label.replace(/^[^\p{L}\p{N}]+/u, '')}
            </DashBadge>
          }
          title={
            <AddressLink
              address={offre.adresse}
              className="text-[19px] font-semibold leading-snug sm:text-xl"
              iconClassName="text-muted-foreground"
            />
          }
          subtitle={details || "Informations sur le bien proposé par votre agent"}
        />

        <DetailBody>
          <KeyFacts
            columns={4}
            items={[
              offre.prix ? { label: 'Loyer / mois', value: chfDetail(offre.prix), emphasis: true } : null,
              offre.pieces ? { label: 'Pièces', value: offre.pieces, icon: Home } : null,
              offre.surface ? { label: 'Surface', value: `${offre.surface} m²`, icon: Maximize } : null,
              offre.etage ? { label: 'Étage', value: offre.etage, icon: Layers } : null,
              offre.disponibilite ? { label: 'Disponible dès', value: offre.disponibilite, icon: CalendarCheck } : null,
            ]}
          />

          {/* Prochaine étape (les boutons sont dans la barre d'actions) */}
          {prochaineEtape && (
            <DetailSection className="bg-primary/5">
              {peutOrganiserVisite && (
                <>
                  <p className="text-[15px] font-semibold text-foreground">
                    {offre.statut === 'interesse' ? 'Organisez la visite' : 'Ce bien vous intéresse ?'}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Choisissez qui se rend sur place.</p>
                  {onRespondInteret && (
                    <button
                      type="button"
                      onClick={() => onRespondInteret(offre, 'refusee')}
                      className="mt-1 min-h-[44px] text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {offre.statut === 'interesse' ? 'Je ne suis plus intéressé' : 'Pas intéressé'}
                    </button>
                  )}
                </>
              )}
              {offre.statut === 'visite_effectuee' && (
                <>
                  <p className="text-[15px] font-semibold text-foreground">Vous avez visité ce bien</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Envoyez votre dossier pour postuler.</p>
                </>
              )}
              {onRespondInteret && offre.statut === 'refusee' && (
                <>
                  <p className="text-sm text-muted-foreground">Vous avez refusé cette offre.</p>
                  <button
                    type="button"
                    onClick={() => onRespondInteret(offre, 'interesse')}
                    className="mt-1 min-h-[44px] text-sm font-medium text-foreground underline underline-offset-4"
                  >
                    Finalement, ce bien m'intéresse
                  </button>
                </>
              )}
            </DetailSection>
          )}

          {/* Votre visite */}
          {offreVisites.length > 0 && (
            <DetailSection title="Votre visite" icon={Calendar}>
              <div className="divide-y divide-border/50">
                {offreVisites.map((v: any) => {
                  const medias = [
                    ...(Array.isArray(v.medias) ? v.medias : []),
                    ...(Array.isArray(v.medias_coursier) ? v.medias_coursier : []),
                  ];
                  return (
                    <div key={v.id} className="py-3 first:pt-0 last:pb-0">
                      {v.date_visite && <p className="text-[15px] font-semibold capitalize text-foreground">{formatDateVisite(v.date_visite)}</p>}
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {[libelleStatutVisite(v.statut), quiSOccupeDeLaVisite(v), medias.length > 0 ? `${medias.length} photo${medias.length > 1 ? 's' : ''} ou vidéo${medias.length > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
                      </p>
                      {v.client_decision && (
                        <p className="mt-1.5 text-sm text-foreground">
                          Votre décision : {v.client_decision === 'souhaite_postuler' ? 'je souhaite postuler' : v.client_decision === 'refuse' ? 'je ne postule pas' : v.client_decision}
                        </p>
                      )}
                      {(v.feedback_agent || v.feedback_coursier) && (
                        <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{v.feedback_agent || v.feedback_coursier}</p>
                      )}
                      {v.recommandation_agent && (
                        <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{v.recommandation_agent}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </DetailSection>
          )}

          {/* Suivi de la candidature */}
          {showWorkflow && (
            <DetailSection title="Suivi de votre candidature" icon={FileCheck}>
              <CandidatureWorkflowInteractive
                currentStatut={effectiveStatut}
                candidature={candidature}
                onProgressWorkflow={onProgressWorkflow}
              />
            </DetailSection>
          )}

          {/* Note de suivi (les notes techniques sont filtrées) */}
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

          {showChances && (
            <DetailSection title="Vos chances">
              <ChanceIndicator
                {...calculateChances(
                  offre,
                  clientData,
                  documentsStats[offre.id] || documentsStats['global'] || {
                    fiche_salaire: 0,
                    extrait_poursuites: 0,
                    piece_identite: 0,
                    permis_sejour: 0
                  },
                  visites
                )}
              />
            </DetailSection>
          )}

          {lienAnnonce && (
            <a
              href={lienAnnonce}
              target="_blank"
              rel="noopener noreferrer"
              className="imr-lg-card flex min-h-[60px] items-center justify-between gap-3 rounded-[22px] p-4 active:scale-[0.99]"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-foreground">Voir l'annonce d'origine</span>
                <span className="block truncate text-sm text-muted-foreground">{lienAnnonce.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          )}
        </DetailBody>

        <DetailActions>
          {/* Sur mobile, la croix et le glisser suffisent quand deux actions sont déjà proposées. */}
          <Button variant="ghost" onClick={close} className={peutOrganiserVisite && onDeleguerVisite ? 'max-sm:hidden' : undefined}>
            Fermer
          </Button>
          {peutOrganiserVisite && onDeleguerVisite && (
            <Button variant="outline" onClick={() => { close(); onDeleguerVisite(offre); }}>
              <User className="mr-2 h-4 w-4" />
              Mon agent visite pour moi
            </Button>
          )}
          {peutOrganiserVisite && (
            <Button onClick={() => { close(); onPlanVisit(offre); }}>
              <Calendar className="mr-2 h-4 w-4" />
              Je visite moi-même
            </Button>
          )}
          {offre.statut === 'visite_effectuee' && (
            <Button onClick={() => { close(); onPostulerDirect(offre); }}>
              <FileCheck className="mr-2 h-4 w-4" />
              Déposer ma candidature
            </Button>
          )}
        </DetailActions>
      </DialogContent>
    </Dialog>
  );
}


/** Photo principale de l'offre (galerie ou aperçu de l'annonce). */
function OffreHero({ offre }: { offre: any }) {
  const item = useMemo<ShowcaseItem>(() => ({
    id: offre.id,
    titre: offre.titre ?? null,
    type_bien: offre.type_bien ?? null,
    adresse: offre.adresse ?? null,
    prix: offre.prix ?? null,
    pieces: offre.pieces ?? null,
    surface: offre.surface ?? null,
    etage: offre.etage ?? null,
    lien_annonce: offre.lien_annonce ?? null,
    medias_galerie: offre.medias_galerie ?? null,
  }), [offre]);
  const img = usePreviewImage(item);
  return (
    <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-muted">
      {img ? (
        <img src={img} alt={offre.adresse || 'Photo du bien'} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Home className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
