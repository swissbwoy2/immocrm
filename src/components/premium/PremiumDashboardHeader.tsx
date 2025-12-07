import { LucideIcon, Sparkles, Bell, Send, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FloatingParticles } from '@/components/messaging/FloatingParticles';

interface PremiumDashboardHeaderProps {
  userName?: string;
  isAcheteur?: boolean;
  messageCount?: number;
  offerCount?: number;
  onMessagesClick?: () => void;
  onOffersClick?: () => void;
  className?: string;
}

export function PremiumDashboardHeader({ 
  userName,
  isAcheteur = false,
  messageCount = 0,
  offerCount = 0,
  onMessagesClick,
  onOffersClick,
  className 
}: PremiumDashboardHeaderProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl',
      'bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10',
      'p-6 md:p-8 mb-8 animate-fade-in',
      className
    )}>
      {/* Floating particles */}
      <FloatingParticles count={8} className="opacity-30" />
      
      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-4 right-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-3xl animate-float" 
          style={{ animationDelay: '0s' }} 
        />
        <div 
          className="absolute bottom-4 left-20 w-24 h-24 bg-gradient-to-br from-accent/20 to-primary/10 rounded-full blur-2xl animate-float" 
          style={{ animationDelay: '1s' }} 
        />
        <div 
          className="absolute top-1/2 right-1/4 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-float" 
          style={{ animationDelay: '2s' }} 
        />
      </div>
      
      <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          {/* Badge & Icon */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg shadow-primary/10">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse-soft" />
            </div>
            <Badge 
              variant="outline" 
              className="px-3 py-1 text-xs sm:text-sm font-medium text-primary/80 uppercase tracking-wider border-primary/30 bg-primary/5"
            >
              {isAcheteur ? (
                <>
                  <Home className="w-3 h-3 mr-1.5" />
                  Projet d'achat
                </>
              ) : (
                'Recherche de logement'
              )}
            </Badge>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Bonjour{userName ? `, ${userName}` : ''} 👋
          </h1>
          
          {/* Subtitle */}
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl">
            {isAcheteur 
              ? "Suivez l'avancement de votre projet d'achat immobilier" 
              : "Suivez l'avancement de votre recherche de logement"}
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {messageCount > 0 && (
            <Button 
              variant="outline" 
              onClick={onMessagesClick}
              className="relative glass-morphism border-primary/20 hover:border-primary/40 hover:scale-105 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group"
            >
              <Bell className="w-4 h-4 mr-2 group-hover:animate-wiggle" />
              Messages
              <Badge 
                variant="destructive" 
                className="ml-2 animate-bounce-soft shadow-lg shadow-destructive/30"
              >
                {messageCount}
              </Badge>
            </Button>
          )}
          {offerCount > 0 && (
            <Button 
              variant="outline" 
              onClick={onOffersClick}
              className="relative glass-morphism border-primary/20 hover:border-primary/40 hover:scale-105 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group"
            >
              <Send className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
              Offres
              <Badge 
                variant="destructive" 
                className="ml-2 animate-bounce-soft shadow-lg shadow-destructive/30"
              >
                {offerCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>
      
      {/* Bottom shine effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </div>
  );
}
