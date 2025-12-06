import React from 'react';
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DateSeparatorProps {
  date: string;
}

const formatDateLabel = (dateString: string): string => {
  const date = parseISO(dateString);
  
  if (isToday(date)) {
    return "Aujourd'hui";
  }
  
  if (isYesterday(date)) {
    return "Hier";
  }
  
  if (isThisWeek(date)) {
    return format(date, 'EEEE', { locale: fr });
  }
  
  return format(date, 'd MMMM yyyy', { locale: fr });
};

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-border/40" />
      <span className="text-xs text-muted-foreground font-medium px-3 py-1.5 bg-muted/60 rounded-full capitalize backdrop-blur-sm">
        {formatDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
};

export default DateSeparator;
