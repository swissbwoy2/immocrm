import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Camera, Save, Mail, Phone, User, Bell, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import { GoogleCalendarConnect } from '@/components/settings/GoogleCalendarConnect';
import { WhatsAppNotificationsCard } from '@/components/settings/WhatsAppNotificationsCard';
import { DASH_CARD, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';

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
      <DashPage>
        <div role="status" aria-label="Chargement des paramètres">
          <div className="h-8 w-44 rounded-full bg-muted/60" />
          <div className="mt-6 h-24 max-w-xl rounded-2xl bg-muted/40" />
        </div>
      </DashPage>
    );
  }

  return (
    <DashPage>
      <DashPageHeader title="Paramètres" subtitle="Gérez votre profil et vos préférences" />

      <div className="grid gap-4 max-w-2xl">
        {/* Photo de profil */}
        <section className={`${DASH_CARD} p-4 md:p-5`}>
          <h2 className="flex items-center gap-3 text-base font-semibold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Camera className="h-[18px] w-[18px]" />
            </span>
            Photo de profil
          </h2>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative group/avatar shrink-0">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                <AvatarImage src={profile?.avatar_url} alt={`${profile?.prenom} ${profile?.nom}`} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                  {profile?.prenom?.[0]}{profile?.nom?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="space-y-2 min-w-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-full"
              >
                {uploading ? 'Téléchargement...' : 'Changer la photo'}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WebP. Max 5 Mo.
              </p>
            </div>
          </div>
        </section>

        {/* Informations personnelles */}
        <section className={`${DASH_CARD} p-4 md:p-5`}>
          <h2 className="flex items-center gap-3 text-base font-semibold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-[18px] w-[18px]" />
            </span>
            Informations personnelles
          </h2>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Prénom</Label>
                <Input
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nom</Label>
                <Input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Nom"
                />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/60">
              <Label className="text-muted-foreground flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <div className="font-medium mt-1 text-foreground break-all">{profile?.email}</div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Téléphone
              </Label>
              <Input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+41 XX XXX XX XX"
                className="max-w-xs"
              />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={saving || (telephone === profile?.telephone && prenom === profile?.prenom && nom === profile?.nom)}
              className="rounded-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
            </Button>
          </div>
        </section>

        {/* Préférences de notification */}
        <section className={`${DASH_CARD} p-4 md:p-5`}>
          <h2 className="flex items-center gap-3 text-base font-semibold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bell className="h-[18px] w-[18px]" />
            </span>
            Notifications
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez vos préférences de notification
          </p>
          <div className="mt-4 flex items-center justify-between gap-4 p-4 rounded-xl border border-border/70">
            <div className="space-y-0.5 min-w-0">
              <Label htmlFor="notifications-email" className="font-medium">Notifications par email</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir une copie des notifications par email
              </p>
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
                  toast.success(checked ? 'Notifications email activées' : 'Notifications email désactivées');
                } catch (error) {
                  console.error('Error updating notification preference:', error);
                  setNotificationsEmail(!checked);
                  toast.error('Erreur lors de la mise à jour');
                }
              }}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </section>

        {/* Google Agenda (composant partagé : seuls les coins sont harmonisés ici) */}
        <div className="[&>*]:rounded-2xl [&>*]:border-border/70">
          <GoogleCalendarConnect />
        </div>

        {/* WhatsApp */}
        <WhatsAppNotificationsCard />

        {/* Changer le mot de passe (composant partagé : seuls les coins sont harmonisés ici) */}
        <div className="[&>*]:rounded-2xl">
          <ChangePasswordCard />
        </div>

        {/* Supprimer le compte */}
        <section className={`${DASH_CARD} p-4 md:p-5`}>
          <h2 className="flex items-center gap-3 text-base font-semibold text-destructive">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-[18px] w-[18px]" />
            </span>
            Zone de danger
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Supprimer définitivement votre compte et toutes vos données
          </p>
          <div className="mt-4">
            <DeleteAccountDialog userType="client" />
          </div>
        </section>
      </div>
    </DashPage>
  );
}
