import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, RefreshCw, Check, X, Send, User, MapPin, Home, Banknote, ArrowRight, Mail, Clock, Filter, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
  const [stats, setStats] = useState({ pending: 0, accepted: 0, converted: 0 });
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
      
      // Calculate stats
      const pending = response.data.matches?.filter((m: AIMatch) => m.status === 'pending').length || 0;
      const accepted = response.data.matches?.filter((m: AIMatch) => m.status === 'accepted').length || 0;
      const converted = response.data.matches?.filter((m: AIMatch) => m.status === 'converted').length || 0;
      setStats({ pending, accepted, converted });
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
      toast.info('Analyse des emails en cours...', { duration: 10000 });

      const response = await supabase.functions.invoke('ai-matching', {
        body: { action: 'analyze', limit: 20 },
      });

      if (response.error) throw response.error;

      const { analyzed, matches: matchesCount } = response.data;
      
      if (matchesCount > 0) {
        toast.success(`${matchesCount} nouveau(x) match(s) trouvé(s) sur ${analyzed} email(s) analysé(s)`);
      } else if (analyzed > 0) {
        toast.info(`${analyzed} email(s) analysé(s), aucun match trouvé`);
      } else {
        toast.info('Aucun nouvel email à analyser');
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
      
      // Update stats
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
    // Navigate to send offer page with pre-filled data
    const clientName = match.client?.profiles ? 
      `${match.client.profiles.prenom || ''} ${match.client.profiles.nom || ''}`.trim() : 
      'Client';
    
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (score >= 50) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">En attente</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Accepté</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Rejeté</Badge>;
      case 'converted':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Converti en offre</Badge>;
      default:
        return null;
    }
  };

  const filteredMatches = matches.filter(m => {
    if (filter === 'all') return true;
    return m.status === filter;
  }).sort((a, b) => b.match_score - a.match_score);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Matching AI</h1>
          <p className="text-muted-foreground">Analyse intelligente de vos emails pour trouver des biens correspondant aux critères de vos clients</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="w-5 h-5 text-blue-500" /></div>
            <div><p className="text-xs text-muted-foreground">En attente</p><p className="text-2xl font-bold">{stats.pending}</p></div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Check className="w-5 h-5 text-green-500" /></div>
            <div><p className="text-xs text-muted-foreground">Acceptés</p><p className="text-2xl font-bold">{stats.accepted}</p></div>
          </CardContent>
        </Card>
        <Card className="border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><Send className="w-5 h-5 text-purple-500" /></div>
            <div><p className="text-xs text-muted-foreground">Convertis</p><p className="text-2xl font-bold">{stats.converted}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
          <CardContent className="p-4">
            <Button onClick={analyzeEmails} disabled={analyzing} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
              {analyzing ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analyse...</> : <><Sparkles className="w-4 h-4 mr-2" />Analyser les emails</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les matchs</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="accepted">Acceptés</SelectItem>
            <SelectItem value="rejected">Rejetés</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filteredMatches.length} résultat(s)</span>
      </div>

      {/* Matches List */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><div className="flex gap-4"><Skeleton className="h-16 w-16 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-2/3" /></div></div></CardContent></Card>
          ))}
        </div>
      ) : filteredMatches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center">
            <Brain className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun match trouvé</h3>
            <p className="text-muted-foreground text-center mb-4">{filter === 'pending' ? "Cliquez sur 'Analyser les emails' pour trouver des correspondances" : "Aucun match dans cette catégorie"}</p>
            {filter === 'pending' && <Button onClick={analyzeEmails} disabled={analyzing}><Sparkles className="w-4 h-4 mr-2" />Analyser</Button>}
          </CardContent>
        </Card>
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
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      {/* Main row */}
                      <div className="p-4 flex items-center gap-4">
                        {/* Score */}
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-2 ${getScoreColor(match.match_score)}`}>
                          {match.match_score}%
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium truncate">{clientName}</span>
                            {getStatusBadge(match.status)}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{match.email_subject || 'Sans sujet'}</span>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            {match.extracted_location && (
                              <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded">
                                <MapPin className="w-3 h-3" />
                                {match.extracted_location}
                              </span>
                            )}
                            {match.extracted_pieces && (
                              <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded">
                                <Home className="w-3 h-3" />
                                {match.extracted_pieces} pièces
                              </span>
                            )}
                            {match.extracted_price && (
                              <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded">
                                <Banknote className="w-3 h-3" />
                                {match.extracted_price.toLocaleString()} CHF
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {match.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                                onClick={() => updateMatchStatus(match.id, 'rejected')}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                                onClick={() => updateMatchStatus(match.id, 'accepted')}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {(match.status === 'pending' || match.status === 'accepted') && (
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-purple-500 to-indigo-500"
                              onClick={() => createOfferFromMatch(match)}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Créer offre
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
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
                            <div className="p-4 pt-0 border-t border-border mt-2">
                              <div className="grid md:grid-cols-2 gap-4">
                                {/* Extracted Property Info */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium">Bien extrait de l'email</h4>
                                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
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
                                      <p><span className="text-muted-foreground">Régie:</span> {match.extracted_regie}</p>
                                    )}
                                    <p><span className="text-muted-foreground">Source:</span> {match.email_from}</p>
                                  </div>
                                  <Button variant="outline" size="sm" onClick={() => viewEmailContent(match)}>
                                    <Eye className="w-4 h-4 mr-1" />
                                    Voir l'email complet
                                  </Button>
                                </div>

                                {/* Client Criteria */}
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium">Critères du client</h4>
                                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                                    {match.client?.region_recherche && (
                                      <p><span className="text-muted-foreground">Région:</span> {match.client.region_recherche}</p>
                                    )}
                                    {match.client?.pieces && (
                                      <p><span className="text-muted-foreground">Pièces:</span> {match.client.pieces}</p>
                                    )}
                                    {match.client?.budget_max && (
                                      <p><span className="text-muted-foreground">Budget max:</span> {match.client.budget_max.toLocaleString()} CHF</p>
                                    )}
                                    {match.client?.type_bien && (
                                      <p><span className="text-muted-foreground">Type:</span> {match.client.type_bien}</p>
                                    )}
                                    {match.client?.profiles?.email && (
                                      <p><span className="text-muted-foreground">Email:</span> {match.client.profiles.email}</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Match Details */}
                              <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">Détails du score</h4>
                                <div className="flex flex-wrap gap-2">
                                  {match.match_details.price_match && (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                                      ✓ Prix compatible
                                    </Badge>
                                  )}
                                  {match.match_details.pieces_match && (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                                      ✓ Pièces OK
                                    </Badge>
                                  )}
                                  {match.match_details.location_match && (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                                      ✓ Région OK
                                    </Badge>
                                  )}
                                  {match.match_details.type_match && (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                                      ✓ Type OK
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Email Content Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Contenu de l'email</DialogTitle>
            <DialogDescription>{selectedMatch?.email_subject}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingEmail ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm">
                {emailContent}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchingAI;
