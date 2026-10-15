import { useEffect, useState } from 'react';
import { Infinity as InfinityIcon, CalendarDays, Home, Heart, CalendarCheck, FileText, Handshake } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PremiumKPICard } from '@/components/premium';

/**
 * Parcours ACHAT : crédits illimités (aucun décompte, aucune coupure).
 * À la place du compteur, on suit l'activité réelle du mandat : jours, biens, visites, comptes rendus, offres.
 * Lecture seule — chaque requête est limitée par la RLS (client : ses données ; admin/agent : leurs clients).
 */
const SELECTIONNES = ['interesse', 'visite_planifiee', 'visite_effectuee', 'offre_envisagee', 'souhaite_postuler'];

interface Props {
  clientId?: string | null;
  projectId?: string | null;
  dateDebut?: string | null;
  className?: string;
}

interface Compteurs {
  jours: number;
  proposes: number;
  selectionnes: number;
  visites: number;
  comptesRendus: number;
  offresAchat: number;
}

export function AchatSuiviCompteurs({ clientId, projectId, dateDebut, className }: Props) {
  const [c, setC] = useState<Compteurs | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const jours = dateDebut
        ? Math.max(0, Math.floor((Date.now() - new Date(dateDebut).getTime()) / 86400000))
        : 0;
      const safeCount = async (q: PromiseLike<{ count: number | null; error: any }>) => {
        try { const { count, error } = await q; return error ? 0 : (count ?? 0); } catch { return 0; }
      };
      const [proposes, selectionnes, visites, comptesRendus, offresAchat] = await Promise.all([
        clientId ? safeCount(supabase.from('offres').select('id', { count: 'exact', head: true }).eq('client_id', clientId) as any) : Promise.resolve(0),
        clientId ? safeCount(supabase.from('offres').select('id', { count: 'exact', head: true }).eq('client_id', clientId).in('statut', SELECTIONNES) as any) : Promise.resolve(0),
        clientId ? safeCount(supabase.from('visites').select('id', { count: 'exact', head: true }).eq('client_id', clientId).neq('statut', 'annulee') as any) : Promise.resolve(0),
        projectId ? safeCount((supabase.from as any)('purchase_visit_reports').select('id', { count: 'exact', head: true }).eq('project_id', projectId)) : Promise.resolve(0),
        projectId ? safeCount((supabase.from as any)('purchase_negotiations').select('id', { count: 'exact', head: true }).eq('project_id', projectId)) : Promise.resolve(0),
      ]);
      if (alive) setC({ jours, proposes, selectionnes, visites, comptesRendus, offresAchat });
    })();
    return () => { alive = false; };
  }, [clientId, projectId, dateDebut]);

  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <InfinityIcon className="h-3.5 w-3.5" /> Crédits illimités — mandat d'achat
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 items-stretch">
        <PremiumKPICard title="Jours d'accompagnement" value={c ? c.jours : '—'} icon={CalendarDays} />
        <PremiumKPICard title="Biens proposés" value={c ? c.proposes : '—'} icon={Home} />
        <PremiumKPICard title="Biens sélectionnés" value={c ? c.selectionnes : '—'} icon={Heart} variant="success" />
        <PremiumKPICard title="Visites" value={c ? c.visites : '—'} icon={CalendarCheck} />
        <PremiumKPICard title="Comptes rendus" value={c ? c.comptesRendus : '—'} icon={FileText} />
        <PremiumKPICard title="Offres d'achat" value={c ? c.offresAchat : '—'} icon={Handshake} variant="warning" />
      </div>
    </div>
  );
}
