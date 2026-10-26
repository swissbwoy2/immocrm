import React from 'react';
import { formatSwissRelativeDate } from '@/lib/dateUtils';

interface DateSeparatorProps {
  date: string;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex justify-center my-3 px-4" role="separator" aria-label={formatSwissRelativeDate(date)}>
      <span className="text-[11px] font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-muted capitalize">
        {formatSwissRelativeDate(date)}
      </span>
    </div>
  );
};

export default DateSeparator;
