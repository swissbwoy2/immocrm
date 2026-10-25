import { useState, useEffect, useRef } from 'react';
import { DASH_CARD, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Camera, Save, Mail, Phone, User, Settings, Shield, Bell, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { EmailConfigurationDialog } from '@/components/EmailConfigurationDialog';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { AdminDefaultGoalsManager } from '@/components/stats/AdminDefaultGoalsManager';
import { GoogleCalendarConnect } from '@/components/settings/GoogleCalendarConnect';
import { DashboardBannerManager } from '@/components/settings/DashboardBannerManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

export default function AdminParametres() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [forcingUpdate, setForcingUpdate] = useState(false);

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

  const handleForceUpdateAllUsers = async () => {
    setForcingUpdate(true);
    try {
      // Generate new version timestamp
      const newVersion = `v${Date.now()}`;
      
      // Update version in database
      const { error: updateError } = await supabase
        .from('app_config')
        .update({ value: newVersion, updated_at: new Date().toISOString() })
        .eq('key', 'app_version');
      
      if (updateError) throw updateError;
      
      // Send broadcast to force refresh all connected users
      const channel = supabase.channel('app-updates');
      await channel.subscribe();
      
      await channel.send({
        type: 'broadcast',
        event: 'force-refresh',
        payload: { version: newVersion }
      });
      
      // Clean up
      await supabase.removeChannel(channel);
      
      toast.success('Signal de mise à jour envoyé à tous les utilisateurs connectés');
    } catch (error) {
      console.error('Error forcing update:', error);
      toast.error('Erreur lors de l\'envoi du signal de mise à jour');
    } finally {
      setForcingUpdate(false);
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

  const SECTION = `${DASH_CARD} p-4 md:p-5`;
  const ICON = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary';

  return (
    <DashPage className="max-w-2xl">
      <DashPageHeader title="Paramètres" subtitle="Gérez votre profil et les paramètres système" />

      <div className="grid gap-4">
        <section className={SECTION} aria-labelledby="admin-param-nav">
          <div className="flex items-center gap-3">
            <span className={ICON}><User className="h-[18px] w-[18px]" /></span>
            <div className="min-w-0">
              <h2 id="admin-param-nav" className="text-base font-semibold text-foreground">Naviguer en tant que</h2>
              <p className="text-sm text-muted-foreground">Accéder à un autre espace sans changer de compte.</p>
            </div>
          </div>
          <div className="mt-4">
            <Select onValueChange={(path) => navigate(path)}>
              <SelectTrigger aria-label="Naviguer en tant que" className="min-h-11 w-full rounded-xl sm:max-w-xs">
                <SelectValue placeholder="Choisir un espace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="/agent">Agent</SelectItem>
                <SelectItem value="/client">Client</SelectItem>
                <SelectItem value="/candidat">Candidat</SelectItem>
                <SelectItem value="/proprietaire">Propriétaire</SelectItem>
                <SelectItem value="/coursier">Coursier</SelectItem>
                <SelectItem value="/apporteur">Apporteur</SelectItem>
                <SelectItem value="/espace-annonceur">Annonceur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Forcer la mise à jour */}
        <section className={SECTION} aria-labelledby="admin-param-update">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <RefreshCw className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <h2 id="admin-param-update" className="text-base font-semibold text-foreground">Mise à jour de l'application</h2>
              <p className="text-sm text-muted-foreground">Forcez le rechargement de l'application pour tous les utilisateurs connectés</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Cette action enverra un signal à tous les utilisateurs actuellement connectés pour qu'ils rechargent l'application. 
            Utile après une mise à jour importante.
          </p>
          <Button 
            variant="outline" 
            className="mt-4 rounded-full border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
            onClick={handleForceUpdateAllUsers}
            disabled={forcingUpdate}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${forcingUpdate ? 'animate-spin' : ''}`} />
            {forcingUpdate ? 'Envoi en cours...' : 'Forcer la mise à jour pour tous'}
          </Button>
        </section>

        {/* Objectifs par défaut des agents */}
        <AdminDefaultGoalsManager />

        {/* Photo de profil */}
        <section className={SECTION} aria-labelledby="admin-param-photo">
          <div className="flex items-center gap-3">
            <span className={ICON}><Camera className="h-[18px] w-[18px]" /></span>
            <h2 id="admin-param-photo" className="text-base font-semibold text-foreground">Photo de profil</h2>
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
        <section className={SECTION} aria-labelledby="admin-param-infos">
          <div className="flex items-center gap-3">
            <span className={ICON}><User className="h-[18px] w-[18px]" /></span>
            <h2 id="admin-param-infos" className="text-base font-semibold text-foreground">Informations personnelles</h2>
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
        <section className={SECTION} aria-labelledby="admin-param-smtp">
          <div className="flex items-center gap-3">
            <span className={ICON}><Settings className="h-[18px] w-[18px]" /></span>
            <h2 id="admin-param-smtp" className="text-base font-semibold text-foreground">Configuration SMTP</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Configurez votre serveur SMTP pour envoyer des emails directement depuis l'application.
          </p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => setEmailConfigOpen(true)}>
            Configurer l'email
          </Button>
        </section>

        {/* Préférences de notification */}
        <section className={SECTION} aria-labelledby="admin-param-notifs">
          <div className="flex items-center gap-3">
            <span className={ICON}><Bell className="h-[18px] w-[18px]" /></span>
            <div className="min-w-0">
              <h2 id="admin-param-notifs" className="text-base font-semibold text-foreground">Notifications</h2>
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

        {/* Bannière dashboard client */}
        <DashboardBannerManager />

        {/* Google Agenda */}
        <GoogleCalendarConnect />

        {/* Changer le mot de passe */}
        <ChangePasswordCard />

        {/* Rôle administrateur */}
        <section className={SECTION} aria-labelledby="admin-param-role">
          <div className="flex items-center gap-3">
            <span className={ICON}><Shield className="h-[18px] w-[18px]" /></span>
            <h2 id="admin-param-role" className="text-base font-semibold text-foreground">Privilèges administrateur</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            En tant qu'administrateur, vous avez accès à toutes les fonctionnalités de gestion 
            des agents, clients, mandats et transactions.
          </p>
        </section>
      </div>

      <EmailConfigurationDialog 
        open={emailConfigOpen} 
        onOpenChange={setEmailConfigOpen} 
      />
    </DashPage>
  );
}
