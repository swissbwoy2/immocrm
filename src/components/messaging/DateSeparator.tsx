import React from 'react';
import { formatSwissRelativeDate } from '@/lib/dateUtils';

interface DateSeparatorProps {
  date: string;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-border/40" />
      <span className="text-xs text-muted-foreground font-medium px-3 py-1.5 bg-muted/60 rounded-full capitalize backdrop-blur-sm">
        {formatSwissRelativeDate(date)}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
};

export default DateSeparator;
