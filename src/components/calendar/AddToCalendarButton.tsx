import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadICSFile, sendCalendarInvite, type ICSEventData } from '@/utils/generateICS';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddToCalendarButtonProps {
  event: ICSEventData;
  recipientEmail?: string;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'outline' | 'ghost' | 'default';
  className?: string;
  showLabel?: boolean;
}

export function AddToCalendarButton({
  event,
  recipientEmail,
  size = 'sm',
  variant = 'outline',
  className,
  showLabel = true,
}: AddToCalendarButtonProps) {
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Download .ics file
    downloadICSFile(event);
    toast.success('Fichier calendrier téléchargé');

    // Also send email invite if we have an email
    if (recipientEmail) {
      sendCalendarInvite(event, recipientEmail, (name, opts) =>
        supabase.functions.invoke(name, opts)
      );
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn('gap-1.5', className)}
      title="Ajouter au calendrier (iPhone, Google, Outlook...)"
    >
      <CalendarPlus className="h-4 w-4" />
      {showLabel && <span>Calendrier</span>}
    </Button>
  );
}
