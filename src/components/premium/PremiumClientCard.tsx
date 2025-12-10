import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Mail, Phone, MapPin, Calendar, Users, DollarSign, AlertTriangle, 
  Edit, Shield, CheckCircle, FileWarning, Bell, ChevronRight, Sparkles
} from 'lucide-react';
import { ClientTypeBadge } from '@/components/ClientTypeBadge';
import { cn } from '@/lib/utils';

interface ClientData {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  nationalite: string;
  typePermis: string;
  typeRecherche: string;
  typeBien: string;
  nombrePiecesSouhaite: string;
  regions: string[];
  dateInscription: string;
  totalRevenus: number;
  budgetMax: number;
  budgetPossible: number;
  apportPersonnel?: number;
  isSolvable: boolean;
  clientHasStableStatus: boolean;
  solvabilitySource: 'client' | 'garant' | 'combined';
  solvabilityIssues: string[];
  candidatesCount: number;
  garantsCount: number;
  colocatairesCount: number;
  coDebiteursCount: number;
  signatairesCount: number;
  unstableCandidatesCount: number;
  unstableGarants: any[];
  garant: { nom: string; prenom: string; revenus: number; permis?: string } | null;
}

interface PremiumClientCardProps {
  client: ClientData;
  index: number;
  daysElapsed: number;
  hasReminders: number;
  onEdit: (id: string) => void;
  onClick: (id: string) => void;
}

const formatTimeElapsed = (days: number) => {
  const displayDays = Math.floor(days);
  const remainingHours = Math.floor((days - displayDays) * 24);
  return `${displayDays}j ${remainingHours}h`;
};

const getProgressColor = (days: number) => {
  if (days < 60) return 'from-emerald-500 to-green-400';
  if (days < 90) return 'from-amber-500 to-orange-400';
  return 'from-red-500 to-rose-400';
};

const getStatusGlow = (days: number) => {
  if (days < 60) return 'shadow-emerald-500/20';
  if (days < 90) return 'shadow-amber-500/20';
  return 'shadow-red-500/20';
};

