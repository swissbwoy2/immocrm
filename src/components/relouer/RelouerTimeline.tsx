import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Upload, Trash2, Calendar, CheckCircle2, XCircle, UserCheck, FileEdit, Image as ImageIcon, FileText, Clock,
} from 'lucide-react';

const EVENT_META: Record<string, { label: string; icon: any; cls: string }> = {
  request_created:     { label: 'Demande créée',           icon: Sparkles,    cls: 'text-sky-600 bg-sky-50' },
  agent_assigned:      { label: 'Agent assigné',           icon: UserCheck,   cls: 'text-indigo-600 bg-indigo-50' },
  status_changed:      { label: 'Statut modifié',          icon: FileEdit,    cls: 'text-amber-600 bg-amber-50' },
  photo_uploaded:      { label: 'Photo ajoutée',           icon: ImageIcon,   cls: 'text-emerald-600 bg-emerald-50' },
  photo_deleted:       { label: 'Photo supprimée',         icon: Trash2,      cls: 'text-rose-600 bg-rose-50' },
  document_uploaded:   { label: 'Document ajouté',         icon: FileText,    cls: 'text-emerald-600 bg-emerald-50' },
  document_deleted:    { label: 'Document supprimé',       icon: Trash2,      cls: 'text-rose-600 bg-rose-50' },
  slot_proposed:       { label: 'Créneau proposé',         icon: Calendar,    cls: 'text-amber-600 bg-amber-50' },
  slot_added:          { label: 'Créneau ajouté',          icon: Calendar,    cls: 'text-indigo-600 bg-indigo-50' },
  slot_accepted:       { label: 'Créneau accepté',         icon: CheckCircle2,cls: 'text-emerald-600 bg-emerald-50' },
  slot_rejected:       { label: 'Créneau refusé',          icon: XCircle,     cls: 'text-rose-600 bg-rose-50' },
  slot_deleted:        { label: 'Créneau supprimé',        icon: Trash2,      cls: 'text-rose-600 bg-rose-50' },
};

export function RelouerTimeline({ requestId, limit = 50 }: { requestId: string; limit?: number }) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!requestId) return;
    supabase
      .from('relouer_timeline')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => setItems(data || []));
  }, [requestId, limit]);

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground py-4">Aucun événement pour le moment.</div>;
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
      <div className="space-y-3">
        {items.map((it) => {
          const m = EVENT_META[it.event_type] || { label: it.event_type, icon: Clock, cls: 'text-zinc-600 bg-zinc-50' };
          const Icon = m.icon;
          const payload = it.payload || {};
          const sub = payload.filename || payload.document_type || payload.status || null;
          return (
            <div key={it.id} className="relative">
              <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full ${m.cls} flex items-center justify-center`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{m.label}</div>
                  {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(it.created_at).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RelouerTimeline;
