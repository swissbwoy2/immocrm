import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calculator, TrendingUp, TrendingDown, Save, Loader2, 
  Plus, X, Target, AlertTriangle, CheckCircle
} from 'lucide-react';

interface EstimationModuleProps {
  immeuble: {
    id: string;
    surface_totale: number;
    prix_vente_demande: number;
    estimation_valeur_basse: number;
    estimation_valeur_haute: number;
    estimation_valeur_recommandee: number;
    estimation_prix_m2: number;
    estimation_date: string;
    estimation_methode: string;
    estimation_notes: string;
    facteurs_positifs: string[];
    facteurs_negatifs: string[];
    potentiel_developpement: string;
    score_sous_exploitation: number;
    recommandation_commercialisation: string;
    strategie_vente: string;
  };
  onUpdate: () => void;
}

export function EstimationModule({ immeuble, onUpdate }: EstimationModuleProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    estimation_valeur_basse: immeuble.estimation_valeur_basse || '',
    estimation_valeur_haute: immeuble.estimation_valeur_haute || '',
    estimation_valeur_recommandee: immeuble.estimation_valeur_recommandee || '',
    estimation_prix_m2: immeuble.estimation_prix_m2 || '',
    estimation_methode: immeuble.estimation_methode || 'comparaison',
    estimation_notes: immeuble.estimation_notes || '',
    potentiel_developpement: immeuble.potentiel_developpement || '',
    score_sous_exploitation: immeuble.score_sous_exploitation || 0,
    recommandation_commercialisation: immeuble.recommandation_commercialisation || '',
    strategie_vente: immeuble.strategie_vente || '',
  });
  const [facteursPositifs, setFacteursPositifs] = useState<string[]>(
    Array.isArray(immeuble.facteurs_positifs) ? immeuble.facteurs_positifs : []
  );
  const [facteursNegatifs, setFacteursNegatifs] = useState<string[]>(
    Array.isArray(immeuble.facteurs_negatifs) ? immeuble.facteurs_negatifs : []
  );
  const [newFacteurPositif, setNewFacteurPositif] = useState('');
  const [newFacteurNegatif, setNewFacteurNegatif] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('immeubles')
        .update({
          estimation_valeur_basse: formData.estimation_valeur_basse ? Number(formData.estimation_valeur_basse) : null,
          estimation_valeur_haute: formData.estimation_valeur_haute ? Number(formData.estimation_valeur_haute) : null,
          estimation_valeur_recommandee: formData.estimation_valeur_recommandee ? Number(formData.estimation_valeur_recommandee) : null,
          estimation_prix_m2: formData.estimation_prix_m2 ? Number(formData.estimation_prix_m2) : null,
          estimation_methode: formData.estimation_methode,
          estimation_notes: formData.estimation_notes,
          estimation_date: new Date().toISOString().split('T')[0],
          facteurs_positifs: facteursPositifs,
          facteurs_negatifs: facteursNegatifs,
          potentiel_developpement: formData.potentiel_developpement,
          score_sous_exploitation: formData.score_sous_exploitation || null,
          recommandation_commercialisation: formData.recommandation_commercialisation,
          strategie_vente: formData.strategie_vente,
        })
        .eq('id', immeuble.id);

      if (error) throw error;

      toast.success('Estimation enregistrée');
      onUpdate();
    } catch (error) {
      console.error('Error saving estimation:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const addFacteurPositif = () => {
    if (newFacteurPositif.trim()) {
      setFacteursPositifs([...facteursPositifs, newFacteurPositif.trim()]);
      setNewFacteurPositif('');
    }
  };

  const addFacteurNegatif = () => {
    if (newFacteurNegatif.trim()) {
      setFacteursNegatifs([...facteursNegatifs, newFacteurNegatif.trim()]);
      setNewFacteurNegatif('');
    }
  };

  const removeFacteurPositif = (index: number) => {
    setFacteursPositifs(facteursPositifs.filter((_, i) => i !== index));
  };

  const removeFacteurNegatif = (index: number) => {
    setFacteursNegatifs(facteursNegatifs.filter((_, i) => i !== index));
  };

  const formatPrice = (price: number | string | null) => {
    if (!price) return '-';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(num);
  };

  // Calculate gauge position
  const valeurBasse = Number(formData.estimation_valeur_basse) || 0;
  const valeurHaute = Number(formData.estimation_valeur_haute) || 0;
  const valeurRecommandee = Number(formData.estimation_valeur_recommandee) || 0;
  const prixDemande = immeuble.prix_vente_demande || 0;
  
  const gaugeMin = valeurBasse * 0.9;
  const gaugeMax = valeurHaute * 1.1;
  const gaugeRange = gaugeMax - gaugeMin;
  
  const recommandeePosition = gaugeRange > 0 ? ((valeurRecommandee - gaugeMin) / gaugeRange) * 100 : 50;
  const prixDemandePosition = gaugeRange > 0 ? ((prixDemande - gaugeMin) / gaugeRange) * 100 : 50;

  return (
    <div className="space-y-6">
      {/* Résumé estimation visuel */}
      {(valeurBasse > 0 || valeurHaute > 0) && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Estimation du bien
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Jauge visuelle */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fourchette d'estimation</span>
                <span className="font-medium">{formatPrice(valeurBasse)} - {formatPrice(valeurHaute)}</span>
              </div>
              <div className="relative h-8 bg-gradient-to-r from-orange-200 via-green-200 to-orange-200 rounded-full overflow-hidden">
                {/* Valeur recommandée marker */}
                {valeurRecommandee > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-green-600 z-10"
                    style={{ left: `${Math.min(Math.max(recommandeePosition, 5), 95)}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-green-700">
                      Recommandé
                    </div>
                  </div>
                )}
                {/* Prix demandé marker */}
                {prixDemande > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-primary z-10"
                    style={{ left: `${Math.min(Math.max(prixDemandePosition, 5), 95)}%` }}
                  >
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-primary">
                      Prix demandé
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-4">
                <span>{formatPrice(valeurBasse)}</span>
                <span className="text-green-600 font-medium">{formatPrice(valeurRecommandee)}</span>
                <span>{formatPrice(valeurHaute)}</span>
              </div>
            </div>

            {/* Prix au m² */}
            {formData.estimation_prix_m2 && immeuble.surface_totale && (
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <span className="text-sm text-muted-foreground">Prix au m²</span>
                <span className="text-lg font-semibold">{formatPrice(formData.estimation_prix_m2)}/m²</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Valeurs d'estimation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Valeurs d'estimation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valeur basse (CHF)</Label>
                <Input
                  type="number"
                  value={formData.estimation_valeur_basse}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimation_valeur_basse: e.target.value }))}
                  placeholder="800'000"
                />
              </div>
              <div className="space-y-2">
                <Label>Valeur haute (CHF)</Label>
                <Input
                  type="number"
                  value={formData.estimation_valeur_haute}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimation_valeur_haute: e.target.value }))}
                  placeholder="1'200'000"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Valeur recommandée (CHF)</Label>
              <Input
                type="number"
                value={formData.estimation_valeur_recommandee}
                onChange={(e) => setFormData(prev => ({ ...prev, estimation_valeur_recommandee: e.target.value }))}
                placeholder="1'000'000"
              />
            </div>

            <div className="space-y-2">
              <Label>Prix au m² (CHF)</Label>
              <Input
                type="number"
                value={formData.estimation_prix_m2}
                onChange={(e) => setFormData(prev => ({ ...prev, estimation_prix_m2: e.target.value }))}
                placeholder="8'500"
              />
            </div>

            <div className="space-y-2">
              <Label>Méthode d'estimation</Label>
              <Select 
                value={formData.estimation_methode} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, estimation_methode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comparaison">Méthode par comparaison</SelectItem>
                  <SelectItem value="hedoniste">Méthode hédoniste</SelectItem>
                  <SelectItem value="capitalisation">Méthode par capitalisation</SelectItem>
                  <SelectItem value="mixte">Méthode mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Potentiel et développement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Potentiel de développement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Score de sous-exploitation (0-100)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.score_sous_exploitation}
                onChange={(e) => setFormData(prev => ({ ...prev, score_sous_exploitation: parseInt(e.target.value) || 0 }))}
              />
              <Progress value={formData.score_sous_exploitation} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {formData.score_sous_exploitation < 30 && "Faible potentiel de développement"}
                {formData.score_sous_exploitation >= 30 && formData.score_sous_exploitation < 70 && "Potentiel modéré"}
                {formData.score_sous_exploitation >= 70 && "Fort potentiel de développement"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description du potentiel</Label>
              <Textarea
                value={formData.potentiel_developpement}
                onChange={(e) => setFormData(prev => ({ ...prev, potentiel_developpement: e.target.value }))}
                placeholder="Ex: Possibilité d'extension, combles aménageables..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Facteurs positifs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Facteurs positifs ({facteursPositifs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newFacteurPositif}
                onChange={(e) => setNewFacteurPositif(e.target.value)}
                placeholder="Ajouter un atout..."
                onKeyPress={(e) => e.key === 'Enter' && addFacteurPositif()}
              />
              <Button onClick={addFacteurPositif} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {facteursPositifs.map((facteur, index) => (
                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                  {facteur}
                  <button onClick={() => removeFacteurPositif(index)} className="ml-1.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Facteurs négatifs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Points à améliorer ({facteursNegatifs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newFacteurNegatif}
                onChange={(e) => setNewFacteurNegatif(e.target.value)}
                placeholder="Ajouter un point..."
                onKeyPress={(e) => e.key === 'Enter' && addFacteurNegatif()}
              />
              <Button onClick={addFacteurNegatif} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {facteursNegatifs.map((facteur, index) => (
                <Badge key={index} variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                  {facteur}
                  <button onClick={() => removeFacteurNegatif(index)} className="ml-1.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommandation commercialisation */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recommandation de commercialisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recommandation</Label>
                <Textarea
                  value={formData.recommandation_commercialisation}
                  onChange={(e) => setFormData(prev => ({ ...prev, recommandation_commercialisation: e.target.value }))}
                  placeholder="Prix de mise en vente conseillé, positionnement marché..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Stratégie de vente</Label>
                <Textarea
                  value={formData.strategie_vente}
                  onChange={(e) => setFormData(prev => ({ ...prev, strategie_vente: e.target.value }))}
                  placeholder="Approche marketing, cible acheteurs, timing..."
                  rows={4}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notes d'estimation</Label>
              <Textarea
                value={formData.estimation_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, estimation_notes: e.target.value }))}
                placeholder="Notes complémentaires..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Enregistrer l'estimation
        </Button>
      </div>
    </div>
  );
}
