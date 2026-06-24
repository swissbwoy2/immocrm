import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Route technique conservée pour rétrocompatibilité.
 * Redirige vers /admin/clients/:clientId (fiche unifiée) en résolvant
 * relouer_requests.id → user_id → clients.user_id → client.id.
 */
export default function RelouerDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate('/admin/clients?tab=reloueurs', { replace: true });
      return;
    }
    (async () => {
      try {
        const { data: req } = await supabase
          .from('relouer_requests')
          .select('user_id')
          .eq('id', id)
          .maybeSingle();
        if (!req?.user_id) {
          navigate('/admin/clients?tab=reloueurs', { replace: true });
          return;
        }
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', req.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (client?.id) {
          navigate(`/admin/clients/${client.id}`, { replace: true });
        } else {
          navigate('/admin/clients?tab=reloueurs', { replace: true });
        }
      } catch {
        navigate('/admin/clients?tab=reloueurs', { replace: true });
      }
    })();
  }, [id, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Redirection vers la fiche client…</span>
      </div>
    </div>
  );
}
