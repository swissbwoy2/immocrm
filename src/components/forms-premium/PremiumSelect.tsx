import { ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface PremiumSelectProps {
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

export function PremiumSelect({ label, icon, value, onValueChange, options, placeholder = 'Sélectionnez', error, required, optional }: PremiumSelectProps) {
  return (
    <div className="relative group space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-[hsl(40_20%_60%)]">
        {icon && <span className="text-[hsl(38_45%_48%)]">{icon}</span>}
        {label}
        {required && <span className="text-red-400">*</span>}
        {optional && <span className="text-[hsl(40_20%_38%)] text-[10px]">(optionnel)</span>}
        {value && !error && <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(38_45%_48%)] ml-auto" />}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={`bg-[hsl(30_15%_9%/0.6)] border transition-all duration-300 text-[hsl(40_20%_75%)] focus:ring-2 focus:ring-[hsl(38_45%_48%/0.25)] focus:border-[hsl(38_55%_65%/0.7)] hover:border-[hsl(38_45%_48%/0.4)] ${
          error
            ? 'border-red-500/60'
            : value
            ? 'border-[hsl(38_45%_48%/0.4)]'
            : 'border-[hsl(38_45%_48%/0.2)]'
        }`}>
          <SelectValue placeholder={<span className="text-[hsl(40_20%_38%)]">{placeholder}</span>} />
        </SelectTrigger>
        <SelectContent className="bg-[hsl(30_15%_10%)] border-[hsl(38_45%_48%/0.2)] backdrop-blur-xl max-h-[240px]">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="text-[hsl(40_20%_75%)] focus:bg-[hsl(38_45%_48%/0.15)] focus:text-[hsl(38_55%_65%)] cursor-pointer"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-[11px] text-red-400 pl-1">{error}</p>}
    </div>
  );
}
