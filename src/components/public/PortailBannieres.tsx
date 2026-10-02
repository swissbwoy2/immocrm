import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface PortailBanniere {
  id: string;
  image_url: string;
  titre: string | null;
  lien: string | null;
  actif: boolean;
  ordre: number;
  created_at: string;
}

/** Bannières actives du portail d'annonces (empilées, lecture publique). */
export function PortailBannieres({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { data = [] } = useQuery({
    queryKey: ['portail-bannieres-public'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portail_bannieres' as any)
        .select('id, image_url, titre, lien, actif, ordre, created_at')
        .eq('actif', true)
        .order('ordre', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) return [];
      return (data || []) as unknown as PortailBanniere[];
    },
  });

  if (!data.length) return null;

  return (
    <div className={className}>
      <div className="space-y-3">
        {data.map((b) => {
          const img = (
            <img src={b.image_url} alt={b.titre || 'Bannière'} className="block w-full h-auto" loading="lazy" />
          );
          const shell = 'block w-full overflow-hidden rounded-2xl border border-border bg-muted';
          const link = b.lien?.trim();
          if (!link) return <div key={b.id} className={shell}>{img}</div>;
          if (link.startsWith('/')) {
            return (
              <button key={b.id} type="button" onClick={() => navigate(link)} className={shell} aria-label={b.titre || 'Voir'}>
                {img}
              </button>
            );
          }
          return (
            <a key={b.id} href={link} target="_blank" rel="noopener noreferrer" className={shell} aria-label={b.titre || 'Voir'}>
              {img}
            </a>
          );
        })}
      </div>
    </div>
  );
}
