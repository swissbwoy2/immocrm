import { CheckCircle, X, Scale, Shield, Search, Users, Filter, Calendar, FileText, MessageSquare, Brain, Eye, Sparkles, ArrowRight, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const comparisonData = [
  {
    aspect: "Recherche de biens",
    logisorama: "Un agent dédié + nos outils surveillent en continu les annonces et opportunités en Suisse romande.",
    solo: "Tu scrutes les sites un par un, dès que tu as du temps, en espérant ne rien rater.",
    icon: Search,
  },
  {
    aspect: "Accès au réseau",
    logisorama: "On connaît des propriétaires et avons de bonnes relations avec de nombreuses régies, ce qui peut ouvrir des portes et crédibiliser ton dossier.",
    solo: "Tu arrives comme un dossier parmi des dizaines d'autres, sans relation préalable ni quelqu'un pour te présenter.",
    icon: Users,
  },
  {
    aspect: "Tri et sélection",
    logisorama: "On filtre les annonces pour ne garder que celles réalistes pour ton budget, ton profil et tes délais.",
    solo: "Tu candidatures à tout ce qui 'semble possible', sans savoir si ton dossier a vraiment une chance.",
    icon: Filter,
  },
  {
    aspect: "Organisation des visites",
    logisorama: "On demande les visites, on regroupe les créneaux et on sait comment parler aux régies pour optimiser tes chances.",
    solo: "Tu contactes chaque régie séparément, souvent trop tard, et tu dois te débrouiller seul pour obtenir un créneau.",
    icon: Calendar,
  },
  {
    aspect: "Dossier locatif",
    logisorama: "On t'aide à constituer un dossier complet et pro, aligné avec les attentes des régies et des propriétaires de la région.",
    solo: "Tu improvises ton dossier, tu ne sais pas toujours ce qui manque ou ce qui pose problème.",
    icon: FileText,
  },
  {
    aspect: "Suivi avec les régies",
    logisorama: "On relance, on clarifie et on utilise notre relationnel pour obtenir des réponses quand c'est possible.",
    solo: "Tu envoies ton dossier et tu attends… parfois sans jamais avoir de feedback.",
    icon: MessageSquare,
  },
  {
    aspect: "Temps & charge mentale",
    logisorama: "Tu délègues la chasse à une équipe qui connaît déjà le marché et les interlocuteurs.",
    solo: "Tu passes ton temps à chercher, relancer et stresser, sans savoir si tu t'y prends 'comme il faut'.",
    icon: Brain,
  },
  {
    aspect: "Visibilité sur l'avancement",
    logisorama: "Tu as un mandat clair de 90 jours, un agent référent et un suivi structuré.",
    solo: "Tu avances au feeling, sans cadre ni échéance.",
    icon: Eye,
  },
  {
    aspect: "Garantie",
    logisorama: "Si aucun bail n'est signé en 90 jours, la garantie de remboursement prévue au mandat s'applique.",
    solo: "Aucun filet de sécurité : tout le risque repose sur toi.",
    icon: Shield,
  },
];

export function DifferentiationSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Premium animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/10 rounded-full blur-[150px]" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      
      {/* Radial gradient spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20 animate-fade-in">
          {/* Premium badge */}
          <div className="inline-flex items-center gap-2 relative group mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-blue-500/50 to-violet-500/50 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative backdrop-blur-xl rounded-full px-6 py-3 border border-white/20 bg-white/5 shadow-2xl">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Scale className="h-5 w-5 text-primary" />
                  <div className="absolute inset-0 bg-primary/50 blur-md" />
                </div>
                <span className="text-sm font-bold bg-gradient-to-r from-primary via-blue-400 to-violet-400 bg-clip-text text-transparent uppercase tracking-wider">
                  Analyse comparative
                </span>
                <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
              </div>
            </div>
          </div>
          
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
            Avec Logisorama, tu ne te présentes
            <br />
            <span className="relative">
              <span className="bg-gradient-to-r from-primary via-blue-400 to-violet-400 bg-clip-text text-transparent">
                pas seul face aux régies
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" preserveAspectRatio="none">
                <path d="M0,5 Q50,0 100,5 T200,5" stroke="url(#gradient)" strokeWidth="3" fill="none" className="animate-pulse" />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="50%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h2>
          
          <p className="text-lg md:text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
            Chercher un appart en Suisse romande peut se faire de deux façons : avec une équipe qui connaît 
            <span className="text-white font-semibold"> le terrain, les régies et les propriétaires</span>… 
            ou en solo, au milieu de centaines de candidatures anonymes.
          </p>
        </div>

        {/* Premium comparison table */}
        <div className="max-w-5xl mx-auto">
          {/* Desktop table */}
          <div className="hidden md:block">
            {/* Headers */}
            <div className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-6 mb-8">
              <div className="p-4" />
              
              {/* Immo-rama header - Premium style */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-blue-500 to-violet-500 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative backdrop-blur-xl rounded-2xl p-6 bg-gradient-to-br from-primary/20 via-blue-500/10 to-violet-500/10 border border-white/20 shadow-2xl">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-black text-white">Avec Immo-rama.ch</h3>
                  </div>
                  <p className="text-sm text-slate-300 text-center font-medium">Mandat de recherche locative</p>
                  <div className="mt-3 flex justify-center">
                    <span className="px-4 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30">
                      RECOMMANDÉ
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Solo header - Muted style */}
              <div className="relative backdrop-blur-xl rounded-2xl p-6 bg-white/5 border border-white/10">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-white/5">
                    <X className="h-6 w-6 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-400">Toi, seul</h3>
                </div>
                <p className="text-sm text-slate-500 text-center">Recherche autonome - Sans accompagnement</p>
              </div>
            </div>

            {/* Comparison rows */}
            <div className="space-y-4">
              {comparisonData.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-6 animate-fade-in group"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {/* Aspect label */}
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/10 border border-white/10 backdrop-blur-sm group-hover:border-primary/30 transition-all">
                        <row.icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <span className="font-bold text-white group-hover:text-primary transition-colors">{row.aspect}</span>
                  </div>
                  
                  {/* Logisorama value - Premium */}
                  <div className="relative group/card">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-xl opacity-0 group-hover/card:opacity-100 blur transition-opacity" />
                    <div className="relative h-full backdrop-blur-xl rounded-xl p-5 bg-gradient-to-br from-primary/10 to-blue-500/5 border border-primary/20 group-hover/card:border-primary/40 transition-all shadow-lg shadow-primary/5">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm text-slate-200 leading-relaxed">{row.logisorama}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Solo value - Muted */}
                  <div className="relative backdrop-blur-xl rounded-xl p-5 bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 p-1.5 rounded-full bg-red-500/20 border border-red-500/30">
                        <X className="h-4 w-4 text-red-400" />
                      </div>
                      <span className="text-sm text-slate-500 leading-relaxed">{row.solo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile cards - Premium */}
          <div className="md:hidden space-y-6">
            {comparisonData.map((row, index) => (
              <div
                key={index}
                className="relative animate-fade-in group"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-blue-500/30 to-violet-500/30 rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                <Card className="relative backdrop-blur-xl bg-slate-900/90 border-white/10 overflow-hidden">
                  <CardHeader className="pb-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/10 border border-white/10">
                        <row.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg text-white">{row.aspect}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Premium option */}
                    <div className="relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-xl blur-sm opacity-30" />
                      <div className="relative flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/15 to-blue-500/10 border border-primary/30">
                        <div className="flex-shrink-0 p-1.5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary mb-1">Avec Immo-rama.ch</p>
                          <p className="text-sm text-slate-200">{row.logisorama}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Solo option */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex-shrink-0 p-1.5 rounded-full bg-red-500/20 border border-red-500/30">
                        <X className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Toi, seul</p>
                        <p className="text-sm text-slate-500">{row.solo}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Premium CTA section */}
        <div className="mt-12 sm:mt-20 md:mt-24 text-center animate-fade-in px-2 sm:px-0" style={{ animationDelay: "700ms" }}>
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
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary/60 animate-pulse" style={{ animationDelay: "0.5s" }} />
              </div>
              
              <div className="relative">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4">
                  Tu vois la différence ?
                </h3>
                <p className="text-sm sm:text-base md:text-lg text-slate-300 mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed">
                  Avec Immo-rama.ch, tu as une équipe entière qui se bat pour ton dossier et qui connaît déjà le marché.
                </p>
                
                <Link to="/nouveau-mandat">
                  <Button 
                    size="lg" 
                    className="relative group/btn font-bold text-sm sm:text-base md:text-lg px-6 sm:px-10 py-5 sm:py-7 bg-gradient-to-r from-primary via-blue-500 to-violet-500 hover:from-primary/90 hover:via-blue-500/90 hover:to-violet-500/90 border-0 shadow-2xl shadow-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-primary/50 w-full sm:w-auto"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Activer ma recherche
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </Link>
                
                <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-slate-400">
                  90 jours de recherche garantie ou remboursé
                </p>
              </div>
            </div>
          </div>
          
          {/* Credibility note */}
          <p className="mt-6 sm:mt-8 text-xs sm:text-sm text-slate-500 px-4">
            * Basé sur plus de 500 mandats traités en Suisse romande depuis 2020
          </p>
        </div>
      </div>
    </section>
  );
}
