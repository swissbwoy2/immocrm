import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { MandatV3FormData } from './types';
import { NATIONALITES, TYPES_PERMIS, ETATS_CIVILS } from '@/components/mandat/types';

interface Props {
  data: MandatV3FormData;
  onChange: (data: Partial<MandatV3FormData>) => void;
}

export default function MandatV3Step1Identity({ data, onChange }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const hasSecondaryData = !!(data.date_naissance || data.nationalite || data.adresse || data.npa || data.ville || data.type_permis || data.etat_civil);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Informations personnelles</h2>
        <p className="text-sm text-muted-foreground mt-1">Renseignez vos coordonnées et informations d'identité.</p>
      </div>

      {/* Essential fields - always visible */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="prenom">Prénom *</Label>
            <Input id="prenom" value={data.prenom} onChange={(e) => onChange({ prenom: e.target.value })} placeholder="Votre prénom" required className="min-h-[44px]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" value={data.nom} onChange={(e) => onChange({ nom: e.target.value })} placeholder="Votre nom" required className="min-h-[44px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={data.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="votre@email.ch" required className="min-h-[44px]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telephone">Téléphone *</Label>
            <Input id="telephone" type="tel" value={data.telephone} onChange={(e) => onChange({ telephone: e.target.value })} placeholder="+41 79 000 00 00" required className="min-h-[44px]" />
          </div>
        </div>
      </div>

      {/* Secondary fields - collapsible on mobile */}
      <Collapsible open={detailsOpen || hasSecondaryData} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors min-h-[48px]">
          <span className="text-sm font-medium text-foreground">
            Informations complémentaires
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${detailsOpen || hasSecondaryData ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date_naissance">Date de naissance</Label>
              <Input id="date_naissance" type="date" value={data.date_naissance} onChange={(e) => onChange({ date_naissance: e.target.value })} className="min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nationalite">Nationalité</Label>
              <Select value={data.nationalite} onValueChange={(v) => onChange({ nationalite: v })}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {NATIONALITES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" value={data.adresse} onChange={(e) => onChange({ adresse: e.target.value })} placeholder="Rue et numéro" className="min-h-[44px]" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="npa">NPA</Label>
              <Input id="npa" value={data.npa} onChange={(e) => onChange({ npa: e.target.value })} placeholder="1000" className="min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" value={data.ville} onChange={(e) => onChange({ ville: e.target.value })} placeholder="Lausanne" className="min-h-[44px]" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="type_permis">Type de permis</Label>
              <Select value={data.type_permis} onValueChange={(v) => onChange({ type_permis: v })}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {TYPES_PERMIS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="etat_civil">État civil</Label>
              <Select value={data.etat_civil} onValueChange={(v) => onChange({ etat_civil: v })}>
                <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {ETATS_CIVILS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Professional situation */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors min-h-[48px]">
          <span className="text-sm font-medium text-foreground">
            Situation professionnelle
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="profession">Profession</Label>
              <Input id="profession" value={data.profession} onChange={(e) => onChange({ profession: e.target.value })} placeholder="Votre profession" className="min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employeur">Employeur</Label>
              <Input id="employeur" value={data.employeur} onChange={(e) => onChange({ employeur: e.target.value })} placeholder="Nom de l'employeur" className="min-h-[44px]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="revenus">Revenus mensuels (CHF)</Label>
              <Input id="revenus" type="number" value={data.revenus_mensuels || ''} onChange={(e) => onChange({ revenus_mensuels: Number(e.target.value) })} placeholder="0" className="min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enfants">Nombre d'enfants</Label>
              <Input id="enfants" type="number" min={0} value={data.nombre_enfants} onChange={(e) => onChange({ nombre_enfants: Number(e.target.value) })} className="min-h-[44px]" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer min-h-[44px] px-1">
            <input type="checkbox" checked={data.animaux} onChange={(e) => onChange({ animaux: e.target.checked })} className="rounded border-muted-foreground w-5 h-5" />
            <span className="text-sm">Animaux domestiques</span>
          </label>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
