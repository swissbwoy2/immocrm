import { MandatFormData } from './types';
import { LandingInput } from '@/components/forms-premium/LandingInput';
import { LuxuryIconBadge } from '@/components/forms-premium/LuxuryIconBadge';
import { IconHome, IconBuilding, IconPhone, IconWallet, IconCalendar } from '@/components/forms-premium/icons/LuxuryIcons';
import { Grid, MessageSquare } from 'lucide-react';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

export default function MandatFormStep2({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Situation actuelle</h2>
        <p className="text-sm text-muted-foreground mt-1">Informations sur votre logement actuel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LandingInput
          label="Gérance ou propriétaire actuel(le)"
          value={data.gerance_actuelle}
          onChange={(e) => onChange({ gerance_actuelle: e.target.value })}
          icon={<IconBuilding size={16} />}
          placeholder="Nom de la gérance ou du propriétaire"
          required
        />
        <LandingInput
          label="Contact gérance"
          value={data.contact_gerance}
          onChange={(e) => onChange({ contact_gerance: e.target.value })}
          icon={<IconPhone size={16} />}
          placeholder="Téléphone ou email"
          required
        />

        {/* Loyer actuel avec suffixe CHF */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="text-primary"><IconWallet size={16} /></span>
            Loyer brut actuel (CHF) <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.loyer_actuel || ''}
              onChange={(e) => onChange({ loyer_actuel: Number(e.target.value) })}
              placeholder="Ex: 1500"
              className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium pointer-events-none">CHF</span>
          </div>
        </div>

        <LandingInput
          label="Depuis le"
          type="date"
          value={data.depuis_le}
          onChange={(e) => onChange({ depuis_le: e.target.value })}
          icon={<IconCalendar size={16} />}
          required
        />

        {/* Nombre de pièces */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="text-primary"><Grid size={16} /></span>
            Nombre de pièces actuel <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            step="0.5"
            value={data.pieces_actuel || ''}
            onChange={(e) => onChange({ pieces_actuel: Number(e.target.value) })}
            placeholder="Ex: 3.5"
            className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300"
          />
        </div>

        {/* Motif full width */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="text-primary"><MessageSquare size={16} /></span>
            Motif du changement de domicile <span className="text-destructive">*</span>
          </label>
          <input
            value={data.motif_changement}
            onChange={(e) => onChange({ motif_changement: e.target.value })}
            placeholder="Ex: Agrandissement de la famille, rapprochement travail..."
            className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary transition-all duration-300"
          />
        </div>
      </div>
    </div>
  );
}
