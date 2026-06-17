import { ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2 } from 'lucide-react';

interface LandingSelectProps {
  label: string;
  icon?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
}

export function LandingSelect({ label, icon, value, onValueChange, options, placeholder = 'Sélectionnez', error, required, optional }: LandingSelectProps) {
  return (
    <div className="relative group space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon && <span className="text-primary">{icon}</span>}
        {label}
        {required && <span className="text-destructive">*</span>}
        {optional && <span className="text-muted-foreground text-[10px]">(optionnel)</span>}
        {value && !error && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={`bg-background text-foreground transition-all duration-300 focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 ${
          error ? 'border-destructive/60' : 'border-border'
        }`}>
          <SelectValue placeholder={<span className="text-muted-foreground">{placeholder}</span>} />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border max-h-[240px]">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="text-foreground focus:bg-primary/10 focus:text-primary cursor-pointer"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-[11px] text-destructive pl-1">{error}</p>}
    </div>
  );
}
