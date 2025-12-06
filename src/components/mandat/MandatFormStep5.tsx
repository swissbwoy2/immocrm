import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Users, UserPlus, Wallet, Briefcase, Globe } from 'lucide-react';
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

  const totalRevenus = data.candidats.reduce((sum, c) => sum + (c.revenus_mensuels || 0), 0);

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4 relative">
          <Users className="h-8 w-8 text-primary" />
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-75" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Candidats supplémentaires
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ajoutez les personnes qui occuperont le logement avec vous
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          (conjoint, enfants, colocataires, garants...)
        </p>
      </div>

      {/* Add Button */}
      <div className="flex justify-center">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2 group relative overflow-hidden bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 hover:border-primary/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <UserPlus className="h-4 w-4 group-hover:scale-110 transition-transform" />
              Ajouter un candidat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-card/95 border-border/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Ajouter un candidat
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom <span className="text-destructive">*</span></Label>
                  <Input
                    value={currentCandidat.prenom}
                    onChange={(e) => setCurrentCandidat({ ...currentCandidat, prenom: e.target.value })}
                    placeholder="Prénom"
                    className="bg-background/50 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom <span className="text-destructive">*</span></Label>
                  <Input
                    value={currentCandidat.nom}
                    onChange={(e) => setCurrentCandidat({ ...currentCandidat, nom: e.target.value })}
                    placeholder="Nom"
                    className="bg-background/50 backdrop-blur-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lien avec le titulaire <span className="text-destructive">*</span></Label>
                <Select 
                  value={currentCandidat.lien_avec_client} 
                  onValueChange={(value) => setCurrentCandidat({ ...currentCandidat, lien_avec_client: value })}
                >
                  <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-popover/95">
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
                  className="bg-background/50 backdrop-blur-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nationalité</Label>
                  <Select 
                    value={currentCandidat.nationalite} 
                    onValueChange={(value) => setCurrentCandidat({ ...currentCandidat, nationalite: value })}
                  >
                    <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-popover/95">
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
                    <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-popover/95">
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
                    className="bg-background/50 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employeur</Label>
                  <Input
                    value={currentCandidat.employeur}
                    onChange={(e) => setCurrentCandidat({ ...currentCandidat, employeur: e.target.value })}
                    placeholder="Employeur"
                    className="bg-background/50 backdrop-blur-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Revenus mensuels (CHF)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={currentCandidat.revenus_mensuels || ''}
                    onChange={(e) => setCurrentCandidat({ ...currentCandidat, revenus_mensuels: Number(e.target.value) })}
                    placeholder="Ex: 4000"
                    className="bg-background/50 backdrop-blur-sm pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    CHF
                  </span>
                </div>
              </div>

              <Button 
                onClick={handleAddCandidat} 
                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
                disabled={!currentCandidat.prenom || !currentCandidat.nom || !currentCandidat.lien_avec_client}
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty State or List */}
      {data.candidats.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-4">
            <Users className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground">Aucun candidat supplémentaire ajouté</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Vous pouvez passer cette étape si vous êtes seul(e)</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Total revenus */}
          {totalRevenus > 0 && (
            <Card className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-green-600" />
                  Revenus additionnels
                </span>
                <span className="text-lg font-bold text-green-600">
                  +{totalRevenus.toLocaleString('fr-CH')} CHF/mois
                </span>
              </div>
            </Card>
          )}

          {/* Candidates list */}
          {data.candidats.map((candidat, index) => (
            <Card 
              key={candidat.id} 
              className="p-4 backdrop-blur-sm bg-card/80 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {candidat.prenom.charAt(0)}{candidat.nom.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{candidat.prenom} {candidat.nom}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {candidat.lien_avec_client}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {candidat.profession && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {candidat.profession}
                      </span>
                    )}
                    {candidat.nationalite && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {candidat.nationalite}
                      </span>
                    )}
                    {candidat.revenus_mensuels > 0 && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <Wallet className="h-3 w-3" />
                        {candidat.revenus_mensuels.toLocaleString('fr-CH')} CHF/mois
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleRemoveCandidat(candidat.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
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
