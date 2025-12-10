import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactType, contactTypeLabels } from "./contactTypes";

interface ContactTypeSelectProps {
  value: ContactType | 'all';
  onChange: (value: ContactType | 'all') => void;
  showAll?: boolean;
  placeholder?: string;
}

export function ContactTypeSelect({ 
  value, 
  onChange, 
  showAll = false,
  placeholder = "Type de contact"
}: ContactTypeSelectProps) {
  const contactTypes = Object.entries(contactTypeLabels) as [ContactType, string][];

  return (
    <Select value={value} onValueChange={(val) => onChange(val as ContactType | 'all')}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAll && (
          <SelectItem value="all">Tous les types</SelectItem>
        )}
        {contactTypes.map(([type, label]) => (
          <SelectItem key={type} value={type}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
