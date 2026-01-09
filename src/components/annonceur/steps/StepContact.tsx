import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, Phone, Mail, MessageSquare, Clock } from 'lucide-react';
import type { AnnonceFormData } from '@/pages/annonceur/NouvelleAnnonce';

interface StepContactProps {
  formData: AnnonceFormData;
  updateFormData: (updates: Partial<AnnonceFormData>) => void;
}

export function StepContact({ formData, updateFormData }: StepContactProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <User className="h-5 w-5" />
        <span>Informations de contact</span>
      </div>

      <p className="text-sm text-muted-foreground">
        Ces informations seront affichées sur votre annonce pour permettre aux intéressés de vous contacter.
      </p>

      {/* Nom */}
      <div className="space-y-2">
        <Label htmlFor="nom_contact">Nom du contact *</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="nom_contact"
            placeholder="Jean Dupont"
            value={formData.nom_contact}
            onChange={(e) => updateFormData({ nom_contact: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Téléphone */}
      <div className="space-y-2">
        <Label htmlFor="telephone_contact">Téléphone</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="telephone_contact"
            type="tel"
            placeholder="+41 79 123 45 67"
            value={formData.telephone_contact}
            onChange={(e) => updateFormData({ telephone_contact: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email_contact">Email *</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email_contact"
            type="email"
            placeholder="contact@exemple.ch"
            value={formData.email_contact}
            onChange={(e) => updateFormData({ email_contact: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>

      {/* WhatsApp */}
      <div className="space-y-2">
        <Label htmlFor="whatsapp_contact">WhatsApp</Label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="whatsapp_contact"
            type="tel"
            placeholder="+41 79 123 45 67"
            value={formData.whatsapp_contact}
            onChange={(e) => updateFormData({ whatsapp_contact: e.target.value })}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Les visiteurs pourront vous contacter directement via WhatsApp
        </p>
      </div>

      {/* Horaires */}
      <div className="space-y-2">
        <Label htmlFor="horaires_contact">Horaires de disponibilité</Label>
        <div className="relative">
          <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            id="horaires_contact"
            placeholder="Lundi - Vendredi : 9h - 18h&#10;Samedi : 10h - 14h"
            value={formData.horaires_contact}
            onChange={(e) => updateFormData({ horaires_contact: e.target.value })}
            className="pl-10 min-h-[80px]"
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <p className="text-sm text-muted-foreground">
          💡 Un numéro de téléphone visible augmente le taux de contact de 40%. 
          Nous vous recommandons de le renseigner.
        </p>
      </div>
    </div>
  );
}
