import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles, X, Plus } from 'lucide-react';
import type { AnnonceFormData } from '@/pages/annonceur/NouvelleAnnonce';

interface StepDescriptionProps {
  formData: AnnonceFormData;
  updateFormData: (updates: Partial<AnnonceFormData>) => void;
}

const suggestedKeywords = [
  'lumineux', 'calme', 'vue dégagée', 'rénové', 'moderne',
  'proche transports', 'proche commerces', 'proche écoles',
  'parquet', 'charme', 'standing', 'familial',
];

export function StepDescription({ formData, updateFormData }: StepDescriptionProps) {
  const [newPointFort, setNewPointFort] = useState('');
  const [newMotCle, setNewMotCle] = useState('');

  const addPointFort = () => {
    if (newPointFort.trim() && formData.points_forts.length < 5) {
      updateFormData({ 
        points_forts: [...formData.points_forts, newPointFort.trim()] 
      });
      setNewPointFort('');
    }
  };

  const removePointFort = (index: number) => {
    updateFormData({
      points_forts: formData.points_forts.filter((_, i) => i !== index),
    });
  };

  const addMotCle = (mot: string) => {
    if (!formData.mots_cles.includes(mot) && formData.mots_cles.length < 10) {
      updateFormData({ mots_cles: [...formData.mots_cles, mot] });
    }
  };

  const removeMotCle = (mot: string) => {
    updateFormData({
      mots_cles: formData.mots_cles.filter((m) => m !== mot),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <FileText className="h-5 w-5" />
        <span>Description de votre bien</span>
      </div>

      {/* Titre */}
      <div className="space-y-2">
        <Label htmlFor="titre">Titre de l'annonce *</Label>
        <Input
          id="titre"
          placeholder="Ex: Magnifique 4.5 pièces avec vue sur le lac"
          value={formData.titre}
          onChange={(e) => updateFormData({ titre: e.target.value })}
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground text-right">
          {formData.titre.length}/100 caractères
        </p>
      </div>

      {/* Description courte */}
      <div className="space-y-2">
        <Label htmlFor="description_courte">Description courte</Label>
        <Textarea
          id="description_courte"
          placeholder="Résumé en quelques lignes pour attirer l'attention..."
          value={formData.description_courte}
          onChange={(e) => updateFormData({ description_courte: e.target.value })}
          rows={2}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground text-right">
          {formData.description_courte.length}/200 caractères
        </p>
      </div>

      {/* Description longue */}
      <div className="space-y-2">
        <Label htmlFor="description">Description détaillée *</Label>
        <Textarea
          id="description"
          placeholder="Décrivez votre bien en détail : agencement, finitions, environnement, commodités à proximité..."
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          rows={6}
        />
        <p className="text-xs text-muted-foreground">
          Minimum 100 caractères recommandés. Actuellement : {formData.description.length}
        </p>
      </div>

      {/* Points forts */}
      <div className="space-y-3">
        <Label>Points forts (max 5)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Ex: Vue panoramique"
            value={newPointFort}
            onChange={(e) => setNewPointFort(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPointFort())}
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={addPointFort}
            disabled={formData.points_forts.length >= 5}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {formData.points_forts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.points_forts.map((point, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {point}
                <button
                  type="button"
                  onClick={() => removePointFort(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Mots-clés */}
      <div className="space-y-3">
        <Label>Mots-clés (pour la recherche)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Ajouter un mot-clé"
            value={newMotCle}
            onChange={(e) => setNewMotCle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (newMotCle.trim()) {
                  addMotCle(newMotCle.trim());
                  setNewMotCle('');
                }
              }
            }}
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              if (newMotCle.trim()) {
                addMotCle(newMotCle.trim());
                setNewMotCle('');
              }
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggested keywords */}
        <div className="flex flex-wrap gap-2">
          {suggestedKeywords
            .filter((k) => !formData.mots_cles.includes(k))
            .map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => addMotCle(keyword)}
                className="text-xs px-2 py-1 rounded-full border border-dashed hover:border-primary hover:text-primary transition-colors"
              >
                + {keyword}
              </button>
            ))}
        </div>

        {/* Selected keywords */}
        {formData.mots_cles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {formData.mots_cles.map((mot) => (
              <Badge key={mot} variant="outline" className="gap-1">
                {mot}
                <button
                  type="button"
                  onClick={() => removeMotCle(mot)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
