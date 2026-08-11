import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CoursierTimeEntry {
  id: string;
  coursier_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
}

export const DEFAULT_TARIF_HORAIRE = 20;

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  return `${h}h${String(rest).padStart(2, '0')}`;
}

export function formatChrono(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
}

/**
 * Pointage global du coursier (clock in / clock out) + calcul des gains horaires.
 */
export function useCoursierTime() {
  const { user } = useAuth();
  const [coursierId, setCoursierId] = useState<string | null>(null);
  const [tarifHoraire, setTarifHoraire] = useState<number>(DEFAULT_TARIF_HORAIRE);
  const [entries, setEntries] = useState<CoursierTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const coursierIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data: coursier } = await supabase
        .from('coursiers')
        .select('id, tarif_horaire')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!coursier) {
        setLoading(false);
        return;
      }
      setCoursierId(coursier.id);
      coursierIdRef.current = coursier.id;
      setTarifHoraire(Number((coursier as any).tarif_horaire ?? DEFAULT_TARIF_HORAIRE));

      const { data } = await supabase
        .from('coursier_time_entries')
        .select('id, coursier_id, started_at, ended_at, duration_minutes')
        .eq('coursier_id', coursier.id)
        .order('started_at', { ascending: false })
        .limit(1000);

      setEntries((data as any) || []);
    } catch (e) {
      console.error('[useCoursierTime] load error', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) load();
  }, [user?.id, load]);

  const active = entries.find((e) => !e.ended_at) || null;

  // Tick only while a session is running
  useEffect(() => {
    if (!active) return;
    const int = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(int);
  }, [active?.id]);

  const elapsedSeconds = active
    ? Math.max(0, Math.floor((nowTs - new Date(active.started_at).getTime()) / 1000))
    : 0;

  const clockIn = async () => {
    const cid = coursierIdRef.current;
    if (!cid || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('coursier_time_entries')
        .insert({ coursier_id: cid, started_at: new Date().toISOString() });
      if (error) throw error;
      toast.success('Arrivée pointée ⏱️');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Impossible de pointer votre arrivée');
    } finally {
      setBusy(false);
    }
  };

  const clockOut = async () => {
    if (!active || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('coursier_time_entries')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', active.id);
      if (error) throw error;
      toast.success('Départ pointé ✅');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Impossible de pointer votre départ');
    } finally {
      setBusy(false);
    }
  };

  const closed = entries.filter((e) => e.ended_at);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const minutesTotal = closed.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const minutesThisMonth = closed
    .filter((e) => new Date(e.started_at) >= startOfMonth)
    .reduce((s, e) => s + (e.duration_minutes || 0), 0);

  return {
    coursierId,
    tarifHoraire,
    entries,
    closedEntries: closed,
    active,
    elapsedSeconds,
    loading,
    busy,
    clockIn,
    clockOut,
    reload: load,
    minutesTotal,
    minutesThisMonth,
    earningsTotal: (minutesTotal / 60) * tarifHoraire,
    earningsThisMonth: (minutesThisMonth / 60) * tarifHoraire,
  };
}
