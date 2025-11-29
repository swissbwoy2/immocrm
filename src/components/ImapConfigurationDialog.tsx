import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Server, Lock, Mail, Eye, EyeOff } from 'lucide-react';

interface ImapConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigSaved?: () => void;
}

export function ImapConfigurationDialog({ open, onOpenChange, onConfigSaved }: ImapConfigurationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [config, setConfig] = useState({
    imap_host: '',
    imap_port: 993,
    imap_user: '',
    imap_password: '',
    imap_secure: true,
  });

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('imap_configurations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          imap_host: data.imap_host,
          imap_port: data.imap_port,
          imap_user: data.imap_user,
          imap_password: data.imap_password,
          imap_secure: data.imap_secure ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading IMAP config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.imap_host || !config.imap_user || !config.imap_password) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('imap_configurations')
        .upsert({
          user_id: user.id,
          imap_host: config.imap_host,
          imap_port: config.imap_port,
          imap_user: config.imap_user,
          imap_password: config.imap_password,
          imap_secure: config.imap_secure,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('Configuration IMAP sauvegardée');
      onConfigSaved?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving IMAP config:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const presets = [
    { name: 'Gmail', host: 'imap.gmail.com', port: 993 },
    { name: 'Outlook', host: 'outlook.office365.com', port: 993 },
    { name: 'Yahoo', host: 'imap.mail.yahoo.com', port: 993 },
    { name: 'iCloud', host: 'imap.mail.me.com', port: 993 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Configuration IMAP
          </DialogTitle>
          <DialogDescription>
            Configurez votre serveur IMAP pour recevoir vos emails
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Presets */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Configurations rapides</Label>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => setConfig(prev => ({ 
                      ...prev, 
                      imap_host: preset.host, 
                      imap_port: preset.port 
                    }))}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Host */}
            <div className="space-y-2">
              <Label htmlFor="imap_host">Serveur IMAP *</Label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="imap_host"
                  value={config.imap_host}
                  onChange={(e) => setConfig(prev => ({ ...prev, imap_host: e.target.value }))}
                  placeholder="imap.example.com"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Port */}
            <div className="space-y-2">
              <Label htmlFor="imap_port">Port</Label>
              <Input
                id="imap_port"
                type="number"
                value={config.imap_port}
                onChange={(e) => setConfig(prev => ({ ...prev, imap_port: parseInt(e.target.value) || 993 }))}
                placeholder="993"
              />
            </div>

            {/* User */}
            <div className="space-y-2">
              <Label htmlFor="imap_user">Email / Identifiant *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="imap_user"
                  value={config.imap_user}
                  onChange={(e) => setConfig(prev => ({ ...prev, imap_user: e.target.value }))}
                  placeholder="votre@email.com"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="imap_password">Mot de passe *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="imap_password"
                  type={showPassword ? 'text' : 'password'}
                  value={config.imap_password}
                  onChange={(e) => setConfig(prev => ({ ...prev, imap_password: e.target.value }))}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Pour Gmail, utilisez un mot de passe d'application
              </p>
            </div>

            {/* SSL */}
            <div className="flex items-center justify-between">
              <Label htmlFor="imap_secure">Connexion sécurisée (SSL/TLS)</Label>
              <Switch
                id="imap_secure"
                checked={config.imap_secure}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, imap_secure: checked }))}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  'Sauvegarder'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}