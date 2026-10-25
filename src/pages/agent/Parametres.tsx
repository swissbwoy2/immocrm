import { useState, useEffect, useRef } from 'react';
import { DASH_CARD, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Camera, Save, Mail, Phone, User, Settings, Bell, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { EmailConfigurationDialog } from '@/components/EmailConfigurationDialog';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import { GoogleCalendarConnect } from '@/components/settings/GoogleCalendarConnect';

export default function AgentParametres() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [telephone, setTelephone] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [notificationsEmail, setNotificationsEmail] = useState(true);
  const [emailConfigOpen, setEmailConfigOpen] = useState(false);
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage
        .from('profile-avatars')
        .remove([`${user.id}/avatar.png`, `${user.id}/avatar.jpg`, `${user.id}/avatar.jpeg`, `${user.id}/avatar.webp`]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl + '?t=' + Date.now() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Photo de profil mise à jour');
      loadProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Erreur lors du téléchargement de l\'image');
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
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const SECTION = `${DASH_CARD} p-4 md:p-5`;
  const ICON = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary';

  return (
    <DashPage className="max-w-2xl">
      <DashPageHeader title="Paramètres" subtitle="Gérez votre profil et vos préférences" />

      <div className="grid gap-4">
        {/* Photo de profil */}
        <section className={SECTION} aria-labelledby="agent-param-photo">
          <div className="flex items-center gap-3">
            <span className={ICON}><Camera className="h-[18px] w-[18px]" /></span>
            <h2 id="agent-param-photo" className="text-base font-semibold text-foreground">Photo de profil</h2>
          </div>
          <div className="mt-4 flex items-center gap-4 sm:gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
              <AvatarImage src={profile?.avatar_url} alt={`${profile?.prenom} ${profile?.nom}`} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {profile?.prenom?.[0]}{profile?.nom?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="mr-2 h-4 w-4" />
                {uploading ? 'Téléchargement...' : 'Changer la photo'}
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WebP. Max 5 Mo.
              </p>
            </div>
          </div>
        </section>

        {/* Informations personnelles */}
        <section className={SECTION} aria-labelledby="agent-param-infos">
          <div className="flex items-center gap-3">
            <span className={ICON}><User className="h-[18px] w-[18px]" /></span>
            <h2 id="agent-param-infos" className="text-base font-semibold text-foreground">Informations personnelles</h2>
          </div>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Prénom</Label>
                <Input
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Prénom"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Nom"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <div className="flex h-11 items-center rounded-xl border border-border/70 bg-muted/50 px-3 text-sm text-foreground">
                  <span className="truncate">{profile?.email}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </Label>
                <Input
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+41 XX XXX XX XX"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                className="rounded-full"
                onClick={handleSaveProfile}
                disabled={saving || (telephone === profile?.telephone && prenom === profile?.prenom && nom === profile?.nom)}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
              </Button>
            </div>
          </div>
        </section>

        {/* Configuration Email */}
        <section className={SECTION} aria-labelledby="agent-param-smtp">
          <div className="flex items-center gap-3">
            <span className={ICON}><Settings className="h-[18px] w-[18px]" /></span>
            <h2 id="agent-param-smtp" className="text-base font-semibold text-foreground">Configuration SMTP</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Configurez votre serveur SMTP pour envoyer des emails directement depuis l'application.
          </p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => setEmailConfigOpen(true)}>
            Configurer l'email
          </Button>
        </section>

        {/* Préférences de notification */}
        <section className={SECTION} aria-labelledby="agent-param-notifs">
          <div className="flex items-center gap-3">
            <span className={ICON}><Bell className="h-[18px] w-[18px]" /></span>
            <div className="min-w-0">
              <h2 id="agent-param-notifs" className="text-base font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">Gérez vos préférences de notification</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border/70 p-4">
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor="notifications-email">Notifications par email</Label>
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
            />
          </div>
        </section>

        {/* Google Agenda */}
        <GoogleCalendarConnect />

        {/* Changer le mot de passe */}
        <ChangePasswordCard />

        {/* Supprimer le compte */}
        <section className="rounded-2xl border border-destructive/30 bg-card p-4 md:p-5" aria-labelledby="agent-param-danger">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <h2 id="agent-param-danger" className="text-base font-semibold text-destructive">Zone de danger</h2>
              <p className="text-sm text-muted-foreground">Supprimer définitivement votre compte et toutes vos données</p>
            </div>
          </div>
          <div className="mt-4">
            <DeleteAccountDialog userType="agent" />
          </div>
        </section>
      </div>

      <EmailConfigurationDialog 
        open={emailConfigOpen} 
        onOpenChange={setEmailConfigOpen} 
      />
    </DashPage>
  );
}
