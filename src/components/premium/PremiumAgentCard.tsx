import { User, Mail, Phone, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Agent {
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
}

interface PremiumAgentCardProps {
  agent: Agent;
  onMessage?: () => void;
  onCall?: () => void;
  className?: string;
}

export function PremiumAgentCard({
  agent,
  onMessage,
  onCall,
  className
}: PremiumAgentCardProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl',
      'bg-gradient-to-br from-card/90 via-card/80 to-card/70',
      'backdrop-blur-xl border border-border/50',
      'p-6 shadow-lg',
      'group hover:shadow-xl transition-all duration-500',
      className
    )}>
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-[-1px] rounded-2xl bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 animate-gradient-x" />
        <div className="absolute inset-[1px] rounded-2xl bg-card" />
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary/20 animate-float"
            style={{
              left: `${15 + i * 18}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${3.5 + i * 0.5}s`
            }}
          />
        ))}
      </div>
      
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      
      <div className="relative z-10">
        <div className="flex items-start gap-5">
          {/* Avatar with animated ring */}
          <div className="relative flex-shrink-0">
            <div className="relative">
              {/* Animated gradient ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-accent to-primary animate-spin-slow opacity-50 blur-sm" 
                   style={{ 
                     width: 'calc(100% + 8px)', 
                     height: 'calc(100% + 8px)',
                     top: '-4px',
                     left: '-4px'
                   }} 
              />
              
              {/* Avatar background */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-background shadow-lg">
                <User className="w-8 h-8 text-primary" />
              </div>
              
              {/* Status dot */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
          </div>
          
          {/* Agent info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">
                {agent.prenom} {agent.nom}
              </h3>
              <Badge 
                variant="secondary" 
                className="bg-green-500/20 text-green-700 dark:text-green-300 flex-shrink-0 animate-pulse-soft"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Agent assigné
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">Votre conseiller immobilier dédié</p>
            
            {/* Contact info */}
            <div className="space-y-2">
              <a 
                href={`mailto:${agent.email}`}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group/link"
              >
                <div className="p-1.5 bg-primary/10 rounded-md group-hover/link:scale-110 transition-transform">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-primary hover:underline truncate">{agent.email}</span>
              </a>
              
              {agent.telephone && (
                <a 
                  href={`tel:${agent.telephone}`}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group/link"
                >
                  <div className="p-1.5 bg-primary/10 rounded-md group-hover/link:scale-110 transition-transform">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-primary hover:underline">{agent.telephone}</span>
                </a>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
              {onMessage && (
                <Button 
                  onClick={onMessage}
                  className="group/btn relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                  <MessageSquare className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                  Messagerie
                </Button>
              )}
              
              {onCall && agent.telephone && (
                <Button 
                  variant="outline"
                  onClick={onCall}
                  className="group/btn"
                >
                  <Phone className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                  Appeler
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
