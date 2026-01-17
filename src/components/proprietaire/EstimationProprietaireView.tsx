import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, CheckCircle2, Clock, 
  AlertCircle, RefreshCw, ThumbsUp, MessageSquare 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EstimationProprietaireViewProps {
  immeubleId: string;
  prixEstimeBas?: number | null;
  prixEstimeHaut?: number | null;
  prixRecommande?: number | null;
  prixM2Secteur?: number | null;
  surfaceHabitable?: number | null;
  statutEstimation: string;
  commentaireRevision?: string | null;
  dateValidation?: string | null;
  facteursPositifs?: string[];
  facteursNegatifs?: string[];
  potentielDeveloppement?: string | null;
  prixVendeur?: number | null;
  prixCommercial?: number | null;
  onUpdate: () => void;
}

const STATUT_CONFIG = {
  en_attente: { label: "En attente d'estimation", color: 'bg-muted text-muted-foreground', icon: Clock },
  proposee: { label: 'Estimation proposée', color: 'bg-amber-500/10 text-amber-600', icon: AlertCircle },
  validee: { label: 'Estimation validée', color: 'bg-green-500/10 text-green-600', icon: CheckCircle2 },
  revision_demandee: { label: 'Révision demandée', color: 'bg-blue-500/10 text-blue-600', icon: RefreshCw },
};

export function EstimationProprietaireView({
  immeubleId,
  prixEstimeBas,
  prixEstimeHaut,
  prixRecommande,
  prixM2Secteur,
  surfaceHabitable,
  statutEstimation,
  commentaireRevision,
  dateValidation,
  facteursPositifs = [],
  facteursNegatifs = [],
  potentielDeveloppement,
  prixVendeur,
  prixCommercial,
  onUpdate,
}: EstimationProprietaireViewProps) {
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionComment, setRevisionComment] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(value);
  };

  const config = STATUT_CONFIG[statutEstimation as keyof typeof STATUT_CONFIG] || STATUT_CONFIG.en_attente;
  const StatusIcon = config.icon;

  const handleValidate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('immeubles')
        .update({ statut_vente: 'pret' } as any)
        .eq('id', immeubleId);

      if (error) throw error;
      toast.success('Estimation validée avec succès');
      onUpdate();
    } catch (error) {
      console.error('Error validating estimation:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionComment.trim()) {
      toast.error('Veuillez expliquer votre demande de révision');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('immeubles')
        .update({ 
          notes_commerciales: `Révision demandée: ${revisionComment}`
        } as any)
        .eq('id', immeubleId);

      if (error) throw error;
      toast.success('Demande de révision envoyée');
      setShowRevisionForm(false);
      setRevisionComment('');
      onUpdate();
    } catch (error) {
      console.error('Error requesting revision:', error);
      toast.error('Erreur lors de la demande');
    } finally {
      setLoading(false);
    }
  };

  const hasEstimation = prixEstimeBas || prixEstimeHaut || prixRecommande;

  if (!hasEstimation && statutEstimation === 'en_attente') {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Estimation en cours de préparation</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Votre agent prépare une estimation détaillée de votre bien. 
            Vous serez notifié dès qu'elle sera disponible.
          </p>
        </CardContent>
      </Card>
    );
  }

  const prixMoyen = prixEstimeBas && prixEstimeHaut ? (prixEstimeBas + prixEstimeHaut) / 2 : prixRecommande;
  const prixM2Bien = prixMoyen && surfaceHabitable ? prixMoyen / surfaceHabitable : null;

  return (
    <div className="space-y-6">
      {/* Statut actuel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-5 w-5" />
              <CardTitle>Statut de l'estimation</CardTitle>
            </div>
            <Badge className={config.color}>
              {config.label}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Estimation principale */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="text-xl">Estimation de votre bien</CardTitle>
          <CardDescription>
            Basée sur l'analyse du marché local et les caractéristiques de votre propriété
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Jauge de prix */}
            <div className="relative py-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Estimation basse</span>
                <span className="font-semibold text-primary">Prix recommandé</span>
                <span className="text-muted-foreground">Estimation haute</span>
              </div>
              
              <div className="relative h-4 bg-gradient-to-r from-amber-200 via-emerald-300 to-amber-200 rounded-full">
                {prixRecommande && prixEstimeBas && prixEstimeHaut && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-primary rounded-full border-4 border-background shadow-lg"
                    style={{
                      left: `${((prixRecommande - prixEstimeBas) / (prixEstimeHaut - prixEstimeBas)) * 100}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                )}
              </div>
              
              <div className="flex justify-between mt-2">
                <span className="text-lg font-bold">{formatCurrency(prixEstimeBas)}</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(prixRecommande)}</span>
                <span className="text-lg font-bold">{formatCurrency(prixEstimeHaut)}</span>
              </div>
            </div>

            {/* Prix au m² */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Prix au m² de votre bien</p>
                <p className="text-2xl font-bold">{formatCurrency(prixM2Bien)}/m²</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Moyenne du secteur</p>
                <p className="text-2xl font-bold">{formatCurrency(prixM2Secteur)}/m²</p>
              </div>
            </div>

            {/* Prix vendeur / commercial */}
            {(prixVendeur || prixCommercial) && (
              <div className="mt-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
                <h4 className="font-semibold mb-3 text-sm">Stratégie de prix définie</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Votre prix net souhaité</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(prixVendeur)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ce montant reste confidentiel</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Prix affiché aux acheteurs</p>
                    <p className="text-xl font-bold">{formatCurrency(prixCommercial)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Prix commercial public</p>
                  </div>
                  {prixVendeur && prixCommercial && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-xs text-emerald-700 mb-1">Honoraires agence</p>
                      <p className="text-xl font-bold text-emerald-700">
                        {formatCurrency(prixCommercial - prixVendeur)}
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        Inclus dans le prix commercial
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Facteurs d'évaluation */}
      {(facteursPositifs.length > 0 || facteursNegatifs.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {facteursPositifs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                  Facteurs positifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {facteursPositifs.map((facteur, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      {facteur}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {facteursNegatifs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                  <TrendingDown className="h-4 w-4" />
                  Points d'attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {facteursNegatifs.map((facteur, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      {facteur}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Potentiel de développement */}
      {potentielDeveloppement && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Potentiel de développement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{potentielDeveloppement}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions de validation */}
      {statutEstimation === 'proposee' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Validez cette estimation pour passer à l'étape suivante, ou demandez une révision si vous avez des remarques.
              </p>
              
              {showRevisionForm ? (
                <div className="space-y-4">
                  <Textarea
                    value={revisionComment}
                    onChange={(e) => setRevisionComment(e.target.value)}
                    placeholder="Expliquez les raisons de votre demande de révision..."
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleRequestRevision} 
                      disabled={loading}
                      variant="outline"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Envoyer la demande
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowRevisionForm(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button onClick={handleValidate} disabled={loading} className="flex-1">
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Valider cette estimation
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowRevisionForm(true)}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Demander une révision
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message de révision en attente */}
      {statutEstimation === 'revision_demandee' && commentaireRevision && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <MessageSquare className="h-4 w-4" />
              Votre demande de révision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{commentaireRevision}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Votre agent examine votre demande et vous proposera une nouvelle estimation.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation de validation */}
      {statutEstimation === 'validee' && dateValidation && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold text-green-700">Estimation validée</p>
                <p className="text-sm text-muted-foreground">
                  Vous avez validé cette estimation le {new Date(dateValidation).toLocaleDateString('fr-CH')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
