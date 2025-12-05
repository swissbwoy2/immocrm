import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Mail, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RecommendationStatsData {
  totalCandidatures: number;
  avisGoogleEnvoyes: number;
  recommandationsEnvoyees: number;
  tauxAvisGoogle: number;
  tauxRecommandation: number;
}

export const RecommendationStats = () => {
  const [stats, setStats] = useState<RecommendationStatsData>({
    totalCandidatures: 0,
    avisGoogleEnvoyes: 0,
    recommandationsEnvoyees: 0,
    tauxAvisGoogle: 0,
    tauxRecommandation: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get candidatures with cles_remises (finished workflow)
      const { data: candidatures } = await supabase
        .from('candidatures')
        .select('id, avis_google_envoye, recommandation_envoyee, cles_remises')
        .eq('cles_remises', true);

      if (candidatures) {
        const total = candidatures.length;
        const avisGoogle = candidatures.filter(c => c.avis_google_envoye).length;
        const recommandations = candidatures.filter(c => c.recommandation_envoyee).length;

        setStats({
          totalCandidatures: total,
          avisGoogleEnvoyes: avisGoogle,
          recommandationsEnvoyees: recommandations,
          tauxAvisGoogle: total > 0 ? Math.round((avisGoogle / total) * 100) : 0,
          tauxRecommandation: total > 0 ? Math.round((recommandations / total) * 100) : 0,
        });
      }
    } catch (error) {
      console.error('Error loading recommendation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Chargement des statistiques...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Statistiques de recommandation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{stats.totalCandidatures}</p>
            <p className="text-sm text-muted-foreground">Baux conclus</p>
          </div>
          
          <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg text-center">
            <Star className="h-6 w-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {stats.avisGoogleEnvoyes}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400">Avis Google</p>
            <p className="text-xs text-muted-foreground mt-1">
              ({stats.tauxAvisGoogle}% des clients)
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg text-center">
            <Mail className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {stats.recommandationsEnvoyees}
            </p>
            <p className="text-sm text-purple-600 dark:text-purple-400">Recommandations</p>
            <p className="text-xs text-muted-foreground mt-1">
              ({stats.tauxRecommandation}% des clients)
            </p>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {stats.tauxAvisGoogle + stats.tauxRecommandation > 0 
                ? Math.round((stats.tauxAvisGoogle + stats.tauxRecommandation) / 2) 
                : 0}%
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">Engagement moyen</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
