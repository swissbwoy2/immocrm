import { useState } from "react";
import { CheckCircle, X, Shield, Search, Users, Filter, Calendar, FileText, MessageSquare, Brain, Eye, Sparkles, ArrowRight, Crown, ChevronDown, ChevronUp, Home, Handshake, Landmark, PiggyBank, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSearchType } from "@/contexts/SearchTypeContext";

// Short comparison data - LOCATION (4 key points)
const shortComparisonDataLocation = [{
  aspect: "Tu visites moins, mais mieux",
  logisorama: "On identifie les opportunités réalistes selon ton profil. Chaque proposition est ciblée.",
  solo: "Tu postules sans savoir si tu as une chance.",
  icon: Filter
}, {
  aspect: "Ton dossier passe devant",
  logisorama: "Ton dossier est recommandé directement à nos contacts régies.",
  solo: "Ta candidature arrive anonyme parmi des dizaines.",
  icon: Users
}, {
  aspect: "Tu sais où tu en es",
  logisorama: "Conseiller dédié et reporting régulier chaque semaine.",
  solo: "Tu envoies et tu attends... souvent sans retour.",
  icon: Eye
}, {
  aspect: "Zéro risque",
  logisorama: "Pas de bail en 90 jours ? Remboursement intégral.",
  solo: "Tout le risque repose sur toi.",
  icon: Shield
}];

// Full comparison data for expanded view - LOCATION
const fullComparisonDataLocation = [{
  aspect: "Accès aux biens",
  logisorama: "Profite de notre Réseau Privilégié : régies partenaires + proprios privés.",
  solo: "Tu vois que les annonces publiques, déjà consultées par des centaines.",
  icon: Search
}, {
  aspect: "Coordination des visites",
  logisorama: "On organise tout : créneaux optimisés, préparation du dossier.",
  solo: "Tu contactes chaque régie séparément, souvent trop tard.",
  icon: Calendar
}, {
  aspect: "Dossier professionnel",
  logisorama: "Un dossier complet, aligné avec les standards des régies.",
  solo: "Tu improvises sans connaître les attentes des décideurs.",
  icon: FileText
}, {
  aspect: "Suivi personnalisé",
  logisorama: "On relance les régies pour obtenir des réponses rapides.",
  solo: "Tu envoies et tu attends... souvent sans aucun retour.",
  icon: MessageSquare
}, {
  aspect: "Efficacité & sérénité",
  logisorama: "Tu délègues à une équipe expérimentée. Toi, tu respires.",
  solo: "Tu gères seul la recherche et le stress. Épuisant.",
  icon: Brain
}];

// Short comparison data - ACHAT (4 key points)
const shortComparisonDataAchat = [{
  aspect: "Accès off-market",
  logisorama: "Biens exclusifs avant publication, réseau de vendeurs privés.",
  solo: "Que les annonces publiques, déjà vues par tout le monde.",
  icon: Key
}, {
  aspect: "Négociation experte",
  logisorama: "On négocie le prix pour toi avec notre expertise du marché.",
  solo: "Tu fais face seul aux vendeurs, sans savoir les prix réels.",
  icon: Handshake
}, {
  aspect: "Financement optimisé",
  logisorama: "Partenaires bancaires pour les meilleurs taux hypothécaires.",
  solo: "Tu démarches seul les banques, sans pouvoir de négociation.",
  icon: Landmark
}, {
  aspect: "Zéro commission acheteur",
  logisorama: "Le vendeur finance notre service. Tu ne paies rien.",
  solo: "Tu paies 3-5% de commission à l'agence.",
  icon: PiggyBank
}];

// Full comparison data for expanded view - ACHAT
const fullComparisonDataAchat = [{
  aspect: "Évaluation du bien",
  logisorama: "Analyse complète : état, charges, potentiel, risques cachés.",
  solo: "Tu te fies à la description du vendeur, souvent incomplète.",
  icon: Search
}, {
  aspect: "Accompagnement notarial",
  logisorama: "On t'accompagne jusqu'à la signature chez le notaire.",
  solo: "Tu découvres les documents le jour de la signature.",
  icon: FileText
}, {
  aspect: "Coordination des visites",
  logisorama: "Visites organisées selon tes disponibilités, avec briefing.",
  solo: "Tu t'adaptes aux horaires des vendeurs, sans préparation.",
  icon: Calendar
}, {
  aspect: "Suivi personnalisé",
  logisorama: "Un conseiller dédié qui connaît ton projet en détail.",
  solo: "Tu gères seul avec des interlocuteurs différents à chaque fois.",
  icon: Users
}, {
  aspect: "Sérénité totale",
  logisorama: "De la recherche à la remise des clés, on gère tout.",
  solo: "Stress, paperasse, délais... tout repose sur toi.",
  icon: Home
}];

