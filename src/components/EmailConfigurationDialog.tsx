import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Server, Key, User, CheckCircle2, XCircle, Wifi } from "lucide-react";

interface EmailConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Port 465 uses direct SSL/TLS which works reliably in edge functions
// Port 587 uses STARTTLS which has known issues in Deno edge functions
const SMTP_PRESETS = [
  { name: "Gmail", host: "smtp.gmail.com", port: 465, secure: true },
  { name: "Outlook/Office 365", host: "smtp-mail.outlook.com", port: 587, secure: false },
  { name: "Infomaniak", host: "mail.infomaniak.com", port: 465, secure: true },
  { name: "OVH", host: "ssl0.ovh.net", port: 465, secure: true },
  { name: "Yahoo", host: "smtp.mail.yahoo.com", port: 465, secure: true },
  { name: "Personnalisé", host: "", port: 465, secure: true },
];

export function EmailConfigurationDialog({ open, onOpenChange }: EmailConfigurationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState("Personnalisé");
  
  const [config, setConfig] = useState({
    smtp_host: "",
    smtp_port: 587,
    smtp_secure: true,
    smtp_user: "",
    smtp_password: "",
    email_from: "",
    display_name: "",
    signature_html: "",
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      loadConfiguration();
    }
  }, [open]);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setConfig({
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port || 587,
          smtp_secure: data.smtp_secure ?? true,
          smtp_user: data.smtp_user || "",
          smtp_password: data.smtp_password || "",
          email_from: data.email_from || "",
          display_name: data.display_name || "",
          signature_html: data.signature_html || "",
          is_active: data.is_active ?? true,
        });
        
        // Find matching preset
        const preset = SMTP_PRESETS.find(p => p.host === data.smtp_host);
        if (preset) {
          setSelectedPreset(preset.name);
        } else {
          setSelectedPreset("Personnalisé");
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    setTestResult(null); // Reset test result when preset changes
    const preset = SMTP_PRESETS.find(p => p.name === presetName);
    if (preset && preset.host) {
      setConfig(prev => ({
        ...prev,
        smtp_host: preset.host,
        smtp_port: preset.port,
        smtp_secure: preset.secure,
      }));
    }
  };

  const handleTestConnection = async () => {
    if (!config.smtp_host || !config.smtp_user || !config.smtp_password || !config.email_from) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires avant de tester",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non authentifié");

      const response = await supabase.functions.invoke('test-smtp-connection', {
        body: {
          smtp_host: config.smtp_host,
          smtp_port: config.smtp_port,
          smtp_secure: config.smtp_secure,
          smtp_user: config.smtp_user,
          smtp_password: config.smtp_password,
          email_from: config.email_from,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors du test');
      }

      const result = response.data;
      
      if (result.success) {
        setTestResult({ success: true, message: result.message });
        toast({
          title: "Connexion réussie",
          description: result.message,
        });
      } else {
        setTestResult({ success: false, message: result.error });
        toast({
          title: "Échec de la connexion",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      const errorMessage = error.message || "Erreur lors du test de connexion";
      setTestResult({ success: false, message: errorMessage });
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!config.smtp_host || !config.smtp_user || !config.smtp_password || !config.email_from) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: existing } = await supabase
        .from('email_configurations')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('email_configurations')
          .update({ ...config, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_configurations')
          .insert({ ...config, user_id: user.id });
        
        if (error) throw error;
      }

      toast({
        title: "Configuration enregistrée",
        description: "Vos paramètres email ont été sauvegardés",
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder la configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configuration Email SMTP
          </DialogTitle>
          <DialogDescription>
            Configurez vos paramètres SMTP pour envoyer des emails depuis l'application
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preset selector */}
            <div className="space-y-2">
              <Label>Fournisseur email</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SMTP_PRESETS.map(preset => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SMTP Server settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Serveur SMTP *
                </Label>
                <Input
                  value={config.smtp_host}
                  onChange={(e) => setConfig(prev => ({ ...prev, smtp_host: e.target.value }))}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Port *</Label>
                <Input
                  type="number"
                  value={config.smtp_port}
                  onChange={(e) => setConfig(prev => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={config.smtp_secure}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, smtp_secure: checked }))}
              />
              <Label>Connexion sécurisée (TLS/SSL)</Label>
            </div>

            {/* Authentication */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Identifiant SMTP *
                </Label>
                <Input
                  value={config.smtp_user}
                  onChange={(e) => setConfig(prev => ({ ...prev, smtp_user: e.target.value }))}
                  placeholder="votre.email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Mot de passe / App Password *
                </Label>
                <Input
                  type="password"
                  value={config.smtp_password}
                  onChange={(e) => setConfig(prev => ({ ...prev, smtp_password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* From address */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email d'envoi *</Label>
                <Input
                  type="email"
                  value={config.email_from}
                  onChange={(e) => setConfig(prev => ({ ...prev, email_from: e.target.value }))}
                  placeholder="votre.email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom d'affichage</Label>
                <Input
                  value={config.display_name}
                  onChange={(e) => setConfig(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Jean Dupont - Immo Rama"
                />
              </div>
            </div>

            {/* Signature */}
            <div className="space-y-2">
              <Label>Signature email (HTML)</Label>
              <Textarea
                value={config.signature_html}
                onChange={(e) => setConfig(prev => ({ ...prev, signature_html: e.target.value }))}
                placeholder="<p>Cordialement,<br/>Jean Dupont<br/>Agent immobilier</p>"
                rows={4}
              />
              {config.signature_html && (
                <div className="mt-2 p-3 border rounded-md bg-muted/50">
                  <Label className="text-xs text-muted-foreground">Aperçu :</Label>
                  <div 
                    className="mt-1 text-sm"
                    dangerouslySetInnerHTML={{ __html: config.signature_html }}
                  />
                </div>
              )}
            </div>

            {/* Active toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                checked={config.is_active}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Configuration active</Label>
            </div>

            {/* Test connection button and result */}
            <div className="space-y-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleTestConnection} 
                disabled={testing || !config.smtp_host || !config.smtp_user || !config.smtp_password || !config.email_from}
                className="w-full"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4 mr-2" />
                )}
                Tester la connexion SMTP
              </Button>
              
              {testResult && (
                <div className={`p-3 rounded-md text-sm flex items-start gap-2 ${
                  testResult.success 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-destructive/10 border border-destructive/20'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <p className={testResult.success ? 'text-green-700 dark:text-green-300' : 'text-destructive'}>
                    {testResult.message}
                  </p>
                </div>
              )}
            </div>

            {/* Warning for port 587 */}
            {config.smtp_port === 587 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">⚠️ Port 587 (STARTTLS)</p>
                <p className="text-muted-foreground mt-1">
                  Le port 587 utilise STARTTLS qui peut être instable. Si vous rencontrez des erreurs d'envoi, 
                  essayez d'utiliser le <strong>port 465</strong> avec TLS activé pour une connexion plus fiable.
                </p>
              </div>
            )}

            {/* Help text for Gmail */}
            {selectedPreset === "Gmail" && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">Note pour Gmail :</p>
                <p className="text-muted-foreground mt-1">
                  Vous devez créer un "Mot de passe d'application" dans les paramètres de sécurité de votre compte Google. 
                  <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                    Créer un mot de passe d'application
                  </a>
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
