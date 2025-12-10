import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, MapPin, Home, User, ArrowRight, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Candidature {
  id: string;
  statut: string;
  offres?: {
    adresse: string;
    pieces?: number;
    prix?: number;
  };
  client_id: string;
}

interface PremiumCandidaturesTraitementSectionProps {
  candidatures: Candidature[];
  getClientName: (clientId: string) => string;
}

const getStatusInfo = (statut: string) => {
  switch (statut) {
    case 'bail_conclu': 
      return { 
        label: 'Client prêt à conclure', 
        emoji: '🎉',
        bgGradient: 'from-green-500/20 to-emerald-500/20',
        borderColor: 'border-green-500/50',
        glowColor: 'shadow-green-500/20',
        badgeBg: 'bg-green-500',
        textColor: 'text-green-400',
        ringColor: 'ring-green-500/30'
      };
    case 'attente_bail': 
      return { 
        label: 'En attente du bail', 
        emoji: '📄',
        bgGradient: 'from-amber-500/20 to-orange-500/20',
        borderColor: 'border-amber-500/50',
        glowColor: 'shadow-amber-500/20',
        badgeBg: 'bg-amber-500',
        textColor: 'text-amber-400',
        ringColor: 'ring-amber-500/30'
      };
    case 'bail_recu': 
      return { 
        label: 'Bail reçu', 
        emoji: '✅',
        bgGradient: 'from-blue-500/20 to-cyan-500/20',
        borderColor: 'border-blue-500/50',
        glowColor: 'shadow-blue-500/20',
        badgeBg: 'bg-blue-500',
        textColor: 'text-blue-400',
        ringColor: 'ring-blue-500/30'
      };
    case 'signature_planifiee': 
      return { 
        label: 'Signature planifiée', 
        emoji: '📝',
        bgGradient: 'from-purple-500/20 to-violet-500/20',
        borderColor: 'border-purple-500/50',
        glowColor: 'shadow-purple-500/20',
        badgeBg: 'bg-purple-500',
        textColor: 'text-purple-400',
        ringColor: 'ring-purple-500/30'
      };
    case 'signature_effectuee': 
      return { 
        label: 'Signature effectuée', 
        emoji: '🖊️',
        bgGradient: 'from-emerald-500/20 to-teal-500/20',
        borderColor: 'border-emerald-500/50',
        glowColor: 'shadow-emerald-500/20',
        badgeBg: 'bg-emerald-500',
        textColor: 'text-emerald-400',
        ringColor: 'ring-emerald-500/30'
      };
    case 'etat_lieux_fixe': 
      return { 
        label: 'État des lieux fixé', 
        emoji: '🏠',
        bgGradient: 'from-cyan-500/20 to-sky-500/20',
        borderColor: 'border-cyan-500/50',
        glowColor: 'shadow-cyan-500/20',
        badgeBg: 'bg-cyan-500',
        textColor: 'text-cyan-400',
        ringColor: 'ring-cyan-500/30'
      };
    default: 
      return { 
        label: 'En cours', 
        emoji: '⏳',
        bgGradient: 'from-gray-500/20 to-slate-500/20',
        borderColor: 'border-gray-500/50',
        glowColor: 'shadow-gray-500/20',
        badgeBg: 'bg-gray-500',
        textColor: 'text-gray-400',
        ringColor: 'ring-gray-500/30'
      };
  }
};

export function PremiumCandidaturesTraitementSection({ 
  candidatures, 
  getClientName 
}: PremiumCandidaturesTraitementSectionProps) {
  const navigate = useNavigate();

  if (candidatures.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-background/80 via-background/60 to-primary/5 backdrop-blur-xl shadow-2xl">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Glow effects */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative p-6 pb-4 border-b border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg animate-pulse" />
              <div className="relative p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/30">
                <FileCheck className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                Candidatures en cours
              </h3>
              <p className="text-sm text-muted-foreground">Actions requises</p>
            </div>
          </div>
          
          {/* Counter badge */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/40 rounded-full blur-md animate-pulse" />
            <Badge className="relative bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-lg px-4 py-2 font-bold shadow-lg">
              {candidatures.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative p-4 space-y-3">
        {candidatures.slice(0, 5).map((cand, index) => {
          const statusInfo = getStatusInfo(cand.statut);
          const clientName = getClientName(cand.client_id);
          
          return (
            <div
              key={cand.id}
              className={`
                relative group cursor-pointer overflow-hidden
                rounded-xl border ${statusInfo.borderColor}
                bg-gradient-to-r ${statusInfo.bgGradient}
                backdrop-blur-sm
                transition-all duration-300
                hover:scale-[1.02] hover:shadow-xl ${statusInfo.glowColor}
                animate-fade-in
              `}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate('/agent/candidatures')}
            >
              {/* Shine effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>

              <div className="relative p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Address and status */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <p className="font-semibold text-sm truncate">{cand.offres?.adresse}</p>
                      </div>
                      <Badge className={`${statusInfo.badgeBg} text-white text-xs px-2 py-0.5 shadow-md`}>
                        {statusInfo.emoji} {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Property details */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Home className="w-3.5 h-3.5" />
                        {cand.offres?.pieces} pièces
                      </span>
                      <span className="font-medium text-foreground">
                        {cand.offres?.prix?.toLocaleString()} CHF/mois
                      </span>
                    </div>

                    {/* Client name */}
                    <div className={`flex items-center gap-2 ${statusInfo.textColor} font-bold text-sm`}>
                      <div className={`p-1.5 rounded-full bg-gradient-to-br ${statusInfo.bgGradient} ring-2 ${statusInfo.ringColor}`}>
                        <User className="w-3.5 h-3.5" />
                      </div>
                      {clientName}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className={`
                    p-2 rounded-full 
                    bg-gradient-to-br ${statusInfo.bgGradient}
                    group-hover:scale-110 transition-transform duration-300
                  `}>
                    <ChevronRight className={`w-5 h-5 ${statusInfo.textColor}`} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Action button */}
        <Button 
          className="w-full mt-4 relative overflow-hidden group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
          size="lg"
          onClick={() => navigate('/agent/candidatures')}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <FileCheck className="w-5 h-5 mr-2" />
          <span className="font-semibold">Gérer toutes les candidatures</span>
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
