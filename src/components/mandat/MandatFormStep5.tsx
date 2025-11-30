import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Users } from 'lucide-react';
import { MandatFormData, CandidatData, NATIONALITES, TYPES_PERMIS, LIENS_CANDIDAT } from './types';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

const emptyCanditat: Omit<CandidatData, 'id'> = {
  prenom: '',
  nom: '',
  date_naissance: '',
  nationalite: '',
  type_permis: '',
  profession: '',
  employeur: '',
  revenus_mensuels: 0,
  lien_avec_client: '',
};

export default function MandatFormStep5({ data, onChange }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentCandidat, setCurrentCandidat] = useState<Omit<CandidatData, 'id'>>(emptyCanditat);

  const handleAddCandidat = () => {
    if (!currentCandidat.prenom || !currentCandidat.nom || !currentCandidat.lien_avec_client) {
      return;
    }

    const newCandidat: CandidatData = {
      ...currentCandidat,
      id: crypto.randomUUID(),
    };

    onChange({ candidats: [...data.candidats, newCandidat] });
    setCurrentCandidat(emptyCanditat);
    setIsDialogOpen(false);
  };

  const handleRemoveCandidat = (id: string) => {
    onChange({ candidats: data.candidats.filter(c => c.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Candidats supplémentaires</h2>
        <p className="text-sm text-muted-foreground">
          Ajoutez les personnes qui occuperont le logement avec vous (conjoint, enfants, colocataires, garants...)
        </p>
      </div>

      <div className="flex justify-center">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un candidat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un candidat</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom *</Label>
                  <Input
                    value={currentCandidat.prenom}
                    onChange={(e) => setCurrentCandidat({ ...currentCandidat, prenom: e.target.value })}
                    placeholder="Prénom"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input
                    value={currentCandidat.nom}
                    onChange={(e) => setCurrentCandidat({ ...currentCandidat, nom: e.target.value })}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lien avec le titulaire *</Label>
                <Select 
                  value={currentCandidat.lien_avec_client} 
                  onValueChange={(value) => setCurrentCandidat({ ...currentCandidat, lien_avec_client: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIENS_CANDIDAT.map((lien) => (
                      <SelectItem key={lien} value={lien}>{lien}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date de naissance</Label>
                <Input
                  type="date"
                  value={currentCandidat.date_naissance}
                  onChange={(e) => setCurrentCandidat({ ...currentCandidat, date_naissance: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nationalité</Label>
                  <Select 
                    value={currentCandidat.nationalite} 
                    onValueChange={(value) => setCurrentCandidat({ ...currentCandidat, nationalite: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      {NATIONALITES.map((nat) => (
                        <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type de permis</Label>
                  <Select 
                    value={currentCandidat.type_permis} 
                    onValueChange={(value) => setCurrentCandidat({ ...currentCandidat, type_permis: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES_PERMIS.map((permis) => (
                        <SelectItem key={permis.value} value={permis.value}>{permis.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Profession</Label>
                  <Input
                    value={currentCandidat.profession}
                    onChange={(e) => setCurrentCandidat({ ...currentCandidat, profession: e.target.value })}
                    placeholder="Profession"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employeur</Label>
                  <Input
                    value={currentCandidat.employeur}
                    onChange={(e) => setCurrentCandidat({ ...currentCandidat, employeur: e.target.value })}
                    placeholder="Employeur"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Revenus mensuels (CHF)</Label>
                <Input
                  type="number"
                  value={currentCandidat.revenus_mensuels || ''}
                  onChange={(e) => setCurrentCandidat({ ...currentCandidat, revenus_mensuels: Number(e.target.value) })}
                  placeholder="Ex: 4000"
                />
              </div>

              <Button 
                onClick={handleAddCandidat} 
                className="w-full"
                disabled={!currentCandidat.prenom || !currentCandidat.nom || !currentCandidat.lien_avec_client}
              >
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {data.candidats.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun candidat supplémentaire ajouté</p>
          <p className="text-sm">Vous pouvez passer cette étape si vous êtes seul(e)</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.candidats.map((candidat) => (
            <Card key={candidat.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium">{candidat.prenom} {candidat.nom}</p>
                  <p className="text-sm text-muted-foreground">{candidat.lien_avec_client}</p>
                  {candidat.revenus_mensuels > 0 && (
                    <p className="text-sm text-primary">
                      Revenus: {candidat.revenus_mensuels.toLocaleString('fr-CH')} CHF/mois
                    </p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleRemoveCandidat(candidat.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
