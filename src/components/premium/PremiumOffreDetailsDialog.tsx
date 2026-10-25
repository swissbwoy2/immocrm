import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { Home, Calendar, FileCheck, User, ExternalLink } from "lucide-react";
import { usePreviewImage, type ShowcaseItem } from "@/components/public-site/showcase/useShowcase";
import { cn } from "@/lib/utils";
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
    case "planifiee": return "Visite planifiee";
    case "effectuee": return "Visite effectuee";
    case "annulee": return "Visite annulee";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl sm:rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Détail de l'offre</DialogTitle>
          <DialogDescription>Informations sur le bien proposé par votre agent</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo */}
          <OffreHero offre={offre} />

          {/* En-tête : statut, adresse, loyer */}
          <div>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none',
                enAttente ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
              )}
            >
              {statutInfo.label.replace(/^[^\p{L}\p{N}]+/u, '')}
            </span>
            <AddressLink
              address={offre.adresse}
              className="mt-3 text-xl font-semibold leading-snug"
              iconClassName="text-muted-foreground"
            />
            {details && <p className="mt-1 text-[15px] text-muted-foreground">{details}</p>}
            {offre.prix ? (
              <p className="mt-2 text-[17px] text-foreground">
                <span className="font-semibold">CHF {Number(offre.prix).toLocaleString('fr-CH')}</span>
                <span className="text-muted-foreground"> / mois</span>
              </p>
            ) : null}
          </div>

          {/* Prochaine étape */}
          {(peutOrganiserVisite || offre.statut === 'visite_effectuee' || (onRespondInteret && offre.statut === 'refusee')) && (
            <div className="rounded-xl border border-border/70 p-4">
              {peutOrganiserVisite && (
                <>
                  <p className="text-[15px] font-semibold text-foreground">
                    {offre.statut === 'interesse' ? 'Organisez la visite' : 'Ce bien vous intéresse ?'}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Choisissez qui se rend sur place.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Button className="h-11 rounded-full" onClick={() => { close(); onPlanVisit(offre); }}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Je visite moi-même
                    </Button>
                    {onDeleguerVisite && (
                      <Button variant="outline" className="h-11 rounded-full" onClick={() => { close(); onDeleguerVisite(offre); }}>
                        <User className="mr-2 h-4 w-4" />
                        Mon agent visite pour moi
                      </Button>
                    )}
                  </div>
                  {onRespondInteret && (
                    <button
                      type="button"
                      onClick={() => onRespondInteret(offre, 'refusee')}
                      className="mt-2 w-full py-1.5 text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
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
                  <Button className="mt-3 h-11 w-full rounded-full" onClick={() => { close(); onPostulerDirect(offre); }}>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Déposer ma candidature
                  </Button>
                </>
              )}
              {onRespondInteret && offre.statut === 'refusee' && (
                <>
                  <p className="text-sm text-muted-foreground">Vous avez refusé cette offre.</p>
                  <button
                    type="button"
                    onClick={() => onRespondInteret(offre, 'interesse')}
                    className="mt-1 text-sm font-medium text-foreground underline underline-offset-4"
                  >
                    Finalement, ce bien m'intéresse
                  </button>
                </>
              )}
            </div>
          )}

          {/* Votre visite */}
          {offreVisites.length > 0 && (
            <Bloc titre="Votre visite">
              <div className="space-y-3">
                {offreVisites.map((v: any) => {
                  const medias = [
                    ...(Array.isArray(v.medias) ? v.medias : []),
                    ...(Array.isArray(v.medias_coursier) ? v.medias_coursier : []),
                  ];
                  return (
                    <div key={v.id} className="rounded-xl bg-muted/50 p-3.5">
                      {v.date_visite && <p className="text-sm font-semibold capitalize text-foreground">{formatDateVisite(v.date_visite)}</p>}
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
            </Bloc>
          )}

          {/* Suivi de la candidature */}
          {showWorkflow && (
            <Bloc titre="Suivi de votre candidature">
              <CandidatureWorkflowInteractive
                currentStatut={effectiveStatut}
                candidature={candidature}
                onProgressWorkflow={onProgressWorkflow}
              />
            </Bloc>
          )}

          {/* Mot de l'agent */}
          {offre.commentaires && (
            <Bloc titre="Le mot de votre agent">
              <p className="whitespace-pre-line rounded-xl bg-muted/50 p-3.5 text-sm leading-relaxed text-foreground">{offre.commentaires}</p>
            </Bloc>
          )}

          {/* Description */}
          {offre.description && (
            <Bloc titre="Description">
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{offre.description}</p>
            </Bloc>
          )}

          {/* Informations utiles */}
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

          {/* Vos chances */}
          {showChances && (
            <Bloc titre="Vos chances">
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
            </Bloc>
          )}

          {/* Annonce d'origine */}
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
    <div className="aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted">
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
