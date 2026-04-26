import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type WishlistStatut =
  | 'a_contacter'
  | 'contacte_sans_reponse'
  | 'offre_envoyee'
  | 'indisponible'
  | 'archive';

export interface WishlistBien {
  id: string;
  user_id: string;
  adresse: string;
  npa: string | null;
  ville: string | null;
  nb_pieces: number | null;
  surface: number | null;
  prix: number | null;
  type_bien: string | null;
  lien_annonce: string;
  source_portail: string | null;
  photo_url: string | null;
  contact_nom: string | null;
  contact_telephone: string | null;
  contact_email: string | null;
  statut: WishlistStatut;
  date_dernier_contact: string | null;
  nb_relances: number;
  notes: string | null;
  tags: string[] | null;
  offre_id: string | null;
  date_offre_envoyee: string | null;
  created_at: string;
  updated_at: string;
}

export type WishlistInput = Omit<
  WishlistBien,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'offre_id' | 'date_offre_envoyee'
> & {
  // optional override
};

export function detectPortail(url: string): string | null {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('homegate')) return 'Homegate';
  if (u.includes('immoscout24') || u.includes('immoscout')) return 'ImmoScout24';
  if (u.includes('comparis')) return 'Comparis';
  if (u.includes('flatfox')) return 'Flatfox';
  if (u.includes('newhome')) return 'Newhome';
  if (u.includes('anibis')) return 'Anibis';
  if (u.includes('immobilier.ch')) return 'Immobilier.ch';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host;
  } catch {
    return null;
  }
}

export function useWishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistBien[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('wishlist_biens' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[wishlist] fetch error', error);
    } else {
      setItems((data ?? []) as unknown as WishlistBien[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('wishlist-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishlist_biens', filter: `user_id=eq.${user.id}` },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAll]);

  const addItem = async (input: Partial<WishlistInput> & { lien_annonce: string; adresse: string }) => {
    if (!user) return null;
    const payload = {
      user_id: user.id,
      ...input,
      source_portail: input.source_portail ?? detectPortail(input.lien_annonce),
      statut: input.statut ?? 'a_contacter',
    };
    const { data, error } = await supabase
      .from('wishlist_biens' as any)
      .insert(payload as any)
      .select()
      .single();
    if (error) {
      if ((error as any).code === '23505') {
        toast({ title: 'Déjà dans ta liste', description: 'Cette annonce est déjà suivie.', variant: 'destructive' });
      } else {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      }
      return null;
    }
    toast({ title: 'Bien ajouté', description: 'Ajouté à ta liste de suivi.' });
    await fetchAll();
    return data as unknown as WishlistBien;
  };

  const updateItem = async (id: string, patch: Partial<WishlistBien>) => {
    const { error } = await supabase
      .from('wishlist_biens' as any)
      .update(patch as any)
      .eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchAll();
    return true;
  };

  const markContacted = async (item: WishlistBien) => {
    return updateItem(item.id, {
      statut: 'contacte_sans_reponse',
      date_dernier_contact: new Date().toISOString(),
      nb_relances: (item.nb_relances ?? 0) + (item.statut === 'contacte_sans_reponse' ? 1 : 0),
    });
  };

  const archive = async (id: string) => updateItem(id, { statut: 'archive' });

  const remove = async (id: string) => {
    const { error } = await supabase.from('wishlist_biens' as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Supprimé' });
    await fetchAll();
    return true;
  };

  return { items, loading, refresh: fetchAll, addItem, updateItem, markContacted, archive, remove };
}
