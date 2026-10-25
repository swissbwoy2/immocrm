import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Camera, Save, Mail, Phone, User, Bell, Settings, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import { GoogleCalendarConnect } from '@/components/settings/GoogleCalendarConnect';
import { WhatsAppNotificationsCard } from '@/components/settings/WhatsAppNotificationsCard';

export default function ClientParametres() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [telephone, setTelephone] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [notificationsEmail, setNotificationsEmail] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      setProfile(data);
      setTelephone(data.telephone || '');
      setPrenom(data.prenom || '');
      setNom(data.nom || '');
      setNotificationsEmail(data.notifications_email !== false);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      await supabase.storage
        .from('profile-avatars')
        .remove([`${user.id}/avatar.png`, `${user.id}/avatar.jpg`, `${user.id}/avatar.jpeg`, `${user.id}/avatar.webp`]);

      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl + '?t=' + Date.now() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Photo de profil mise à jour');
      loadProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    if (!prenom.trim() || !nom.trim()) {
      toast.error('Le prénom et le nom sont obligatoires');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telephone, prenom: prenom.trim(), nom: nom.trim() })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profil mis à jour');
      loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8" role="status" aria-label="Chargement des paramètres">
        <div className="h-7 w-44 rounded bg-muted/60" />
        <div className="mt-6 h-24 max-w-xl rounded bg-muted/40" />
      </div>
    );
  }

  const SECTION = 'rounded-[14px] border border-[#dddddd] bg-white p-5 sm:p-6';
  const H2 = 'flex items-center gap-2 text-[17px] font-semibold text-[#222222]';
  const profileDirty = telephone !== (profile?.telephone || '') || prenom !== (profile?.prenom || '') || nom !== (profile?.nom || '');

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6 md:px-8 md:py-8">
        <header>
          <h1 className="flex items-center gap-2 text-[26px] font-bold tracking-[-0.02em] text-[#222222] md:text-[28px]">
            <Settings className="h-6 w-6" /> Paramètres
          </h1>
          <p className="mt-1 text-[15px] text-[#6a6a6a]">Votre profil, vos notifications et la sécurité de votre compte.</p>
        </header>

        {/* Profil : photo + informations */}
        <section className={SECTION} aria-labelledby="param-profil">
          <h2 id="param-profil" className={H2}><User className="h-5 w-5" /> Mon profil</h2>

          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative shrink-0 cursor-pointer rounded-full"
              aria-label="Changer la photo de profil"
            >
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url} alt={`${profile?.prenom ?? ''} ${profile?.nom ?? ''}`} />
                <AvatarFallback className="bg-[#f2f2f2] text-xl font-semibold text-[#222222]">
                  {profile?.prenom?.[0]}{profile?.nom?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </span>
            </button>
            <div className="min-w-0">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="h-10 rounded-lg">
                <Camera className="mr-2 h-4 w-4" />
                {uploading ? 'Téléchargement…' : 'Changer la photo'}
              </Button>
              <p className="mt-1.5 text-[13px] text-[#6a6a6a]">JPG, PNG ou WebP · 5 Mo max.</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="param-prenom" className="text-[14px] font-medium text-[#222222]">Prénom</Label>
              <Input id="param-prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="param-nom" className="text-[14px] font-medium text-[#222222]">Nom</Label>
              <Input id="param-nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-[14px] font-medium text-[#222222]"><Mail className="h-4 w-4" /> E-mail</Label>
              <div className="flex h-11 items-center rounded-md border border-[#ebebeb] bg-[#f7f7f7] px-3 text-[15px] text-[#3f3f3f]">
                <span className="truncate">{profile?.email}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="param-tel" className="flex items-center gap-1.5 text-[14px] font-medium text-[#222222]"><Phone className="h-4 w-4" /> Téléphone</Label>
              <Input id="param-tel" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+41 79 123 45 67" className="h-11" />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={handleSaveProfile} disabled={saving || !profileDirty} className="h-11 rounded-lg px-5">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </section>

        {/* Notifications e-mail */}
        <section className={SECTION} aria-labelledby="param-notifs">
          <h2 id="param-notifs" className={H2}><Bell className="h-5 w-5" /> Notifications</h2>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-[#ebebeb] p-4">
            <div className="min-w-0">
              <Label htmlFor="notifications-email" className="text-[15px] font-medium text-[#222222]">Notifications par e-mail</Label>
              <p className="mt-0.5 text-[14px] text-[#6a6a6a]">Recevoir une copie de vos notifications par e-mail.</p>
            </div>
            <Switch
              id="notifications-email"
              checked={notificationsEmail}
              onCheckedChange={async (checked) => {
                setNotificationsEmail(checked);
                try {
                  const { error } = await supabase
                    .from('profiles')
                    .update({ notifications_email: checked })
                    .eq('id', user?.id);
                  if (error) throw error;
                  toast.success(checked ? 'Notifications e-mail activées' : 'Notifications e-mail désactivées');
                } catch (error) {
                  console.error('Error updating notification preference:', error);
                  setNotificationsEmail(!checked);
                  toast.error('Erreur lors de la mise à jour');
                }
              }}
            />
          </div>
        </section>

        {/* WhatsApp */}
        <WhatsAppNotificationsCard />

        {/* Google Agenda */}
        <GoogleCalendarConnect />

        {/* Mot de passe */}
        <ChangePasswordCard />

        {/* Suppression du compte */}
        <section className="rounded-[14px] border border-red-200 bg-white p-5 sm:p-6" aria-labelledby="param-danger">
          <h2 id="param-danger" className="flex items-center gap-2 text-[17px] font-semibold text-red-700"><Trash2 className="h-5 w-5" /> Supprimer mon compte</h2>
          <p className="mt-1 text-[14px] text-[#6a6a6a]">Suppression définitive de votre compte et de toutes vos données.</p>
          <div className="mt-4">
            <DeleteAccountDialog userType="client" />
          </div>
        </section>
      </div>
    </div>
  );
}
