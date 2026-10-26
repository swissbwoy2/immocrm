import { useState, useEffect, useRef } from 'react';
import { DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { GlassSlot, SettingRow, SettingsCard, SettingsList, SettingsSectionNav, type SettingsSection } from '@/components/admin/AdminSettingsPrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Camera, Save, Mail, Phone, User, Settings, Shield, Bell, RefreshCw, CalendarDays, Target, Compass } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notifBannersEnabled, setNotifBannersEnabled } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { EmailConfigurationDialog } from '@/components/EmailConfigurationDialog';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { AdminDefaultGoalsManager } from '@/components/stats/AdminDefaultGoalsManager';
import { GoogleCalendarConnect } from '@/components/settings/GoogleCalendarConnect';
import { PushNotificationsCard } from '@/components/settings/PushNotificationsCard';
import { DashboardBannerManager } from '@/components/settings/DashboardBannerManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

type SectionKey = 'profil' | 'notifications' | 'agenda' | 'securite' | 'objectifs' | 'systeme';

const SECTIONS: SettingsSection<SectionKey>[] = [
  { key: 'profil', label: 'Profil', sub: 'Photo et coordonnées', icon: User },
  { key: 'notifications', label: 'Notifications', sub: 'Application, e-mails et SMTP', icon: Bell },
  { key: 'agenda', label: 'Agenda', sub: 'Google Agenda', icon: CalendarDays },
  { key: 'securite', label: 'Sécurité', sub: 'Mot de passe et privilèges', icon: Shield },
  { key: 'objectifs', label: 'Objectifs', sub: 'Objectifs par défaut des agents', icon: Target },
  { key: 'systeme', label: 'Système', sub: 'Espaces, mise à jour, bannière', icon: Settings },
];

const SECTION_KEY = 'admin-parametres-section';

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
  const [bannersOn, setBannersOn] = useState(() => notifBannersEnabled());
  const [emailConfigOpen, setEmailConfigOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [forcingUpdate, setForcingUpdate] = useState(false);
  const [section, setSectionState] = useState<SectionKey>(() => {
    try {
      const saved = localStorage.getItem(SECTION_KEY) as SectionKey | null;
      return saved && SECTIONS.some((s) => s.key === saved) ? saved : 'profil';
    } catch {
      return 'profil';
    }
  });

  const setSection = (key: SectionKey) => {
    setSectionState(key);
    try { localStorage.setItem(SECTION_KEY, key); } catch { /* stockage indisponible */ }
  };

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
      <DashPage className="max-w-5xl">
        <div role="status" aria-label="Chargement des paramètres">
          <div className="h-8 w-44 rounded-full bg-muted/60" />
          <div className="mt-2 h-4 w-64 max-w-full rounded-full bg-muted/40" />
          <div className="mt-6 h-11 w-full rounded-full bg-muted/40 lg:hidden" />
          <div className="mt-4 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="hidden h-72 rounded-[22px] bg-muted/40 lg:block" />
            <div className="h-56 rounded-[22px] bg-muted/40" />
          </div>
        </div>
      </DashPage>
    );
  }

  const profileUnchanged = telephone === profile?.telephone && prenom === profile?.prenom && nom === profile?.nom;
  const current = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0];

  return (
    <DashPage className="max-w-5xl">
      <DashPageHeader title="Paramètres" subtitle="Gérez votre profil et les paramètres système" />

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <SettingsSectionNav
          sections={SECTIONS}
          value={section}
          onChange={setSection}
          label="Sections des paramètres"
          idPrefix="admin-param"
        />

        <div
          id="admin-param-panel"
          role="tabpanel"
          aria-labelledby={`admin-param-tab-${current.key}`}
          className="grid min-w-0 gap-4"
        >
          {section === 'profil' && (
            <>
              {/* Photo de profil */}
              <SettingsCard id="admin-param-photo" icon={Camera} title="Photo de profil" description="Visible par votre équipe et vos clients. JPG, PNG ou WebP, 5 Mo au maximum.">
                <div className="flex items-center gap-4 sm:gap-6">
                  <Avatar className="h-16 w-16 shrink-0 sm:h-24 sm:w-24">
                    <AvatarImage src={profile?.avatar_url} alt={`${profile?.prenom} ${profile?.nom}`} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {profile?.prenom?.[0]}{profile?.nom?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="min-h-11 min-w-0 flex-1 sm:flex-none"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {uploading ? 'Téléchargement...' : 'Changer la photo'}
                  </Button>
                </div>
              </SettingsCard>

              {/* Informations personnelles */}
              <SettingsCard
                id="admin-param-infos"
                icon={User}
                title="Informations personnelles"
                description="Nom affiché et numéro de contact."
                footer={
                  <Button onClick={handleSaveProfile} disabled={saving || profileUnchanged}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                  </Button>
                }
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-param-prenom">Prénom</Label>
                    <Input
                      id="admin-param-prenom"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      placeholder="Prénom"
                      autoComplete="given-name"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-param-nom">Nom</Label>
                    <Input
                      id="admin-param-nom"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Nom"
                      autoComplete="family-name"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      Email
                    </Label>
                    <div className="flex h-11 min-w-0 items-center rounded-xl border border-border/70 bg-muted/50 px-3 text-sm text-foreground">
                      <span className="truncate">{profile?.email}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-param-tel" className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      Téléphone
                    </Label>
                    <Input
                      id="admin-param-tel"
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="+41 XX XXX XX XX"
                      autoComplete="tel"
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              </SettingsCard>
            </>
          )}

          {section === 'notifications' && (
            <>
              {/* Préférences de notification */}
              <SettingsCard id="admin-param-notifs" icon={Bell} title="Notifications" description="Gérez vos préférences de notification">
                <SettingsList>
                  <SettingRow
                    htmlFor="notifications-bannieres"
                    label="Notifications dans l'application"
                    description="Afficher une bannière en direct à chaque nouvelle notification (sur cet appareil). La cloche reste toujours à jour."
                  >
                    <Switch
                      id="notifications-bannieres"
                      checked={bannersOn}
                      onCheckedChange={(checked) => {
                        setBannersOn(checked);
                        setNotifBannersEnabled(checked);
                        toast.success(checked ? 'Bannières de notification activées' : 'Bannières de notification désactivées');
                      }}
                    />
                  </SettingRow>
                  <SettingRow
                    htmlFor="notifications-email"
                    label="Notifications par email"
                    description="Recevoir une copie des notifications par email"
                  >
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
                  </SettingRow>
                </SettingsList>
              </SettingsCard>

              {/* Alertes sur le téléphone (push) */}
              <GlassSlot>
                <PushNotificationsCard />
              </GlassSlot>

              {/* Configuration Email */}
              <SettingsCard
                id="admin-param-smtp"
                icon={Mail}
                title="Configuration SMTP"
                description="Configurez votre serveur SMTP pour envoyer des emails directement depuis l'application."
                footer={
                  <Button variant="outline" onClick={() => setEmailConfigOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurer l'email
                  </Button>
                }
              />
            </>
          )}

          {section === 'agenda' && (
            <GlassSlot>
              <GoogleCalendarConnect />
            </GlassSlot>
          )}

          {section === 'securite' && (
            <>
              {/* Changer le mot de passe */}
              <GlassSlot>
                <ChangePasswordCard />
              </GlassSlot>

              {/* Rôle administrateur */}
              <SettingsCard
                id="admin-param-role"
                icon={Shield}
                title="Privilèges administrateur"
                description="En tant qu'administrateur, vous avez accès à toutes les fonctionnalités de gestion des agents, clients, mandats et transactions."
              />
            </>
          )}

          {section === 'objectifs' && (
            /* Objectifs par défaut des agents */
            <AdminDefaultGoalsManager />
          )}

          {section === 'systeme' && (
            <>
              <SettingsCard id="admin-param-nav" icon={Compass} title="Naviguer en tant que" description="Accéder à un autre espace sans changer de compte.">
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
              </SettingsCard>

              {/* Forcer la mise à jour */}
              <SettingsCard
                id="admin-param-update"
                icon={RefreshCw}
                tone="amber"
                title="Mise à jour de l'application"
                description="Forcez le rechargement de l'application pour tous les utilisateurs connectés"
                footer={
                  <Button variant="outline" onClick={handleForceUpdateAllUsers} disabled={forcingUpdate}>
                    <RefreshCw className={`w-4 h-4 mr-2 text-amber-600 dark:text-amber-400 ${forcingUpdate ? 'animate-spin' : ''}`} />
                    {forcingUpdate ? 'Envoi en cours...' : 'Forcer la mise à jour pour tous'}
                  </Button>
                }
              >
                <p className="text-sm text-muted-foreground">
                  Cette action enverra un signal à tous les utilisateurs actuellement connectés pour qu'ils rechargent l'application.
                  Utile après une mise à jour importante.
                </p>
              </SettingsCard>

              {/* Bannière dashboard client */}
              <DashboardBannerManager />
            </>
          )}

          <p className="sr-only" aria-live="polite">{current.label}</p>
        </div>
      </div>

      <EmailConfigurationDialog
        open={emailConfigOpen}
        onOpenChange={setEmailConfigOpen}
      />
    </DashPage>
  );
}
