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


interface Props {
  className?: string;
}

/** Round anonymized bubble for an upcoming public visit (no client data). */
function VisitBubble({ item, onClick }: { item: ShowcaseItem; onClick: () => void }) {
  const img = usePreviewImage(item);
  const ville = villeFromAdresse(item.adresse);

  return (
    <div className="flex flex-col items-center gap-1 shrink-0 w-16">
      <button type="button" onClick={onClick} className="rounded-full">
        <span
          className="block rounded-full p-[2.5px]"
          style={{
            background: "linear-gradient(135deg, hsl(158 55% 38%), hsl(200 70% 45%))",
            width: 60,
            height: 60,
          }}
        >
          <span className="block bg-background rounded-full p-[2px] w-full h-full">
            <span className="w-full h-full rounded-full overflow-hidden bg-muted flex items-center justify-center">
              {img ? (
                <img src={img} alt={item.titre || "Bien"} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <Home className="h-5 w-5 text-muted-foreground" />
              )}
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onClick}
        className="text-[11px] font-medium truncate w-full text-center"
        style={{ color: "hsl(200 35% 18%)" }}
      >
        {ville || "Visite"}
      </button>
    </div>
  );
}


/**
 * Horizontal stories bar (WhatsApp / Insta style).
 * - Admin & agent see a "+ Votre story" bubble to create one.
 * - Everyone sees active stories grouped by author.
 * - Plus a static (no auto-scroll) "Visites à venir" strip of anonymized public visits.
 */
export function StoriesBar({ className }: Props) {
  const { userRole } = useAuth();
  const { groups, loading, refresh } = useStories();
  const { visites } = useShowcase();
  const [viewerOpen, setViewerOpen] = useState<number | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<ShowcaseItem | null>(null);

  const canPublish = userRole === "admin" || userRole === "agent";

  if (!loading && groups.length === 0 && !canPublish && visites.length === 0) return null;


  return (
    <div
      className={"border-b border-border/50 " + (className || "")}
      style={{ background: "linear-gradient(180deg, hsl(160 30% 94% / 0.5), transparent)" }}
    >
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-3 py-3">
        {canPublish && (
          <button
            type="button"
            onClick={() => setCreatorOpen(true)}
            className="flex flex-col items-center gap-1 shrink-0 w-16 group"
          >
            <div className="relative">
              <div
                className="w-[60px] h-[60px] rounded-full flex items-center justify-center border-2 border-dashed"
                style={{ borderColor: "hsl(158 55% 38%)", background: "hsl(160 30% 94%)" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                  style={{ background: "hsl(158 55% 38%)" }}
                >
                  <Plus className="h-5 w-5" />
                </div>
              </div>
            </div>
            <span className="text-[11px] font-medium truncate w-full text-center" style={{ color: "hsl(200 35% 18%)" }}>
              Votre story
            </span>
          </button>
        )}

        {groups.map((g, idx) => (
          <button
            key={g.author.user_id}
            type="button"
            onClick={() => setViewerOpen(idx)}
            className="flex flex-col items-center gap-1 shrink-0 w-16"
          >
            <StoryAvatar name={g.author.name} avatarUrl={g.author.avatar_url} viewed={g.allViewed} />
            <span className="text-[11px] font-medium truncate w-full text-center" style={{ color: "hsl(200 35% 18%)" }}>
              {g.author.name.split(" ")[0]}
            </span>
          </button>
        ))}

        {visites.length > 0 && (
          <>
            <div className="shrink-0 self-stretch w-px bg-border/70 mx-1" />
            <div className="flex flex-col gap-1 shrink-0">
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-1"
                style={{ color: "hsl(158 55% 32%)" }}
              >
                Visites à venir
              </span>
              <div className="flex gap-3">
                {visites.map((v) => (
                  <VisitBubble key={v.id} item={v} onClick={() => setSelectedVisit(v)} />
                ))}
              </div>
            </div>
          </>
        )}
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
