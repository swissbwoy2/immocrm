import { useState } from "react";
import { Home, Plus } from "lucide-react";
import { useStories } from "./useStories";
import { StoryAvatar } from "./StoryAvatar";
import { StoryViewer } from "./StoryViewer";
import { CreateStoryDialog } from "./CreateStoryDialog";
import { ShowcaseVisitDialog } from "./ShowcaseVisitDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShowcaseItem,
  useShowcase,
  usePreviewImage,
  villeFromAdresse,
} from "@/components/public-site/showcase/useShowcase";
import { ExternalListingPlaceholder } from "@/components/public/ExternalListingPlaceholder";
import { useSourcedListingAccess } from "@/hooks/useSourcedListingAccess";


interface Props {
  className?: string;
  /** Masque la bande « Visites à venir » (utilisé pour le dashboard candidat). */
  showVisites?: boolean;
}

const BUBBLE = 64;

/** « Lun. 14:30 » / « Auj. 14:30 » / « Dem. 9:00 » (heure suisse). */
function quandVisite(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const tz = { timeZone: "Europe/Zurich" } as const;
  const jour = (x: Date) => x.toLocaleDateString("fr-CA", tz);
  const now = new Date();
  const demain = new Date(now.getTime() + 86400000);
  const heure = d.toLocaleTimeString("fr-CH", { ...tz, hour: "2-digit", minute: "2-digit" });
  if (jour(d) === jour(now)) return `Auj. ${heure}`;
  if (jour(d) === jour(demain)) return `Dem. ${heure}`;
  const j = d.toLocaleDateString("fr-CH", { ...tz, weekday: "short", day: "numeric" }).replace(".", "");
  return `${j.charAt(0).toUpperCase()}${j.slice(1)}`;
}

/** Bulle d'une visite publique à venir (anonymisée, sans donnée client). */
function VisitBubble({ item, onClick }: { item: ShowcaseItem; onClick: () => void }) {
  const { canViewInternalListing } = useSourcedListingAccess();
  const img = usePreviewImage(item, canViewInternalListing);
  const [broken, setBroken] = useState(false);
  const ville = villeFromAdresse(item.adresse);
  const quand = quandVisite(item.date_visite);

  return (
    <button
      type="button"
      onClick={onClick}
      className="imr-story-btn flex w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Visite à venir${ville ? ` à ${ville}` : ""}${quand ? `, ${quand}` : ""}`}
    >
      <span className="relative">
        <span className="imr-story-ring block" style={{ width: BUBBLE, height: BUBBLE }}>
          <span className="imr-story-inner">
            <span className="imr-story-media">
              {img && !broken ? (
                <img src={img} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
              ) : canViewInternalListing || broken ? (
                <Home className="h-5 w-5 text-primary/70" />
              ) : (
                <ExternalListingPlaceholder className="rounded-full" />
              )}
            </span>
          </span>
        </span>
        {quand && (
          <span className="imr-lg-glass absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-[1px] text-[10px] font-semibold leading-4 text-foreground">
            {quand}
          </span>
        )}
      </span>
      <span className="mt-0.5 w-full truncate text-center text-[11.5px] font-medium text-foreground/85">{ville || "Visite"}</span>
    </button>
  );
}


/**
 * Horizontal stories bar (WhatsApp / Insta style).
 * - Admin & agent see a "+ Votre story" bubble to create one.
 * - Everyone sees active stories grouped by author.
 * - Plus a static (no auto-scroll) "Visites à venir" strip of anonymized public visits.
 */
export function StoriesBar({ className, showVisites = true }: Props) {
  const { userRole } = useAuth();
  const { groups, loading, refresh } = useStories();
  const { visites } = useShowcase();
  const [viewerOpen, setViewerOpen] = useState<number | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<ShowcaseItem | null>(null);

  const canPublish = userRole === "admin" || userRole === "agent";

  if (!loading && groups.length === 0 && !canPublish && (!showVisites || visites.length === 0)) return null;


  return (
    <div className={"px-3 pb-1 pt-3 " + (className || "")}>
      <div className="imr-lg-card overflow-hidden rounded-[26px]">
        <div className="flex snap-x items-end gap-2.5 overflow-x-auto overscroll-x-contain px-3 pb-3 pt-3 no-scrollbar">
          {canPublish && (
            <button
              type="button"
              onClick={() => setCreatorOpen(true)}
              className="imr-story-btn flex w-[72px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Publier une story"
            >
              <span className="relative">
                <span className="imr-lg-glass flex items-center justify-center rounded-full" style={{ width: BUBBLE, height: BUBBLE }}>
                  <span className="imr-lg-tint flex h-10 w-10 items-center justify-center rounded-full">
                    <Plus className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                </span>
              </span>
              <span className="mt-0.5 w-full truncate text-center text-[11.5px] font-medium text-foreground/85">Votre story</span>
            </button>
          )}

          {groups.map((g, idx) => (
            <button
              key={g.author.user_id}
              type="button"
              onClick={() => setViewerOpen(idx)}
              className="imr-story-btn flex w-[72px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Story de ${g.author.name}`}
            >
              <StoryAvatar name={g.author.name} avatarUrl={g.author.avatar_url} viewed={g.allViewed} size={BUBBLE} />
              <span className="mt-0.5 w-full truncate text-center text-[11.5px] font-medium text-foreground/85">{g.author.name.split(" ")[0]}</span>
            </button>
          ))}

          {showVisites && visites.length > 0 && (
            <div className="flex shrink-0 snap-start items-stretch gap-2.5">
              {(canPublish || groups.length > 0) && <span className="my-2 w-px shrink-0 bg-black/[0.08] dark:bg-white/10" aria-hidden />}
              <div className="flex flex-col gap-2">
                <span className="imr-lg-glass w-fit rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-primary">
                  Visites à venir · {visites.length}
                </span>
                <div className="flex gap-2.5">
                  {visites.map((v) => (
                    <VisitBubble key={v.id} item={v} onClick={() => setSelectedVisit(v)} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ShowcaseVisitDialog item={selectedVisit} onOpenChange={(o) => !o && setSelectedVisit(null)} />


      {viewerOpen !== null && groups[viewerOpen] && (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewerOpen}
          onClose={() => {
            setViewerOpen(null);
            refresh();
          }}
        />
      )}

      <CreateStoryDialog open={creatorOpen} onOpenChange={setCreatorOpen} onCreated={refresh} />
    </div>
  );
}
