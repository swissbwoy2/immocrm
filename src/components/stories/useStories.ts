import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StoryRow {
  id: string;
  author_user_id: string;
  author_role: "admin" | "agent";
  author_agent_id: string | null;
  type: "image" | "video" | "text";
  media_url: string | null;
  media_path: string | null;
  text_content: string | null;
  background_color: string | null;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface AuthorProfile {
  user_id: string;
  name: string;
  avatar_url?: string | null;
  role: "admin" | "agent";
}

export interface StoryGroup {
  author: AuthorProfile;
  stories: StoryRow[];
  allViewed: boolean;
}

/**
 * Load active (non-expired) stories, grouped by author, along with author profiles
 * and the current user's view-status.
 */
export function useStories() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const nowIso = new Date().toISOString();
        const { data: stories } = await supabase
          .from("stories")
          .select("*")
          .eq("is_active", true)
          .gt("expires_at", nowIso)
          .order("created_at", { ascending: true });

        const list = (stories ?? []) as StoryRow[];
        if (list.length === 0) {
          if (!cancelled) setGroups([]);
          return;
        }

        const authorIds = Array.from(new Set(list.map((s) => s.author_user_id)));

        const [profilesRes, viewsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, prenom, nom, avatar_url")
            .in("id", authorIds),
          supabase
            .from("story_views")
            .select("story_id")
            .eq("viewer_user_id", user.id)
            .in("story_id", list.map((s) => s.id)),
        ]);

        const profMap = new Map<string, any>();
        for (const p of profilesRes.data ?? []) profMap.set(p.id, p);
        const viewed = new Set<string>((viewsRes.data ?? []).map((v: any) => v.story_id));

        const byAuthor = new Map<string, StoryRow[]>();
        for (const s of list) {
          const arr = byAuthor.get(s.author_user_id) ?? [];
          arr.push(s);
          byAuthor.set(s.author_user_id, arr);
        }

        const built: StoryGroup[] = [];
        for (const [authorId, stories] of byAuthor.entries()) {
          const p = profMap.get(authorId);
          const name = p
            ? [p.prenom, p.nom].filter(Boolean).join(" ") || "Utilisateur"
            : "Utilisateur";
          built.push({
            author: {
              user_id: authorId,
              name,
              avatar_url: p?.avatar_url ?? null,
              role: stories[0].author_role,
            },
            stories,
            allViewed: stories.every((s) => viewed.has(s.id)),
          });
        }

        // Sort: unviewed first, then most recent story
        built.sort((a, b) => {
          if (a.allViewed !== b.allViewed) return a.allViewed ? 1 : -1;
          const ta = Math.max(...a.stories.map((s) => new Date(s.created_at).getTime()));
          const tb = Math.max(...b.stories.map((s) => new Date(s.created_at).getTime()));
          return tb - ta;
        });

        if (!cancelled) setGroups(built);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, refreshTick]);

  return { groups, loading, refresh };
}
