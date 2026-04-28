import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChapterProgress {
  chapitre_id: string;
  completed_at: string | null;
  checklist_state: Record<string, boolean>;
  quiz_score: number | null;
}

export function useFormationProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, ChapterProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('formation_progress')
        .select('chapitre_id, completed_at, checklist_state, quiz_score')
        .eq('user_id', user.id);
      if (!active) return;
      const map: Record<string, ChapterProgress> = {};
      (data || []).forEach((row: any) => {
        map[row.chapitre_id] = {
          chapitre_id: row.chapitre_id,
          completed_at: row.completed_at,
          checklist_state: (row.checklist_state || {}) as Record<string, boolean>,
          quiz_score: row.quiz_score,
        };
      });
      setProgress(map);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const upsert = useCallback(
    async (chapitre_id: string, patch: Partial<Omit<ChapterProgress, 'chapitre_id'>>) => {
      if (!user) return;
      const current = progress[chapitre_id] || {
        chapitre_id,
        completed_at: null,
        checklist_state: {},
        quiz_score: null,
      };
      const next = { ...current, ...patch };
      setProgress((p) => ({ ...p, [chapitre_id]: next }));
      await supabase.from('formation_progress').upsert(
        {
          user_id: user.id,
          chapitre_id,
          completed_at: next.completed_at,
          checklist_state: next.checklist_state,
          quiz_score: next.quiz_score,
        },
        { onConflict: 'user_id,chapitre_id' }
      );
    },
    [user, progress]
  );

  const toggleChecklistItem = useCallback(
    (chapitre_id: string, checklistId: string, itemId: string, checked: boolean) => {
      const current = progress[chapitre_id]?.checklist_state || {};
      const key = `${checklistId}.${itemId}`;
      upsert(chapitre_id, { checklist_state: { ...current, [key]: checked } });
    },
    [progress, upsert]
  );

  const markCompleted = useCallback(
    (chapitre_id: string) => {
      upsert(chapitre_id, { completed_at: new Date().toISOString() });
    },
    [upsert]
  );

  const saveQuizScore = useCallback(
    (chapitre_id: string, score: number) => {
      upsert(chapitre_id, { quiz_score: score, completed_at: new Date().toISOString() });
    },
    [upsert]
  );

  return {
    progress,
    loading,
    toggleChecklistItem,
    markCompleted,
    saveQuizScore,
  };
}