export function PremiumClientCard({ 
  client, 
  index, 
  daysElapsed, 
  hasReminders,
  onEdit, 
  onClick 
}: PremiumClientCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isAcheteur = client.typeRecherche === 'Acheter';
  const progressPercent = Math.min((daysElapsed / 90) * 100, 100);
  const isCritical = daysElapsed >= 60;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), Math.min(index * 50, 300));
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-card via-card/95 to-card/90",
        "border border-border/50 hover:border-primary/40",
        "cursor-pointer transition-all duration-500",
        "hover:shadow-2xl hover:-translate-y-2",
        getStatusGlow(daysElapsed),
        !client.isSolvable && "border-destructive/30 hover:border-destructive/50",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: `${Math.min(index * 30, 200)}ms` }}
      onClick={() => onClick(client.id)}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 4) * 20}%`,
              backgroundColor: client.isSolvable 
                ? 'hsl(142 76% 36% / 0.3)' 
                : 'hsl(0 84% 60% / 0.3)',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Top glow effect */}
      <div className={cn(
        "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl transition-opacity duration-500",
        client.isSolvable ? "bg-emerald-500/10" : "bg-red-500/10",
        "opacity-0 group-hover:opacity-100"
      )} />

      <div className="relative p-5 flex flex-col h-full">
        {/* Header with actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-2 flex-wrap">
            {client.isSolvable ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Solvable
                {client.solvabilitySource === 'garant' && ' (garant)'}
              </Badge>
            ) : (
              <Badge className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Non solvable
              </Badge>
            )}
            {hasReminders > 0 && (
              <Badge className="bg-primary/10 text-primary border border-primary/30 animate-pulse">
                <Bell className="h-3 w-3 mr-1" />
                {hasReminders}
              </Badge>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(client.id);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        {/* Client info */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {client.prenom} {client.nom}
            </h3>
            <ClientTypeBadge typeRecherche={client.typeRecherche} size="sm" />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4" />
            <span>{client.nationalite || 'Non renseigné'}</span>
          </div>

          {/* Permit status */}
          <div className="flex items-center gap-2">
            {client.clientHasStableStatus ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Permis {client.typePermis || 'stable'}
              </Badge>
            ) : (
              <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs">
                <FileWarning className="h-3 w-3 mr-1" />
                Permis {client.typePermis || 'non stable'}
              </Badge>
            )}
          </div>
        </div>

        {/* Solvability issues */}
        {!client.isSolvable && client.solvabilityIssues?.length > 0 && (
          <div className="mb-3 p-3 bg-red-500/5 rounded-xl border border-red-500/20">
            <p className="text-xs font-medium text-red-400 mb-2">Problèmes détectés:</p>
            <div className="flex flex-wrap gap-1">
              {client.solvabilityIssues.map((issue, idx) => (
                <Badge key={idx} variant="outline" className="text-xs border-red-500/30 text-red-400 bg-red-500/10">
                  {issue}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Candidates badges */}
        {client.candidatesCount > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {client.garantsCount > 0 && (
              <Badge variant="outline" className="text-xs bg-background/50">
                🛡️ {client.garantsCount} garant{client.garantsCount > 1 ? 's' : ''}
              </Badge>
            )}
            {client.colocatairesCount > 0 && (
              <Badge variant="outline" className="text-xs bg-background/50">
                👥 {client.colocatairesCount} coloc
              </Badge>
            )}
            {client.coDebiteursCount > 0 && (
              <Badge variant="outline" className="text-xs bg-background/50">
                🤝 {client.coDebiteursCount} co-déb
              </Badge>
            )}
            {client.unstableCandidatesCount > 0 && (
              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                ⚠️ {client.unstableCandidatesCount} non comptab.
              </Badge>
            )}
          </div>
        )}

        {/* Finances section */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenu total</p>
                <p className="font-semibold">CHF {client.totalRevenus?.toLocaleString('fr-CH') || 0}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{isAcheteur ? 'Prix' : 'Budget'}</p>
              <p className={cn(
                "font-bold",
                client.budgetPossible >= (client.budgetMax || 0) ? "text-emerald-400" : "text-primary"
              )}>
                CHF {client.budgetMax?.toLocaleString('fr-CH') || 0}
              </p>
            </div>
          </div>

          {client.garant && (
            <div className="flex items-center gap-2 p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
              <Shield className="h-4 w-4 text-emerald-400" />
              <div className="flex-1">
                <p className="text-xs text-emerald-400 font-medium">
                  Garant: {client.garant.prenom} {client.garant.nom}
                </p>
                <p className="text-xs text-muted-foreground">
                  CHF {Number(client.garant.revenus)?.toLocaleString('fr-CH') || 0}/mois
                </p>
              </div>
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="space-y-1 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{client.telephone || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{client.email || '-'}</span>
          </div>
        </div>

        {/* Search criteria */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Recherche</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs bg-primary/5 border border-primary/20">
              {client.typeBien || 'Location'}, {client.nombrePiecesSouhaite || '?'} pièces
            </Badge>
            {client.regions?.length > 0 && (
              <Badge variant="outline" className="text-xs">
                📍 {client.regions.join(', ')}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress section */}
        <div className="mt-auto pt-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {new Date(client.dateInscription).toLocaleDateString('fr-CH')}
              </span>
            </div>
            <Badge className={cn(
              "text-xs border-0",
              daysElapsed < 60 && "bg-emerald-500/10 text-emerald-400",
              daysElapsed >= 60 && daysElapsed < 90 && "bg-amber-500/10 text-amber-400",
              daysElapsed >= 90 && "bg-red-500/10 text-red-400"
            )}>
              {formatTimeElapsed(daysElapsed)}
            </Badge>
          </div>
          
          {/* Progress bar */}
          <div className="relative w-full h-2 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "absolute h-full rounded-full bg-gradient-to-r transition-all duration-1000",
                getProgressColor(daysElapsed)
              )}
              style={{ width: `${progressPercent}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>

          {isCritical && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-red-500/5 rounded-lg border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-xs text-red-400 font-medium">
                Attention - {Math.floor(daysElapsed)} jours
              </span>
            </div>
          )}
        </div>

        {/* Hover indicator */}
        <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1">
          <div className="p-2 rounded-full bg-primary/10 border border-primary/30">
            <ChevronRight className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
    </div>
  );
}
