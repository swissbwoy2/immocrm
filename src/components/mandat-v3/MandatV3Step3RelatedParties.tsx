import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { MandatV3FormData, RelatedPartyData } from './types';
import { NATIONALITES, TYPES_PERMIS, LIENS_CANDIDAT } from '@/components/mandat/types';

interface Props {
  data: MandatV3FormData;
  onChange: (data: Partial<MandatV3FormData>) => void;
}

export default function MandatV3Step3RelatedParties({ data, onChange }: Props) {
  const addParty = () => {
    const newParty: RelatedPartyData = {
      id: crypto.randomUUID(),
      role: 'co-titulaire',
      prenom: '', nom: '', email: '', telephone: '',
      date_naissance: '', nationalite: '', type_permis: '',
      profession: '', employeur: '', revenus_mensuels: 0,
      lien_avec_mandant: '',
    };
    onChange({ related_parties: [...data.related_parties, newParty] });
  };

  const removeParty = (id: string) => {
    onChange({ related_parties: data.related_parties.filter((p) => p.id !== id) });
  };

  const updateParty = (id: string, field: keyof RelatedPartyData, value: any) => {
    onChange({
      related_parties: data.related_parties.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Tiers liés</h2>
        <p className="text-sm text-muted-foreground mt-1">Ajoutez les personnes qui occuperont le logement avec vous.</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Les données des tiers sont collectées à titre informatif uniquement. Leur engagement juridique sera traité dans une phase ultérieure.
        </p>
      </div>

      {data.related_parties.map((party, index) => (
        <div key={party.id} className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Tiers #{index + 1}</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeParty(party.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Lien avec le mandant</Label>
              <Select value={party.lien_avec_mandant} onValueChange={(v) => updateParty(party.id, 'lien_avec_mandant', v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {LIENS_CANDIDAT.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prénom *</Label>
              <Input value={party.prenom} onChange={(e) => updateParty(party.id, 'prenom', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={party.nom} onChange={(e) => updateParty(party.id, 'nom', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={party.email} onChange={(e) => updateParty(party.id, 'email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input type="tel" value={party.telephone} onChange={(e) => updateParty(party.id, 'telephone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date de naissance</Label>
              <Input type="date" value={party.date_naissance} onChange={(e) => updateParty(party.id, 'date_naissance', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nationalité</Label>
              <Select value={party.nationalite} onValueChange={(v) => updateParty(party.id, 'nationalite', v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{NATIONALITES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Permis</Label>
              <Select value={party.type_permis} onValueChange={(v) => updateParty(party.id, 'type_permis', v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{TYPES_PERMIS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Profession</Label>
              <Input value={party.profession} onChange={(e) => updateParty(party.id, 'profession', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Employeur</Label>
              <Input value={party.employeur} onChange={(e) => updateParty(party.id, 'employeur', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Revenus mensuels (CHF)</Label>
              <Input type="number" value={party.revenus_mensuels || ''} onChange={(e) => updateParty(party.id, 'revenus_mensuels', Number(e.target.value))} />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addParty} className="w-full gap-2">
        <Plus className="h-4 w-4" /> Ajouter un tiers
      </Button>
    </div>
  );
}
