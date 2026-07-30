import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { StoryGroup, StoryRow } from "./useStories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X, Trash2, Eye, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useImmersiveMode } from "@/contexts/MobileImmersiveContext";


const QUICK_EMOJIS = ["❤️", "🔥", "😍", "👍", "😮", "👏"];
const IMAGE_DURATION_MS = 5000;

interface Props {
  groups: StoryGroup[];
  startGroupIndex: number;
  onClose: () => void;
  onViewed?: (storyId: string) => void;
}

export function StoryViewer({ groups, startGroupIndex, onClose, onViewed }: Props) {
  const { user } = useAuth();
  useImmersiveMode(true);
  const [gi, setGi] = useState(startGroupIndex);

  const [si, setSi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [comment, setComment] = useState("");
  const [insights, setInsights] = useState<{
    views: number;
    viewers: { user_id: string; viewed_at: string; name: string; avatar_url: string | null }[];
    reactions: { emoji: string; count: number }[];
    comments: { id: string; content: string; user_id: string; created_at: string }[];
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(Date.now());
  const progressRef = useRef<number>(0);


  const group = groups[gi];
  const story: StoryRow | undefined = group?.stories[si];
  const isAuthor = story && user?.id === story.author_user_id;

  const goNext = useCallback(() => {
    if (!group) return;
    if (si + 1 < group.stories.length) {
      setSi(si + 1);
    } else if (gi + 1 < groups.length) {
      setGi(gi + 1);
      setSi(0);
    } else {
      onClose();
    }
  }, [group, gi, si, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) {
      const prev = groups[gi - 1];
      setGi(gi - 1);
      setSi(prev.stories.length - 1);
    }
  }, [gi, si, groups]);

  // Record view + fetch insights for author
  useEffect(() => {
    if (!story || !user) return;
    progressRef.current = 0;
    setProgress(0);
    setInsights(null);
    startRef.current = Date.now();


    (async () => {
      await supabase
        .from("story_views")
        .insert({ story_id: story.id, viewer_user_id: user.id })
        .then(() => onViewed?.(story.id));

      if (user.id === story.author_user_id) {
        const [v, r, c] = await Promise.all([
          supabase
            .from("story_views")
            .select("viewer_user_id, viewed_at")
            .eq("story_id", story.id)
            .order("viewed_at", { ascending: false }),
          supabase.from("story_reactions").select("emoji").eq("story_id", story.id),
          supabase
            .from("story_comments")
            .select("id, content, user_id, created_at")
            .eq("story_id", story.id)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);
        const emojiMap = new Map<string, number>();
        for (const row of (r.data ?? []) as any[]) {
          emojiMap.set(row.emoji, (emojiMap.get(row.emoji) ?? 0) + 1);
        }
        const viewerRows = (v.data ?? []) as { viewer_user_id: string; viewed_at: string }[];
        const uniqueViewerIds = Array.from(new Set(viewerRows.map((x) => x.viewer_user_id)));
        let profMap = new Map<string, { prenom?: string; nom?: string; avatar_url?: string | null }>();
        if (uniqueViewerIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, prenom, nom, avatar_url")
            .in("id", uniqueViewerIds);
          for (const p of (profs ?? []) as any[]) profMap.set(p.id, p);
        }
        const viewers = viewerRows.map((row) => {
          const p = profMap.get(row.viewer_user_id);
          const name = p ? [p.prenom, p.nom].filter(Boolean).join(" ") || "Utilisateur" : "Utilisateur";
          return {
            user_id: row.viewer_user_id,
            viewed_at: row.viewed_at,
            name,
            avatar_url: p?.avatar_url ?? null,
          };
        });
        setInsights({
          views: viewerRows.length,
          viewers,
          reactions: Array.from(emojiMap.entries()).map(([emoji, count]) => ({ emoji, count })),
          comments: (c.data ?? []) as any,
        });
      }
    })();
  }, [story?.id, user, onViewed, story]);

  // Auto-advance (images/text only : la vidéo pilote sa propre progression)
  useEffect(() => {
    if (!story || paused) return;
    if (story.type === "video") return;
    // Ne démarre le timer image qu'une fois le média chargé (évite un flash noir + avance immédiate)
    if (story.type === "image" && !mediaReady && !mediaError) return;

    const duration = IMAGE_DURATION_MS;
    startRef.current = Date.now() - (progressRef.current / 100) * duration;

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(100, (elapsed / duration) * 100);
      progressRef.current = p;
      setProgress(p);
      if (p >= 100) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, story?.type, paused, goNext, mediaReady, mediaError]);


  // Pause / reprise de la vidéo
  useEffect(() => {
    const v = videoRef.current;
    if (!v || story?.type !== "video") return;
    if (paused) v.pause();
    else void v.play().catch(() => {});
  }, [paused, story?.id, story?.type]);


  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "ArrowDown") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  if (!story) return null;

  async function react(emoji: string) {
    if (!user || !story) return;
    const { error } = await supabase
      .from("story_reactions")
      .upsert({ story_id: story.id, user_id: user.id, emoji }, { onConflict: "story_id,user_id" });
    if (error) toast.error("Impossible d'ajouter la réaction");
    else toast.success(`${emoji} envoyé`);
  }

  async function sendComment() {
    if (!user || !story || !comment.trim()) return;
    const { error } = await supabase
      .from("story_comments")
      .insert({ story_id: story.id, user_id: user.id, content: comment.trim() });
    if (error) toast.error("Impossible d'envoyer");
    else {
      toast.success("Réponse envoyée");
      setComment("");
    }
  }

  async function deleteStory() {
    if (!story) return;
    if (!confirm("Supprimer cette story ?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) toast.error("Suppression échouée");
    else {
      toast.success("Story supprimée");
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center touch-none"
      style={{ height: '100dvh' }}
      data-immersive-overlay
    >
      {/* Progress bars */}
      <div
        className="absolute left-0 right-0 z-10 flex gap-1 p-2"
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
      >

        {group.stories.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full bg-white transition-[width] duration-100"
              style={{
                width: `${i < si ? 100 : i === si ? progress : 0}%`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div
        className="absolute left-0 right-0 z-10 flex items-center justify-between px-3 pt-3"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >

        <div className="flex items-center gap-2 text-white">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, hsl(158 55% 38%), hsl(200 70% 45%))" }}
          >
            {group.author.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{group.author.name}</p>
            <p className="text-[11px] opacity-80">
              {formatDistanceToNow(new Date(story.created_at), { locale: fr, addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAuthor && (
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={deleteStory}>
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Media */}
      <div
        className="relative w-full h-full max-w-[500px] max-h-[100dvh] flex items-center justify-center"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {story.type === "image" && story.media_url && (
          <img src={story.media_url} className="max-w-full max-h-full object-contain" alt="story" />
        )}
        {story.type === "video" && story.media_url && (
          <video
            ref={videoRef}
            src={story.media_url}
            className="max-w-full max-h-full"
            autoPlay
            playsInline
            controls={false}
            onLoadedMetadata={() => {
              progressRef.current = 0;
              setProgress(0);
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (!v.duration || !isFinite(v.duration)) return;
              const p = Math.min(100, (v.currentTime / v.duration) * 100);
              progressRef.current = p;
              setProgress(p);
            }}
            onEnded={goNext}
          />
        )}

        {story.type === "text" && (
          <div
            className="w-full h-full flex items-center justify-center p-8 text-white text-center text-2xl font-semibold"
            style={{ background: story.background_color || "hsl(158 55% 38%)" }}
          >
            {story.text_content}
          </div>
        )}
        {(story.type !== "text" && story.text_content) && (
          <div className="absolute bottom-24 left-0 right-0 px-6 text-white text-center text-sm bg-gradient-to-t from-black/80 to-transparent py-3">
            {story.text_content}
          </div>
        )}

        {/* Tap zones */}
        <button
          type="button"
          onClick={goPrev}
          aria-label="Précédent"
          className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start pl-2 text-white/0 hover:text-white/40 transition-colors"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Suivant"
          className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-2 text-white/0 hover:text-white/40 transition-colors"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-black/70 to-transparent">
        {isAuthor && insights ? (
          <div className="text-white space-y-2 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{insights.views}</span>
              {insights.reactions.map((r) => (
                <span key={r.emoji} className="flex items-center gap-1">
                  <span>{r.emoji}</span>
                  <span className="text-xs">{r.count}</span>
                </span>
              ))}
            </div>
            {insights.viewers.length > 0 && (
              <div className="space-y-1 bg-white/10 rounded-md p-2">
                <p className="text-[11px] uppercase tracking-wide opacity-70 mb-1">Vu par</p>
                {insights.viewers.map((v) => (
                  <div key={`${v.user_id}-${v.viewed_at}`} className="flex items-center gap-2 text-xs">
                    {v.avatar_url ? (
                      <img src={v.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
                        style={{ background: "linear-gradient(135deg, hsl(158 55% 38%), hsl(200 70% 45%))" }}
                      >
                        {v.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="flex-1 truncate">{v.name}</span>
                    <span className="opacity-70">
                      {formatDistanceToNow(new Date(v.viewed_at), { locale: fr, addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {insights.comments.length > 0 && (
              <div className="space-y-1 text-xs bg-white/10 rounded-md p-2">
                <p className="text-[11px] uppercase tracking-wide opacity-70 mb-1">Réponses</p>
                {insights.comments.map((c) => (
                  <div key={c.id} className="truncate">
                    <span className="opacity-70">•</span> {c.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center gap-2">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => react(e)}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendComment();
                }}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                placeholder="Répondre..."
                className={cn(
                  "bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-full"
                )}
              />
              <Button
                size="icon"
                onClick={sendComment}
                disabled={!comment.trim()}
                style={{ background: "hsl(158 55% 38%)", color: "white" }}
                className="rounded-full shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
