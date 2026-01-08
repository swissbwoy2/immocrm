import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, TrendingUp, TrendingDown, Clock, Save, Loader2, MapPin
} from 'lucide-react';

interface MarketAnalysisModuleProps {
  immeuble: {
    id: string;
    ville: string;
    canton: string;
    surface_totale: number;
    type_bien: string;
    prix_vente_demande: number;
    estimation_prix_m2: number;
    prix_m2_secteur: number;
    duree_publication_moyenne: number;
    tendance_marche: string;
  };
  onUpdate: () => void;
}

export function MarketAnalysisModule({ immeuble, onUpdate }: MarketAnalysisModuleProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    prix_m2_secteur: immeuble.prix_m2_secteur || '',
    duree_publication_moyenne: immeuble.duree_publication_moyenne || '',
    tendance_marche: immeuble.tendance_marche || 'stable',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('immeubles')
        .update({
          prix_m2_secteur: formData.prix_m2_secteur ? Number(formData.prix_m2_secteur) : null,
          duree_publication_moyenne: formData.duree_publication_moyenne ? Number(formData.duree_publication_moyenne) : null,
          tendance_marche: formData.tendance_marche,
        })
        .eq('id', immeuble.id);

      if (error) throw error;

      toast.success('Données marché enregistrées');
      onUpdate();
    } catch (error) {
      console.error('Error saving market data:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: number | string | null) => {
    if (!price) return '-';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(num);
  };

  // Calculate comparison with sector price
  const prixM2Bien = immeuble.estimation_prix_m2 || (immeuble.prix_vente_demande && immeuble.surface_totale ? immeuble.prix_vente_demande / immeuble.surface_totale : 0);
  const prixM2Secteur = Number(formData.prix_m2_secteur) || 0;
  const differencePercent = prixM2Secteur > 0 ? ((prixM2Bien - prixM2Secteur) / prixM2Secteur) * 100 : 0;

  const getTendanceIcon = () => {
    switch (formData.tendance_marche) {
      case 'hausse':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'baisse':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <BarChart3 className="h-5 w-5 text-blue-600" />;
    }
  };

  const getTendanceLabel = () => {
    switch (formData.tendance_marche) {
      case 'hausse':
        return { label: 'Marché en hausse', color: 'bg-green-100 text-green-800' };
      case 'baisse':
        return { label: 'Marché en baisse', color: 'bg-red-100 text-red-800' };
      default:
        return { label: 'Marché stable', color: 'bg-blue-100 text-blue-800' };
    }
  };

  const tendance = getTendanceLabel();

  return (
    <div className="space-y-6">
      {/* Résumé marché */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prix/m² secteur</p>
                <p className="text-2xl font-bold">{formatPrice(formData.prix_m2_secteur)}</p>
              </div>
              <MapPin className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Durée moyenne</p>
                <p className="text-2xl font-bold">{formData.duree_publication_moyenne || '-'} jours</p>
              </div>
              <Clock className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tendance</p>
                <Badge className={tendance.color}>{tendance.label}</Badge>
              </div>
              {getTendanceIcon()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparaison avec le marché */}
      {prixM2Bien > 0 && prixM2Secteur > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Positionnement marché
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prix/m² du bien</span>
                <span className="font-medium">{formatPrice(prixM2Bien)}/m²</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prix/m² secteur</span>
                <span className="font-medium">{formatPrice(prixM2Secteur)}/m²</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm font-medium">Écart avec le marché</span>
                <Badge variant={differencePercent > 10 ? 'destructive' : differencePercent < -10 ? 'default' : 'secondary'}>
                  {differencePercent > 0 ? '+' : ''}{differencePercent.toFixed(1)}%
                </Badge>
              </div>
              {differencePercent > 10 && (
                <p className="text-sm text-orange-600">
                  ⚠️ Le prix demandé est significativement supérieur au marché. Cela pourrait allonger le délai de vente.
                </p>
              )}
              {differencePercent < -10 && (
                <p className="text-sm text-green-600">
                  ✓ Le prix demandé est inférieur au marché. Le bien devrait trouver acquéreur rapidement.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire données marché */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Données du marché local
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Renseignez les données du marché pour {immeuble.ville}, {immeuble.canton}
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prix moyen au m² (CHF)</Label>
              <Input
                type="number"
                value={formData.prix_m2_secteur}
                onChange={(e) => setFormData(prev => ({ ...prev, prix_m2_secteur: e.target.value }))}
                placeholder="8'500"
              />
            </div>

            <div className="space-y-2">
              <Label>Durée publication moyenne (jours)</Label>
              <Input
                type="number"
                value={formData.duree_publication_moyenne}
                onChange={(e) => setFormData(prev => ({ ...prev, duree_publication_moyenne: e.target.value }))}
                placeholder="90"
              />
            </div>

            <div className="space-y-2">
              <Label>Tendance du marché</Label>
              <Select 
                value={formData.tendance_marche} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, tendance_marche: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hausse">En hausse</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="baisse">En baisse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infos localisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Ville:</span> <span className="font-medium">{immeuble.ville}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Canton:</span> <span className="font-medium">{immeuble.canton}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type de bien:</span> <span className="font-medium">{immeuble.type_bien}</span></div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Surface:</span> <span className="font-medium">{immeuble.surface_totale} m²</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Prix demandé:</span> <span className="font-medium">{formatPrice(immeuble.prix_vente_demande)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Enregistrer les données marché
        </Button>
      </div>
    </div>
  );
}
