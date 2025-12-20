import { Building2, MessageSquare, Wrench, TrendingUp, Calendar, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PremiumProprietaireDashboardHeaderProps {
  userName?: string;
  immeubleCount?: number;
  ticketCount?: number;
  messageCount?: number;
  onMessagesClick?: () => void;
  onTicketsClick?: () => void;
  onCalendarClick?: () => void;
  className?: string;
}

export function PremiumProprietaireDashboardHeader({
  userName,
  immeubleCount = 0,
  ticketCount = 0,
  messageCount = 0,
  onMessagesClick,
  onTicketsClick,
  onCalendarClick,
  className
}: PremiumProprietaireDashboardHeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return "Bon après-midi";
    return 'Bonsoir';
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 md:p-8 mb-6",
      "bg-gradient-to-br from-primary/10 via-primary/5 to-background",
      "border border-primary/20",
      className
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        {/* Greeting */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {getGreeting()}{userName ? `, ${userName}` : ''} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Voici un aperçu de votre patrimoine immobilier
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/50 shadow-sm">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="font-semibold">{immeubleCount}</span>
              <span className="text-sm text-muted-foreground">biens</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mt-6">
          {onMessagesClick && (
            <Button 
              variant="outline" 
              className="bg-card hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={onMessagesClick}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
              {messageCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                  {messageCount}
                </Badge>
              )}
            </Button>
          )}
          
          {onTicketsClick && (
            <Button 
              variant="outline"
              className="bg-card hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={onTicketsClick}
            >
              <Wrench className="w-4 h-4 mr-2" />
              Tickets
              {ticketCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {ticketCount}
                </Badge>
              )}
            </Button>
          )}
          
          {onCalendarClick && (
            <Button 
              variant="outline"
              className="bg-card hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={onCalendarClick}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendrier
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
