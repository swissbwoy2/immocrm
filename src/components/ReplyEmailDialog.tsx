import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Reply, Forward, Settings } from "lucide-react";
import { EmailConfigurationDialog } from "./EmailConfigurationDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ReceivedEmail {
  id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string | null;
}

interface ReplyEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: ReceivedEmail | null;
  mode: 'reply' | 'forward';
  onSent?: () => void;
}

export function ReplyEmailDialog({ 
  open, 
  onOpenChange, 
  email,
  mode,
  onSent
}: ReplyEmailDialogProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [hasEmailConfig, setHasEmailConfig] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [signature, setSignature] = useState("");
  
  const [formData, setFormData] = useState({
    recipient_email: "",
    recipient_name: "",
    subject: "",
    body_html: "",
  });

  useEffect(() => {
    if (open && email) {
      checkEmailConfiguration();
      initializeForm();
    }
  }, [open, email, mode]);

  const initializeForm = () => {
    if (!email) return;

    const prefix = mode === 'reply' ? 'Re: ' : 'Fwd: ';
    const subject = email.subject || '(Sans objet)';
    const newSubject = subject.startsWith(prefix) ? subject : prefix + subject;

    // Format quoted message
    const quotedHeader = `\n\n---------- Message original ----------\nDe: ${email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}\nDate: ${email.received_at ? format(new Date(email.received_at), "d MMMM yyyy 'à' HH:mm", { locale: fr }) : 'Non disponible'}\nObjet: ${email.subject || '(Sans objet)'}\nÀ: ${email.to_email}\n\n`;
    
    const quotedBody = email.body_text || '(Pas de contenu)';

    setFormData({
      recipient_email: mode === 'reply' ? email.from_email : "",
      recipient_name: mode === 'reply' ? (email.from_name || "") : "",
      subject: newSubject,
      body_html: mode === 'reply' 
        ? `\n\n${quotedHeader}${quotedBody}`
        : `${quotedHeader}${quotedBody}`,
    });
  };

  const checkEmailConfiguration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('email_configurations')
        .select('signature_html, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      setHasEmailConfig(!!data);
      if (data?.signature_html) {
        setSignature(data.signature_html);
      }
    } catch (error) {
      console.error('Error checking email config:', error);
    }
  };

  const handleSend = async () => {
    if (!formData.recipient_email || !formData.subject) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir l'adresse email et l'objet",
        variant: "destructive",
      });
      return;
    }

    if (!hasEmailConfig) {
      toast({
        title: "Configuration manquante",
        description: "Veuillez d'abord configurer vos paramètres email",
        variant: "destructive",
      });
      setShowConfigDialog(true);
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          recipient_email: formData.recipient_email,
          recipient_name: formData.recipient_name,
          subject: formData.subject,
          body_html: formData.body_html,
          attachments: [],
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "Email envoyé",
        description: `Email ${mode === 'reply' ? 'répondu' : 'transféré'} avec succès`,
      });
      onOpenChange(false);
      onSent?.();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Erreur d'envoi",
        description: error.message || "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const Icon = mode === 'reply' ? Reply : Forward;
  const title = mode === 'reply' ? 'Répondre' : 'Transférer';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription>
              {mode === 'reply' 
                ? `Répondre à ${email?.from_name || email?.from_email}` 
                : 'Transférer cet email'}
            </DialogDescription>
          </DialogHeader>

          {!hasEmailConfig ? (
            <div className="py-8 text-center">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Vous devez d'abord configurer vos paramètres email SMTP
              </p>
              <Button onClick={() => setShowConfigDialog(true)}>
                Configurer mes emails
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Recipients */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email destinataire *</Label>
                  <Input
                    type="email"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipient_email: e.target.value }))}
                    placeholder="destinataire@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom destinataire</Label>
                  <Input
                    value={formData.recipient_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
                    placeholder="Nom du destinataire"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label>Objet *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Objet de l'email"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={formData.body_html}
                  onChange={(e) => setFormData(prev => ({ ...prev, body_html: e.target.value }))}
                  placeholder="Votre réponse..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              {/* Signature preview */}
              {signature && (
                <div className="p-3 border rounded-md bg-muted/50">
                  <Label className="text-xs text-muted-foreground">Signature (ajoutée automatiquement) :</Label>
                  <div 
                    className="mt-1 text-sm"
                    dangerouslySetInnerHTML={{ __html: signature }}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowConfigDialog(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres email
                </Button>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSend} disabled={sending}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Envoyer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EmailConfigurationDialog 
        open={showConfigDialog} 
        onOpenChange={(open) => {
          setShowConfigDialog(open);
          if (!open) checkEmailConfiguration();
        }} 
      />
    </>
  );
}
