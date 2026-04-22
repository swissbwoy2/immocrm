import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Camera, Save, Mail, Phone, User, Bell, Settings, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ChangePasswordCard } from '@/components/ChangePasswordCard';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';
import { GoogleCalendarConnect } from '@/components/settings/GoogleCalendarConnect';

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
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-r-primary/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-auto">
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
      </div>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header modernisé */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              Paramètres
            </h1>
            <p className="text-muted-foreground mt-1">Gérez votre profil et vos préférences</p>
          </div>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Photo de profil */}
          <Card className="group card-interactive overflow-hidden border-0 shadow-lg">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            </div>
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Camera className="w-4 h-4 text-primary" />
                </div>
                Photo de profil
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="relative group/avatar">
                  <Avatar className="h-24 w-24 ring-4 ring-primary/10 transition-all duration-300 group-hover/avatar:ring-primary/30">
                    <AvatarImage src={profile?.avatar_url} alt={`${profile?.prenom} ${profile?.nom}`} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
                      {profile?.prenom?.[0]}{profile?.nom?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
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
                    className="relative overflow-hidden"
                  >
                    {uploading ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-primary animate-pulse" />
                        <span className="relative">Téléchargement...</span>
                      </>
                    ) : (
                      'Changer la photo'
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG ou WebP. Max 5 Mo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations personnelles */}
          <Card className="group card-interactive overflow-hidden border-0 shadow-lg">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            </div>
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <User className="w-4 h-4 text-primary" />
                </div>
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Prénom</Label>
                  <Input
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Prénom"
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nom</Label>
                  <Input
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Nom"
                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <Label className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <div className="font-medium mt-1">{profile?.email}</div>
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
                  className="max-w-xs transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button 
                onClick={handleSaveProfile}
                disabled={saving || (telephone === profile?.telephone && prenom === profile?.prenom && nom === profile?.nom)}
                className="relative overflow-hidden group/btn"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                <Save className="w-4 h-4 mr-2 relative" />
                <span className="relative">{saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}</span>
              </Button>
            </CardContent>
          </Card>

          {/* Préférences de notification */}
          <Card className="group card-interactive overflow-hidden border-0 shadow-lg">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            </div>
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                Notifications
              </CardTitle>
              <CardDescription>
                Gérez vos préférences de notification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/50 to-transparent border border-border/50 hover:border-primary/30 transition-colors">
                <div className="space-y-0.5">
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
            </CardContent>
          </Card>

          {/* Google Agenda */}
          <GoogleCalendarConnect />

          {/* Changer le mot de passe */}
          <ChangePasswordCard />

          {/* Supprimer le compte */}
          <Card className="group card-interactive overflow-hidden border-destructive/50 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-destructive/10 to-transparent">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <div className="p-1.5 rounded-lg bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </div>
                Zone de danger
              </CardTitle>
              <CardDescription>
                Supprimer définitivement votre compte et toutes vos données
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <DeleteAccountDialog userType="client" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
