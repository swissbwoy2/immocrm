import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, RefreshCw, Check, X, Send, User, MapPin, Home, Banknote, Mail, Clock, Filter, ChevronDown, ChevronUp, Eye, TrendingUp, Zap, AlertCircle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PremiumKPICard } from '@/components/premium/PremiumKPICard';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';

interface AIMatch {
  id: string;
  email_id: string;
  client_id: string;
  agent_id: string | null;
  extracted_price: number | null;
  extracted_pieces: number | null;
  extracted_surface: number | null;
  extracted_location: string | null;
  extracted_type_bien: string | null;
  extracted_address: string | null;
  extracted_disponibilite: string | null;
  extracted_regie: string | null;
  email_subject: string | null;
  email_from: string | null;
  match_score: number;
  match_details: Record<string, any>;
  status: 'pending' | 'accepted' | 'rejected' | 'converted';
  created_at: string;
  client: {
    id: string;
    user_id: string;
    pieces: number | null;
    budget_max: number | null;
    region_recherche: string | null;
    type_bien: string | null;
    profiles: {
      prenom: string | null;
      nom: string | null;
      email: string | null;
    } | null;
  } | null;
}

const MatchingAI = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState({ 
    pending: 0, 
    accepted: 0, 
    converted: 0, 
    unanalyzed: 0,
    alertCount: 0,
    sources: {} as Record<string, number>
  });
  const [selectedMatch, setSelectedMatch] = useState<AIMatch | null>(null);
  const [emailContent, setEmailContent] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('ai-matching', {
        body: { action: 'get_matches' },
      });

      if (response.error) throw response.error;

      setMatches(response.data.matches || []);
      
      const pending = response.data.matches?.filter((m: AIMatch) => m.status === 'pending').length || 0;
      const accepted = response.data.matches?.filter((m: AIMatch) => m.status === 'accepted').length || 0;
      const converted = response.data.matches?.filter((m: AIMatch) => m.status === 'converted').length || 0;
      const unanalyzed = response.data.unanalyzed_count || 0;
      const alertCount = response.data.alert_count || 0;
      const sources = response.data.sources || {};
      
      setStats({ pending, accepted, converted, unanalyzed, alertCount, sources });
    } catch (error) {
      console.error('Error loading matches:', error);
      toast.error('Erreur lors du chargement des matchs');
    } finally {
      setLoading(false);
    }
  };

  const analyzeEmails = async () => {
    try {
      setAnalyzing(true);
      toast.info('Analyse des alertes immobilières en cours...', { duration: 15000 });

      const response = await supabase.functions.invoke('ai-matching', {
        body: { action: 'analyze', limit: 100 },
      });

      if (response.error) throw response.error;

      const { analyzed, matches: matchesCount, total_alerts, sources } = response.data;
      
      const sourcesList = Object.entries(sources || {})
        .map(([name, count]) => `${name}: ${count}`)
        .join(', ');

      if (matchesCount > 0) {
        toast.success(
          `${matchesCount} match(s) trouvé(s) sur ${analyzed} alerte(s) analysée(s)`, 
          { description: sourcesList ? `Sources: ${sourcesList}` : undefined }
        );
      } else if (analyzed > 0) {
        toast.info(`${analyzed} alerte(s) analysée(s), aucun match trouvé`);
      } else if (total_alerts > 0) {
        toast.info(`${total_alerts} alertes détectées, toutes déjà analysées`);
      } else {
        toast.warning('Aucune alerte immobilière détectée dans vos emails récents');
      }

      await loadMatches();
    } catch (error) {
      console.error('Error analyzing emails:', error);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateMatchStatus = async (matchId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('ai_matches')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status } : m));
      toast.success(status === 'accepted' ? 'Match accepté' : 'Match rejeté');
      
      const updatedMatches = matches.map(m => m.id === matchId ? { ...m, status } : m);
      const newPending = updatedMatches.filter(m => m.status === 'pending').length;
      const newAccepted = updatedMatches.filter(m => m.status === 'accepted').length;
      setStats(prev => ({ ...prev, pending: newPending, accepted: newAccepted }));
    } catch (error) {
      console.error('Error updating match:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const createOfferFromMatch = (match: AIMatch) => {
    navigate('/agent/envoyer-offre', {
      state: {
        prefilledData: {
          clientId: match.client_id,
          adresse: match.extracted_address || match.extracted_location || '',
          prix: match.extracted_price || 0,
          pieces: match.extracted_pieces || 0,
          surface: match.extracted_surface || 0,
          type_bien: match.extracted_type_bien || '',
          regie: match.extracted_regie || '',
          disponibilite: match.extracted_disponibilite || '',
        },
        fromMatching: true,
        matchId: match.id,
      }
    });
  };

  const viewEmailContent = async (match: AIMatch) => {
    setSelectedMatch(match);
    setLoadingEmail(true);
    
    try {
      const { data, error } = await supabase
        .from('received_emails')
        .select('body_text, body_html')
        .eq('id', match.email_id)
        .single();

      if (error) throw error;
      setEmailContent(data.body_text || data.body_html || 'Contenu non disponible');
    } catch (error) {
      console.error('Error loading email:', error);
      setEmailContent('Erreur lors du chargement du contenu');
    } finally {
      setLoadingEmail(false);
    }
  };

  const toggleCardExpanded = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getScoreGradient = (score: number) => {
    if (score >= 70) return 'from-emerald-500 to-green-400';
    if (score >= 40) return 'from-amber-500 to-yellow-400';
    return 'from-orange-500 to-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Match parfait';
    if (score >= 40) return 'Match probable';
    return 'À vérifier';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">En attente</Badge>;
      case 'accepted':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Accepté</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejeté</Badge>;
      case 'converted':
        return <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">Converti</Badge>;
      default:
        return null;
    }
  };

  const getSourceBadge = (match: AIMatch) => {
    const source = match.match_details?.source || match.extracted_regie;
    if (!source) return null;
    
    const colorMap: Record<string, string> = {
      'RealAdvisor': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Comparis': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'ImmoScout24': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Homegate': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Immobilier.ch': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    
    return (
      <Badge className={colorMap[source] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}>
        {source}
      </Badge>
    );
  };

  const filteredMatches = matches.filter(m => {
    if (filter === 'all') return true;
    return m.status === filter;
  }).sort((a, b) => b.match_score - a.match_score);

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/20 via-background to-indigo-950/20" />
        <FloatingParticles count={20} />
      </div>

      <div className="space-y-6 p-4 md:p-6">
        {/* Premium Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 md:p-8"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5LjkxIDAgMTctOC4wNTkgMTctMThzLTguMDktMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div 
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="p-3 rounded-xl bg-white/10 backdrop-blur-sm"
              >
                <Brain className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                  Matching AI
                  <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-white/70 text-sm md:text-base">
                  Analyse des alertes RealAdvisor, Comparis, Immoscout...
                </p>
              </div>
            </div>
            
            <Button 
              onClick={analyzeEmails} 
              disabled={analyzing}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
              size="lg"
            >
              {analyzing ? (
                <><RefreshCw className="w-5 h-5 mr-2 animate-spin" />Analyse...</>
              ) : (
                <><Zap className="w-5 h-5 mr-2" />Analyser les alertes</>
              )}
            </Button>
          </div>

          {/* Sources detected */}
          {Object.keys(stats.sources).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-white/50 text-sm">Sources détectées:</span>
              {Object.entries(stats.sources).map(([source, count]) => (
                <Badge key={source} className="bg-white/20 text-white border-white/30">
                  {source}: {count}
                </Badge>
              ))}
            </div>
          )}
        </motion.div>

        {/* Premium KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <PremiumKPICard
              title="En attente"
              value={stats.pending}
              icon={Clock}
              variant="warning"
              delay={0}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <PremiumKPICard
              title="Acceptés"
              value={stats.accepted}
              icon={Check}
              variant="success"
              delay={1}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <PremiumKPICard
              title="Convertis"
              value={stats.converted}
              icon={TrendingUp}
              variant="default"
              delay={2}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <PremiumKPICard
              title="Alertes détectées"
              value={stats.alertCount}
              icon={BarChart3}
              variant={stats.alertCount > 0 ? 'default' : 'danger'}
              subtitle={stats.alertCount === 0 ? 'Aucune alerte' : undefined}
              delay={3}
            />
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-4 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
        >
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-48 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les matchs</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="accepted">Acceptés</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filteredMatches.length} résultat(s)</span>
        </motion.div>

        {/* Matches List */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMatches.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16 flex flex-col items-center rounded-2xl bg-card/30 backdrop-blur-sm border border-dashed border-border/50"
          >
            <div className="p-4 rounded-full bg-violet-500/10 mb-4">
              <Brain className="w-12 h-12 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun match trouvé</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              {stats.alertCount === 0 
                ? "Aucune alerte immobilière détectée (RealAdvisor, Comparis, etc.) dans vos 100 derniers emails" 
                : filter === 'pending'
                  ? "Cliquez sur 'Analyser les alertes' pour trouver des correspondances"
                  : "Aucun match dans cette catégorie"}
            </p>
            {stats.alertCount > 0 && (
              <Button onClick={analyzeEmails} disabled={analyzing} className="bg-gradient-to-r from-violet-600 to-indigo-600">
                <Sparkles className="w-4 h-4 mr-2" />
                Analyser {stats.alertCount} alerte(s)
              </Button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="grid gap-4">
              {filteredMatches.map((match, index) => {
                const isExpanded = expandedCards.has(match.id);
                const clientName = match.client?.profiles 
                  ? `${match.client.profiles.prenom || ''} ${match.client.profiles.nom || ''}`.trim() 
                  : 'Client inconnu';

                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <div className={cn(
                      "overflow-hidden rounded-xl bg-card/50 backdrop-blur-sm border border-border/50",
                      "hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300"
                    )}>
                      {/* Main row */}
                      <div className="p-4 flex items-center gap-4">
                        {/* Score circle */}
                        <div className={cn(
                          "w-16 h-16 rounded-full flex flex-col items-center justify-center",
                          "bg-gradient-to-br shadow-lg",
                          getScoreGradient(match.match_score)
                        )}>
                          <span className="text-xl font-bold text-white">{match.match_score}%</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <User className="w-4 h-4 text-violet-400" />
                            <span className="font-medium truncate">{clientName}</span>
                            {getStatusBadge(match.status)}
                            {getSourceBadge(match)}
                            <Badge variant="outline" className="text-xs">
                              {getScoreLabel(match.match_score)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{match.email_subject || 'Sans sujet'}</span>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm">
                            {match.extracted_location && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="w-3 h-3 text-violet-400" />
                                {match.extracted_location}
                              </span>
                            )}
                            {match.extracted_price && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Banknote className="w-3 h-3 text-emerald-400" />
                                {match.extracted_price.toLocaleString()} CHF
                              </span>
                            )}
                            {match.extracted_pieces && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Home className="w-3 h-3 text-amber-400" />
                                {match.extracted_pieces} pièces
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleCardExpanded(match.id)}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 pt-0 border-t border-border/50 mt-2">
                              <div className="grid md:grid-cols-2 gap-4">
                                {/* Extracted info */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium text-violet-400">Informations extraites</h4>
                                  <div className="text-sm space-y-1">
                                    {match.extracted_address && (
                                      <p><span className="text-muted-foreground">Adresse:</span> {match.extracted_address}</p>
                                    )}
                                    {match.extracted_type_bien && (
                                      <p><span className="text-muted-foreground">Type:</span> {match.extracted_type_bien}</p>
                                    )}
                                    {match.extracted_surface && (
                                      <p><span className="text-muted-foreground">Surface:</span> {match.extracted_surface} m²</p>
                                    )}
                                    {match.extracted_disponibilite && (
                                      <p><span className="text-muted-foreground">Disponibilité:</span> {match.extracted_disponibilite}</p>
                                    )}
                                    {match.extracted_regie && (
                                      <p><span className="text-muted-foreground">Source:</span> {match.extracted_regie}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Client criteria */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium text-emerald-400">Critères client</h4>
                                  <div className="text-sm space-y-1">
                                    {match.client?.region_recherche && (
                                      <p><span className="text-muted-foreground">Région:</span> {match.client.region_recherche}</p>
                                    )}
                                    {match.client?.budget_max && (
                                      <p><span className="text-muted-foreground">Budget max:</span> {match.client.budget_max.toLocaleString()} CHF</p>
                                    )}
                                    {match.client?.pieces && (
                                      <p><span className="text-muted-foreground">Pièces:</span> {match.client.pieces}</p>
                                    )}
                                    {match.client?.type_bien && (
                                      <p><span className="text-muted-foreground">Type:</span> {match.client.type_bien}</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Match details */}
                              {match.match_details && (
                                <div className="mt-4 p-3 rounded-lg bg-background/50">
                                  <h4 className="text-sm font-medium mb-2">Détails du match</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {match.match_details.location_match && (
                                      <Badge className="bg-emerald-500/20 text-emerald-400">
                                        ✓ Localisation
                                      </Badge>
                                    )}
                                    {match.match_details.price_match && (
                                      <Badge className="bg-emerald-500/20 text-emerald-400">
                                        ✓ Prix
                                      </Badge>
                                    )}
                                    {match.match_details.pieces_match && (
                                      <Badge className="bg-emerald-500/20 text-emerald-400">
                                        ✓ Pièces
                                      </Badge>
                                    )}
                                    {match.match_details.type_match && (
                                      <Badge className="bg-emerald-500/20 text-emerald-400">
                                        ✓ Type
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex flex-wrap gap-2 mt-4">
                                {match.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-emerald-600 hover:bg-emerald-700"
                                      onClick={() => updateMatchStatus(match.id, 'accepted')}
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Accepter
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => updateMatchStatus(match.id, 'rejected')}
                                    >
                                      <X className="w-4 h-4 mr-1" />
                                      Rejeter
                                    </Button>
                                  </>
                                )}
                                {(match.status === 'pending' || match.status === 'accepted') && (
                                  <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-violet-600 to-indigo-600"
                                    onClick={() => createOfferFromMatch(match)}
                                  >
                                    <Send className="w-4 h-4 mr-1" />
                                    Créer une offre
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => viewEmailContent(match)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Voir l'email
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Email content dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Contenu de l'email</DialogTitle>
            <DialogDescription>
              {selectedMatch?.email_subject}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {loadingEmail ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm font-mono p-4 bg-muted rounded-lg">
                {emailContent}
              </pre>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchingAI;
