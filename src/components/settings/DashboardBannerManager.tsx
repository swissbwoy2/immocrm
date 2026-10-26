import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ImageIcon, Upload, Save, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DashboardAdBanner } from '@/components/client/dashboard/DashboardAdBanner';

export function DashboardBannerManager() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [lienUrl, setLienUrl] = useState('');
  const [lienIos, setLienIos] = useState('');
  const [lienAndroid, setLienAndroid] = useState('');

  const [titre, setTitre] = useState('');
  const [texte, setTexte] = useState('');
  const [actif, setActif] = useState(true);
  const [afficherOverlay, setAfficherOverlay] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('dashboard_banners')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) console.error(error);
      if (data) {
        setId(data.id);
        setImageUrl(data.image_url || '');
        setLienUrl(data.lien_url || '');
        setLienIos((data as any).lien_ios || '');
        setLienAndroid((data as any).lien_android || '');

        setTitre(data.titre || '');
        setTexte(data.texte || '');
        setActif(!!data.actif);
        setAfficherOverlay(!!(data as any).afficher_overlay);
      }
      setLoading(false);
    })();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 8 Mo");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `dashboard-banners/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('marketing-assets').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('marketing-assets').getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success('Image téléversée');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erreur lors du téléversement");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!imageUrl) {
      toast.error('Ajoutez une image de bannière');
      return;
    }
    const link = lienUrl.trim();
    if (link && !/^(https?:\/\/|\/)/.test(link)) {
      toast.error('Le lien doit commencer par http(s):// ou /');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        image_url: imageUrl,
        lien_url: link || null,
        lien_ios: lienIos.trim() || null,
        lien_android: lienAndroid.trim() || null,
        titre: titre.trim() || null,
        texte: texte.trim() || null,
        actif,
        afficher_overlay: afficherOverlay,
        updated_by: user?.id ?? null,
      };

      if (id) {
        const { error } = await supabase.from('dashboard_banners').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('dashboard_banners')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setId(data.id);
      }
      toast.success('Bannière enregistrée');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      setImageUrl('');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('dashboard_banners').delete().eq('id', id);
      if (error) throw error;
      setId(null);
      setImageUrl('');
      setLienUrl('');
      setLienIos('');
      setLienAndroid('');

      setTitre('');
      setTexte('');
      setActif(true);
      setAfficherOverlay(false);
      toast.success('Bannière supprimée');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="imr-lg-card min-w-0 rounded-[22px]">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-3 text-base font-semibold md:text-[17px]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><ImageIcon className="h-5 w-5" /></span>
          Bannière dashboard client
        </CardTitle>
        <CardDescription className="text-sm">
          Image publicitaire affichée tout en haut du tableau de bord des clients.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-4 pb-4 md:px-6 md:pb-6">
        {loading ? (
          <div className="h-32 rounded-2xl bg-muted animate-pulse" />
        ) : (
          <>
            <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/50 px-4 dark:bg-white/[0.03]">
              <div className="flex min-h-[56px] items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <Label htmlFor="banner-actif" className="text-[15px] font-medium">Bannière active</Label>
                  <p className="text-sm text-muted-foreground">
                    Si désactivée, aucun espace n'est affiché chez les clients.
                  </p>
                </div>
                <Switch id="banner-actif" checked={actif} onCheckedChange={setActif} />
              </div>
              <div className="flex min-h-[56px] items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <Label htmlFor="banner-overlay" className="text-[15px] font-medium">Afficher un texte par-dessus l'image</Label>
                  <p className="text-sm text-muted-foreground">
                    Désactivé : seule l'image est affichée (recommandé si le visuel contient déjà du texte).
                  </p>
                </div>
                <Switch id="banner-overlay" checked={afficherOverlay} onCheckedChange={setAfficherOverlay} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Image de couverture (ratio conseillé 16:5)</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button variant="outline" className="min-h-11" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {imageUrl ? "Changer l'image" : 'Téléverser une image'}
                </Button>
                {imageUrl && (
                  <Button variant="ghost" className="min-h-11" onClick={() => setImageUrl('')}>
                    Retirer l'image
                  </Button>
                )}
              </div>
              <Input
                className="h-11 rounded-xl"
                placeholder="…ou collez une URL d'image"
                aria-label="URL de l'image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              Si tu remplis les liens iOS/Android, le clic ouvre le bon store selon l'appareil ;
              sinon l'URL simple s'ouvre pour tous.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="banner-ios">Lien App Store (iOS)</Label>
                <Input
                  id="banner-ios"
                  className="h-11 rounded-xl"
                  inputMode="url"
                  placeholder="https://apps.apple.com/…"
                  value={lienIos}
                  onChange={(e) => setLienIos(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banner-android">Lien Play Store (Android)</Label>
                <Input
                  id="banner-android"
                  className="h-11 rounded-xl"
                  inputMode="url"
                  placeholder="https://play.google.com/store/apps/…"
                  value={lienAndroid}
                  onChange={(e) => setLienAndroid(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banner-url">URL simple (optionnel)</Label>
                <Input
                  id="banner-url"
                  className="h-11 rounded-xl"
                  inputMode="url"
                  placeholder="https://… ou /client/offres-recues"
                  value={lienUrl}
                  onChange={(e) => setLienUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banner-titre">Titre (optionnel)</Label>
                <Input id="banner-titre" className="h-11 rounded-xl" value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={80} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="banner-texte">Texte (optionnel)</Label>
              <Textarea
                id="banner-texte"
                className="rounded-xl"
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                rows={2}
                maxLength={160}
              />
            </div>

            <div className="space-y-2">
              <Label>Aperçu</Label>
              {imageUrl ? (
                <DashboardAdBanner
                  banner={{
                    id: 'preview',
                    image_url: imageUrl,
                    lien_url: lienUrl || null,
                    lien_ios: lienIos || null,
                    lien_android: lienAndroid || null,

                    titre: titre || null,
                    texte: texte || null,
                    actif,
                    afficher_overlay: afficherOverlay,
                  }}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                  Aucune image sélectionnée
                </div>
              )}
            </div>

            {/* Actions : barre collée en bas sur mobile (formulaire long), pied de carte sur ordinateur */}
            <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-[22px] border-t border-border/60 bg-background/85 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:justify-end sm:rounded-none sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-4 sm:backdrop-blur-none">
              {id && (
                <Button variant="outline" className="min-h-11" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              )}
              <Button className="min-h-11" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
