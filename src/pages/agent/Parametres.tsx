import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, Mail, Phone, User, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AgentParametres() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [telephone, setTelephone] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

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

  const handleSaveTelephone = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telephone })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Téléphone mis à jour');
      loadProfile();
    } catch (error) {
      console.error('Error updating telephone:', error);
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

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground">Gérez votre profil et vos préférences</p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Photo de profil */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Photo de profil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Téléchargement...' : 'Changer la photo'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG ou WebP. Max 5 Mo.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Prénom</Label>
                  <div className="font-medium mt-1">{profile?.prenom}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nom</Label>
                  <div className="font-medium mt-1">{profile?.nom}</div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <div className="font-medium mt-1">{profile?.email}</div>
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  Téléphone
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+41 XX XXX XX XX"
                    className="max-w-xs"
                  />
                  <Button 
                    onClick={handleSaveTelephone}
                    disabled={saving || telephone === profile?.telephone}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration SMTP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configurez votre serveur SMTP pour envoyer des emails directement depuis l'application.
              </p>
              <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('open-email-config'))}>
                Configurer l'email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