export function DifferentiationSection() {
  const [showMore, setShowMore] = useState(false);
  const { isAchat } = useSearchType();
  
  // Select data based on search type
  const shortData = isAchat ? shortComparisonDataAchat : shortComparisonDataLocation;
  const fullData = isAchat ? fullComparisonDataAchat : fullComparisonDataLocation;
  const displayData = showMore ? [...shortData, ...fullData] : shortData;
  
  // Dynamic content
  const content = {
    subtitle: isAchat 
      ? "Nous travaillons POUR toi, en collaboration avec les vendeurs et notaires."
      : "Nous travaillons POUR toi, en collaboration avec les régies et les propriétaires.",
    cta: isAchat ? "Trouver mon bien !" : "Je me lance !",
    ctaLink: isAchat ? "#quickform" : "/nouveau-mandat",
    guarantee: isAchat 
      ? "Accompagnement jusqu'au notaire • 0% commission acheteur"
      : "90 jours pour trouver • Remboursement intégral si échec",
  };
  
  return <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Premium animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[100px] animate-pulse" style={{
      animationDelay: "1s"
    }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/10 rounded-full blur-[150px]" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Radial gradient spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12 md:mb-16 animate-fade-in">
          {/* Premium badge */}
          <div className="inline-flex items-center gap-2 relative group mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-blue-500/50 to-violet-500/50 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative backdrop-blur-xl rounded-full px-6 py-3 border border-white/20 bg-white/5 shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Crown className="h-5 w-5 text-amber-400" />
                  <div className="absolute inset-0 bg-amber-400/50 blur-md" />
                </div>
                <span className="text-sm font-bold bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent uppercase tracking-wider">
                  Accès Privilégié
                </span>
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
              </div>
            </div>
          </div>

          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight tracking-tight">
            Pas une agence comme les autres
            <span className="bg-gradient-to-r from-primary via-blue-400 to-violet-400 bg-clip-text text-transparent"> 💼</span>
          </h2>

          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {content.subtitle.split('POUR toi')[0]}
            <strong className="text-white">POUR toi</strong>
            {content.subtitle.split('POUR toi')[1]}
          </p>
        </div>

        {/* Comparison table */}
        <div className="max-w-5xl mx-auto">
          {/* Desktop table */}
          <div className="hidden md:block">
            {/* Headers */}
            <div className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-6 mb-6">
              <div className="p-4" />

              {/* Immo-rama header - Premium style */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-blue-500 to-violet-500 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative backdrop-blur-xl rounded-2xl p-5 bg-gradient-to-br from-primary/20 via-blue-500/10 to-violet-500/10 border border-white/20 shadow-2xl">
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                      <Crown className="h-5 w-5 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-black text-white">Avec Immo-rama.ch</h3>
                  </div>
                </div>
              </div>

              {/* Solo header - Muted style */}
              <div className="relative backdrop-blur-xl rounded-2xl p-5 bg-white/5 border border-white/10">
                <div className="flex items-center justify-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5">
                    <X className="h-5 w-5 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-400">Recherche solo</h3>
                </div>
              </div>
            </div>

            {/* Comparison rows */}
            <div className="space-y-3">
              {displayData.map((row, index) => <div key={index} className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-6 animate-fade-in group" style={{
              animationDelay: `${index * 50}ms`
            }}>
                  {/* Aspect label */}
                  <div className="flex items-center gap-3 p-3">
                    <div className="relative">
                      <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/10 border border-white/10 backdrop-blur-sm group-hover:border-primary/30 transition-all">
                        <row.icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <span className="font-bold text-white group-hover:text-primary transition-colors text-sm">
                      {row.aspect}
                    </span>
                  </div>

                  {/* Logisorama value */}
                  <div className="relative group/card">
                    <div className="relative h-full backdrop-blur-xl rounded-xl p-4 bg-gradient-to-br from-primary/10 to-blue-500/5 border border-primary/20 group-hover/card:border-primary/40 transition-all">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 p-1 rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
                          <CheckCircle className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-sm text-slate-200 leading-relaxed">{row.logisorama}</span>
                      </div>
                    </div>
                  </div>

                  {/* Solo value */}
                  <div className="relative backdrop-blur-xl rounded-xl p-4 bg-white/[0.02] border border-white/5">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 p-1 rounded-full bg-red-500/20 border border-red-500/30">
                        <X className="h-3.5 w-3.5 text-red-400" />
                      </div>
                      <span className="text-sm text-slate-500 leading-relaxed">{row.solo}</span>
                    </div>
                  </div>
                </div>)}
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {displayData.map((row, index) => <div key={index} className="relative animate-fade-in group" style={{
            animationDelay: `${index * 50}ms`
          }}>
                <Card className="relative backdrop-blur-xl bg-slate-900/90 border-white/10 overflow-hidden">
                  <CardHeader className="pb-2 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/10 border border-white/10">
                        <row.icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-base text-white">{row.aspect}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-3">
                    {/* Premium option */}
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-gradient-to-br from-primary/15 to-blue-500/10 border border-primary/30">
                      <div className="flex-shrink-0 p-1 rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
                        <CheckCircle className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="text-sm text-slate-200">{row.logisorama}</p>
                    </div>

                    {/* Solo option */}
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex-shrink-0 p-1 rounded-full bg-red-500/20 border border-red-500/30">
                        <X className="h-3.5 w-3.5 text-red-400" />
                      </div>
                      <p className="text-sm text-slate-500">{row.solo}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>)}
          </div>
          
          {/* Toggle button */}
          <div className="flex justify-center mt-8">
            <Button
              variant="ghost"
              onClick={() => setShowMore(!showMore)}
              className="text-slate-300 hover:text-white hover:bg-white/10 gap-2"
            >
              {showMore ? (
                <>
                  Voir moins
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Voir le comparatif complet
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Premium CTA section */}
        <div className="mt-12 sm:mt-20 md:mt-24 text-center animate-fade-in px-2 sm:px-0" style={{
        animationDelay: "700ms"
      }}>
          <div className="relative group w-full max-w-3xl mx-auto">
            {/* Animated glow */}
            <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-primary via-blue-500 to-violet-500 rounded-2xl sm:rounded-3xl blur-xl sm:blur-2xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse" />

            <div className="relative backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-2xl overflow-hidden">
              {/* Inner gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/10" />

              {/* Sparkle decorations */}
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400/60 animate-pulse" />
              </div>
              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary/60 animate-pulse" style={{
                animationDelay: "0.5s"
              }} />
              </div>

              <div className="relative">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4">
                  La différence est claire 🎯
                </h3>
                <p className="text-sm sm:text-base md:text-lg text-slate-300 mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed">
                  Avec Immo-rama.ch, l'immobilier devient accessible et une équipe expérimentée défend tes intérêts.
                </p>

                {isAchat ? (
                  <a href={content.ctaLink}>
                    <Button size="lg" className="relative group/btn font-bold text-sm sm:text-base md:text-lg px-6 sm:px-10 py-5 sm:py-7 bg-gradient-to-r from-primary via-blue-500 to-violet-500 hover:from-primary/90 hover:via-blue-500/90 hover:to-violet-500/90 border-0 shadow-2xl shadow-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-primary/50 w-full sm:w-auto">
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {content.cta} 🏠
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover/btn:translate-x-1 transition-transform" />
                      </span>
                    </Button>
                  </a>
                ) : (
                  <Link to={content.ctaLink}>
                    <Button size="lg" className="relative group/btn font-bold text-sm sm:text-base md:text-lg px-6 sm:px-10 py-5 sm:py-7 bg-gradient-to-r from-primary via-blue-500 to-violet-500 hover:from-primary/90 hover:via-blue-500/90 hover:to-violet-500/90 border-0 shadow-2xl shadow-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-primary/50 w-full sm:w-auto">
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {content.cta} 🚀
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover/btn:translate-x-1 transition-transform" />
                      </span>
                    </Button>
                  </Link>
                )}

                <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-slate-400">
                  {content.guarantee}
                </p>
              </div>
            </div>
          </div>

          {/* Credibility note */}
          <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-slate-500 px-4">
            * Plus de 500 mandats confiés avec succès en Suisse romande depuis 2016
          </p>
        </div>
      </div>
    </section>;
}
