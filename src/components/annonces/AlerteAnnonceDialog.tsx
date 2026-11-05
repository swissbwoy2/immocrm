import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BellPlus } from 'lucide-react';
import { Choice, Field, PrimaryButton, SecondaryButton, SheetDialog } from '@/components/funnel-ui/FunnelKit';

export interface AlerteCriteres {
  type_transaction?: string | null;
  categorie_id?: string | null;
  ville?: string | null;
  rayon_km?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  prix_min?: number | null;
  prix_max?: number | null;
  pieces_min?: number | null;
  pieces_max?: number | null;
  surface_min?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criteres: AlerteCriteres;
  defaultNom: string;
}

export function AlerteAnnonceDialog({ open, onOpenChange, criteres, defaultNom }: Props) {
  const { user } = useAuth();
  const [nom, setNom] = useState(defaultNom);
  const [email, setEmail] = useState('');
  const [frequence, setFrequence] = useState<'instantane' | 'quotidien'>('instantane');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const finalEmail = (user?.email || email).trim().toLowerCase();
    if (!finalEmail || !/^\S+@\S+\.\S+$/.test(finalEmail)) {
      toast.error('Veuillez saisir une adresse e-mail valide');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('alertes_annonces').insert({
        user_id: user?.id ?? null,
        email: finalEmail,
        nom: nom || defaultNom,
        criteres: criteres as never,
        actif: true,
        frequence,
      });
      if (error) throw error;
      toast.success('Alerte créée : vous recevrez les nouvelles annonces correspondantes');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Impossible de créer l'alerte");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<BellPlus className="h-5 w-5" strokeWidth={1.8} />}
      title="Créer une alerte e-mail"
      description="Recevez un e-mail dès qu'une nouvelle annonce correspond à votre recherche."
      footer={
        <>
          <SecondaryButton onClick={() => onOpenChange(false)}>Annuler</SecondaryButton>
          <PrimaryButton onClick={handleSave} loading={saving}>Créer l'alerte</PrimaryButton>
        </>
      }
    >
      <form className="grid gap-3" noValidate onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <Field id="alerte-nom" label="Nom de l'alerte" value={nom} onChange={setNom} />
        {!user && (
          <Field id="alerte-email" label="Votre e-mail" type="email" inputMode="email" autoComplete="email" value={email} onChange={setEmail} placeholder="votre@email.com" />
        )}
        <p className="mt-2 text-[14px] font-semibold text-[#222222]">Fréquence</p>
        <div className="grid gap-3">
          <Choice selected={frequence === 'instantane'} onClick={() => setFrequence('instantane')} label="Dès la publication" />
          <Choice index={1} selected={frequence === 'quotidien'} onClick={() => setFrequence('quotidien')} label="Résumé quotidien" />
        </div>
        <p className="mt-1 text-[13px] leading-[1.4] text-[#6a6a6a]">
          Vous pourrez vous désinscrire à tout moment via le lien présent dans chaque e-mail.
        </p>
        <button type="submit" className="sr-only">Créer</button>
      </form>
    </SheetDialog>
  );
}
