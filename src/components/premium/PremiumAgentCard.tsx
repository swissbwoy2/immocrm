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
      'imr-lg-card relative overflow-hidden rounded-[22px] p-6 group',
      className
    )}>
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
                className="imr-lg-glass flex items-center gap-2 rounded-full p-2 pr-4 active:scale-[0.98] group/link"
              >
                <div className="p-1.5 bg-primary/10 rounded-full">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-primary hover:underline truncate">{agent.email}</span>
              </a>
              
              {agent.telephone && (
                <a 
                  href={`tel:${agent.telephone}`}
                  className="imr-lg-glass flex items-center gap-2 rounded-full p-2 pr-4 active:scale-[0.98] group/link"
                >
                  <div className="p-1.5 bg-primary/10 rounded-full">
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
